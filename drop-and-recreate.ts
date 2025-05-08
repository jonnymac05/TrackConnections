import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = ws;

async function dropAndRecreateAllTables() {
  console.log('Connecting to database using TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING...');
  
  // Use the TrackConnections Neon database connection string
  const connectionString = process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING;
  
  if (!connectionString) {
    console.error('TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING environment variable not set');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Dropping all tables...');
    
    // Drop tables in correct order due to foreign key constraints
    // First drop tables with foreign keys referring to other tables
    await pool.query('DROP TABLE IF EXISTS log_entries_tags CASCADE');
    console.log('- Dropped log_entries_tags table');
    
    await pool.query('DROP TABLE IF EXISTS media CASCADE');
    console.log('- Dropped media table');
    
    await pool.query('DROP TABLE IF EXISTS log_entries CASCADE');
    console.log('- Dropped log_entries table');
    
    await pool.query('DROP TABLE IF EXISTS tags CASCADE');
    console.log('- Dropped tags table');
    
    await pool.query('DROP TABLE IF EXISTS contacts CASCADE');
    console.log('- Dropped contacts table');
    
    await pool.query('DROP TABLE IF EXISTS message_templates CASCADE');
    console.log('- Dropped message_templates table');
    
    await pool.query('DROP TABLE IF EXISTS connect_sessions CASCADE');
    console.log('- Dropped connect_sessions table');
    
    // Finally drop the users table which is referenced by many other tables
    await pool.query('DROP TABLE IF EXISTS connect_users CASCADE');
    console.log('- Dropped connect_users table');
    
    console.log('All tables dropped successfully!');
    
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the function
dropAndRecreateAllTables();