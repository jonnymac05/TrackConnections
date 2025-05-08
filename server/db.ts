import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

// Use the TrackConnections Neon database connection string as the default and only option
const connectionString = process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING;

if (!connectionString) {
  throw new Error(
    "TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING environment variable not set. Please provide a valid connection string for the TrackConnections database.",
  );
}

console.log("Using TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING for database connection");
export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });