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

# Custom temporary drizzle config for push
cat > temp-drizzle.config.ts << EOF
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING || "",
  },
  // Disable strict mode to avoid warnings
  strict: false,
});
EOF

# Run drizzle-kit with the temporary config
npx drizzle-kit push --config=temp-drizzle.config.ts

# Clean up
rm temp-drizzle.config.ts

echo "Database schema pushed successfully"