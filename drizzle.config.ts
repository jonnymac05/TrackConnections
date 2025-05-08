import { defineConfig } from "drizzle-kit";

if (!process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING,
  },
});
