import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use the user's Neon database if the connection string is provided, 
// otherwise fall back to the default Replit database
const connectionString = process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string available. Please provide either TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING or ensure DATABASE_URL is set.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });