import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './shared/schema';
import 'dotenv/config';

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

async function runMigration() {
  // Use the Neon connection string
  const connectionString = process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING;

  if (!connectionString) {
    console.error('Error: TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to Neon database...');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log('Running migration...');
  try {
    // First, create the schema
    const createConnectUsersTable = `
      CREATE TABLE IF NOT EXISTS connect_users (
        id UUID PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        roles TEXT[] NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        company TEXT,
        phone TEXT,
        title TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT
      );
    `;
    
    const createContactsTable = `
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY,
        name TEXT,
        email TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        created_by UUID NOT NULL REFERENCES connect_users(id),
        company TEXT,
        title TEXT,
        phone TEXT,
        notes TEXT,
        is_favorite BOOLEAN DEFAULT FALSE,
        where_met TEXT
      );
    `;
    
    const createLogEntriesTable = `
      CREATE TABLE IF NOT EXISTS log_entries (
        id UUID PRIMARY KEY,
        name TEXT,
        email TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        user_id UUID NOT NULL REFERENCES connect_users(id),
        contact_id UUID REFERENCES contacts(id),
        company TEXT,
        title TEXT,
        phone TEXT,
        where_met TEXT,
        notes TEXT,
        is_favorite BOOLEAN DEFAULT FALSE
      );
    `;
    
    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        user_id UUID NOT NULL REFERENCES connect_users(id),
        color TEXT
      );
    `;
    
    const createLogEntriesTagsTable = `
      CREATE TABLE IF NOT EXISTS log_entries_tags (
        id UUID PRIMARY KEY,
        log_entry_id UUID NOT NULL REFERENCES log_entries(id),
        tag_id UUID NOT NULL REFERENCES tags(id),
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
      );
    `;
    
    const createMediaTable = `
      CREATE TABLE IF NOT EXISTS media (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES connect_users(id),
        log_entry_id UUID REFERENCES log_entries(id),
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_key TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
      );
    `;
    
    const createMessageTemplatesTable = `
      CREATE TABLE IF NOT EXISTS message_templates (
        id UUID PRIMARY KEY,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        user_id UUID NOT NULL REFERENCES connect_users(id),
        email_template TEXT,
        sms_template TEXT
      );
    `;
    
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS connect_sessions (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT connect_sessions_pkey PRIMARY KEY (sid)
      );
    `;
    
    // Execute the CREATE TABLE statements in order
    await pool.query(createConnectUsersTable);
    console.log('- Created connect_users table');
    await pool.query(createContactsTable);
    console.log('- Created contacts table');
    await pool.query(createLogEntriesTable);
    console.log('- Created log_entries table');
    await pool.query(createTagsTable);
    console.log('- Created tags table');
    await pool.query(createLogEntriesTagsTable);
    console.log('- Created log_entries_tags table');
    await pool.query(createMediaTable);
    console.log('- Created media table');
    await pool.query(createMessageTemplatesTable);
    console.log('- Created message_templates table');
    await pool.query(createSessionsTable);
    console.log('- Created connect_sessions table');
    
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);