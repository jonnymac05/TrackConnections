import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from './shared/schema';
import ws from 'ws';

// Configure Neon to use the ws package as WebSocket
neonConfig.webSocketConstructor = ws;

// This script programmatically applies our schema to the database

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('No DATABASE_URL environment variable found');
    process.exit(1);
  }

  console.log('Connecting to database...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Creating or updating tables...');

  try {
    // Apply schema changes directly
    await pool.query(`
      -- Check if user_id column exists in media table
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'user_id'
        ) THEN
          -- Add user_id column to media table
          ALTER TABLE media ADD COLUMN user_id UUID NOT NULL REFERENCES connect_users(id);
        END IF;
      END
      $$;

      -- Check if log_entry_id column exists in media table
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'log_entry_id'
        ) THEN
          -- Add log_entry_id column to media table
          ALTER TABLE media ADD COLUMN log_entry_id UUID REFERENCES log_entries(id);
        END IF;
      END
      $$;

      -- Check if file_key column exists in media table
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'file_key'
        ) THEN
          -- Add file_key column to media table
          ALTER TABLE media ADD COLUMN file_key TEXT NOT NULL DEFAULT '';
        END IF;
      END
      $$;

      -- Check if file_type column exists in media table
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'file_type'
        ) THEN
          -- Add file_type column to media table
          ALTER TABLE media ADD COLUMN file_type TEXT NOT NULL DEFAULT '';
        END IF;
      END
      $$;

      -- Check if file_size column exists in media table
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'file_size'
        ) THEN
          -- Add file_size column to media table
          ALTER TABLE media ADD COLUMN file_size TEXT NOT NULL DEFAULT '0';
        END IF;
      END
      $$;
    `);

    console.log('Database schema updated successfully');
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();