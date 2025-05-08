# Track Connections

A mobile-first professional networking application designed to streamline contact management and networking interactions at conferences and events.

## Features

- Track and manage professional connections
- Log interactions with contacts
- Tag and categorize connections
- Search functionality
- Favorite contacts for quick access
- Media attachment support (AWS S3)
- Mobile-first responsive design
- Authentication system with user roles

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Storage**: AWS S3 (for media uploads)

## Prerequisites

- Node.js (v18.x or higher)
- PostgreSQL (v13 or higher)
- AWS account (for S3 media storage)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/track-connections.git
cd track-connections
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit the `.env` file with your specific configuration:

```
# Database Configuration
TRACKCONNECTIONS_NEON_DB_CONNECTIONSTRING=postgresql://postgres:password@localhost:5432/trackconnections
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=trackconnections

# Session Configuration
SESSION_SECRET=your_session_secret_here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your_bucket_name
```

### 4. Database Setup

Create a PostgreSQL database:

```bash
# For Linux/macOS
createdb trackconnections

# For Windows (using psql)
psql -U postgres
CREATE DATABASE trackconnections;
\q
```

Push the schema to your database:

```bash
npm run db:push
```

### 5. Start the development server

```bash
npm run dev
```

The application will be available at http://localhost:5000

## Windows-Specific Instructions

For Windows users, ensure you have the correct cross-platform environment variables by modifying the `package.json` scripts:

```json
"scripts": {
  "dev": "cross-env NODE_ENV=development tsx server/index.ts",
  "debug": "nodemon --inspect-brk --exec \"npx tsx\" server/index.ts",
  "start": "cross-env NODE_ENV=production node dist/index.js"
}
```

If you're experiencing any issues with PostgreSQL on Windows:

1. Make sure PostgreSQL service is running
2. Verify your path to PostgreSQL binaries is in your PATH environment variable
3. Use PgAdmin or another GUI tool if you're having trouble with the command line

## Debugging

To run the application in debug mode:

```bash
npm run debug
```

This will start the application with the Node.js inspector, allowing you to attach a debugger (e.g., via Chrome DevTools or VS Code).

## Production Build

```bash
npm run build
npm start
```

## AWS S3 Configuration

For media uploads to work properly:

1. Create an S3 bucket in your AWS account
2. Configure CORS for your S3 bucket to allow uploads from your domain
3. Create an IAM user with the necessary S3 permissions
4. Add your AWS credentials to the `.env` file

## Project Structure

- `client/src`: Frontend React application
  - `components`: UI components
  - `pages`: Application pages
  - `hooks`: Custom React hooks
  - `lib`: Utility functions
- `server`: Backend Express server
  - `routes.ts`: API endpoints
  - `auth.ts`: Authentication logic
  - `storage.ts`: Data access layer
  - `db.ts`: Database connection
- `shared`: Shared code between frontend and backend
  - `schema.ts`: Database schema definitions

## License

This project is licensed under the MIT License - see the LICENSE file for details.