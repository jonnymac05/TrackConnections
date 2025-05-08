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
    
    // First, print out the tables in the database to ensure we're connected to the right one
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('- Tables in database:');
    tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check if there are any users in the database
    const userCount = await pool.query('SELECT COUNT(*) FROM connect_users');
    console.log(`- Number of users in connect_users table: ${userCount.rows[0].count}`);
    
    // Check if media table exists
    const mediaTableExists = await pool.query(`
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_name = 'media'
    `);
    const tableExists = parseInt(mediaTableExists.rows[0].count) > 0;
    
    if (tableExists) {
      console.log('- Media table exists, checking its structure');
      // Get the current structure of the media table
      const mediaColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'media' 
        ORDER BY ordinal_position
      `);
      
      console.log('- Current media table structure:');
      mediaColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Check if file_size is text or integer
      const fileSizeColumn = mediaColumns.rows.find(col => col.column_name === 'file_size');
      if (fileSizeColumn && fileSizeColumn.data_type === 'text') {
        console.log('- file_size column is text, needs to be changed to integer');
        
        // Drop existing foreign key constraints first
        await pool.query('ALTER TABLE IF EXISTS media DROP CONSTRAINT IF EXISTS media_user_id_fkey');
        await pool.query('ALTER TABLE IF EXISTS media DROP CONSTRAINT IF EXISTS media_log_entry_id_fkey');
        
        // Then recreate the table
        await pool.query('DROP TABLE IF EXISTS media');
        console.log('- Dropped existing media table');
        
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
        console.log('- Recreated media table with correct schema');
      } else {
        console.log('- Media table structure appears correct, no changes needed');
      }
    } else {
      console.log('- No media table found, creating it from scratch');
      
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
    }
    
    // Verify the final table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'media' 
      ORDER BY ordinal_position
    `);
    
    console.log('- Final media table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('Media table update completed successfully!');
  } catch (error) {
    console.error('Error updating media table:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the function
updateMediaTable();