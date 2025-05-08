import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon to use the ws package as WebSocket
neonConfig.webSocketConstructor = ws;

async function updateMediaTable() {
  if (!process.env.DATABASE_URL) {
    console.error('No DATABASE_URL environment variable found');
    process.exit(1);
  }

  console.log('Connecting to database...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Updating media table...');

  try {
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
          ALTER TABLE media ADD COLUMN user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
          -- Update the foreign key separately
          ALTER TABLE media ADD CONSTRAINT media_user_id_fkey FOREIGN KEY (user_id) REFERENCES connect_users(id);
        END IF;
      END
      $$;

      -- Check if filename column exists in media table
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'filename'
        ) THEN
          -- Add filename column to media table
          ALTER TABLE media ADD COLUMN filename TEXT NOT NULL DEFAULT '';
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

      -- Rename 'type' column to 'file_type' if it exists and file_type doesn't exist
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'type'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'file_type'
        ) THEN
          -- Rename type column to file_type
          ALTER TABLE media RENAME COLUMN type TO file_type;
        ELSIF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'media' AND column_name = 'file_type'
        ) THEN
          -- Add file_type column if neither exists
          ALTER TABLE media ADD COLUMN file_type TEXT NOT NULL DEFAULT '';
        END IF;
      END
      $$;
    `);

    console.log('Media table updated successfully');
  } catch (error) {
    console.error('Error updating media table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateMediaTable();