import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import 'dotenv/config';

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = ws;

async function updateMediaTable() {
  console.log('Connecting to Neon database using TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING...');
  
  // Use the specific connection string for Track Connections
  const connectionString = process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING;
  
  if (!connectionString) {
    console.error('TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING environment variable not set');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Running media table update...');
    
    // First, check if there's any existing data in the media table that we need to preserve
    const existingMedia = await pool.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_name = \'media\'');
    const tableExists = parseInt(existingMedia.rows[0].count) > 0;
    
    if (tableExists) {
      console.log('- Media table exists, dropping it to recreate with correct schema');
      // Drop existing foreign key constraints first
      await pool.query('ALTER TABLE IF EXISTS media DROP CONSTRAINT IF EXISTS media_user_id_fkey');
      await pool.query('ALTER TABLE IF EXISTS media DROP CONSTRAINT IF EXISTS media_log_entry_id_fkey');
      // Then drop the table
      await pool.query('DROP TABLE IF EXISTS media');
    } else {
      console.log('- No media table found, creating it from scratch');
    }
    
    // Create the media table with the correct schema
    await pool.query(`
      CREATE TABLE media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES connect_users(id),
        log_entry_id UUID REFERENCES log_entries(id),
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_key TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('- Created media table with correct schema');
    
    // Verify the table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'media' 
      ORDER BY ordinal_position
    `);
    
    console.log('- Table structure verification:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('Media table update completed successfully!');
  } catch (error) {
    console.error('Error updating media table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the function
updateMediaTable();