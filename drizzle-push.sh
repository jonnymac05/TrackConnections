#!/bin/bash

# Load .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Ensure TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING is set 
if [ -z "$TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING" ]; then
  echo "Error: TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING is not set"
  exit 1
fi

echo "Using connection string from TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING"

# First make sure the schema is applied cleanly to an empty database
echo "Applying schema to database..."

# We'll use our custom script to run the push operation
cat > push-schema.ts << EOF
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './shared/schema';
import 'dotenv/config';

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

async function pushSchema() {
  // Use the TrackConnections connection string
  const connectionString = process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING;

  if (!connectionString) {
    console.error('Error: TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    // Create the tables directly using the schema definitions
    console.log('Creating tables from schema...');
    
    // Users table first - others reference it
    const createConnectUsersQuery = \`
      CREATE TABLE IF NOT EXISTS connect_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        roles TEXT[] DEFAULT '{}',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createConnectUsersQuery);
    console.log('- Created connect_users table');
    
    // Contacts table
    const createContactsQuery = \`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by UUID NOT NULL REFERENCES connect_users(id),
        name TEXT,
        company TEXT,
        title TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        where_met TEXT,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createContactsQuery);
    console.log('- Created contacts table');
    
    // Log entries table
    const createLogEntriesQuery = \`
      CREATE TABLE IF NOT EXISTS log_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES connect_users(id),
        contact_id UUID REFERENCES contacts(id),
        name TEXT,
        company TEXT,
        title TEXT,
        email TEXT,
        phone TEXT,
        where_met TEXT,
        notes TEXT,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createLogEntriesQuery);
    console.log('- Created log_entries table');
    
    // Tags table
    const createTagsQuery = \`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES connect_users(id),
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createTagsQuery);
    console.log('- Created tags table');
    
    // Junction table for log entries and tags
    const createLogEntriesTagsQuery = \`
      CREATE TABLE IF NOT EXISTS log_entries_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_entry_id UUID NOT NULL REFERENCES log_entries(id),
        tag_id UUID NOT NULL REFERENCES tags(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createLogEntriesTagsQuery);
    console.log('- Created log_entries_tags table');
    
    // Media table
    const createMediaQuery = \`
      CREATE TABLE IF NOT EXISTS media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES connect_users(id),
        log_entry_id UUID REFERENCES log_entries(id),
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_key TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createMediaQuery);
    console.log('- Created media table');
    
    // Message templates table
    const createMessageTemplatesQuery = \`
      CREATE TABLE IF NOT EXISTS message_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES connect_users(id),
        email_template TEXT,
        sms_template TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    \`;
    await pool.query(createMessageTemplatesQuery);
    console.log('- Created message_templates table');
    
    // Sessions table
    const createSessionsQuery = \`
      CREATE TABLE IF NOT EXISTS connect_sessions (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT connect_sessions_pkey PRIMARY KEY (sid)
      );
    \`;
    await pool.query(createSessionsQuery);
    console.log('- Created connect_sessions table');
    
    console.log('All tables created successfully!');
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

pushSchema().catch(console.error);
EOF

# Run the schema push script
npx tsx push-schema.ts

# Clean up
rm push-schema.ts

echo "Database schema pushed successfully"