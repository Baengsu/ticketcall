# Local Development Setup

This guide explains how to set up a local PostgreSQL development environment using Docker.

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ and npm 10+

## Quick Start

1. **Start PostgreSQL container:**
   ```bash
   docker-compose up -d
   ```

2. **Verify container is running:**
   ```bash
   docker ps
   ```
   You should see `ticketcall-postgres` container running.

3. **Set up database schema:**
   ```bash
   npx prisma generate
   npx prisma db push --accept-data-loss
   npx prisma db seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

The `.env.local` file is automatically loaded by Next.js and Prisma for local development:

- `DATABASE_URL`: Points to local PostgreSQL (`postgresql://postgres:postgres@localhost:5432/ticketcall`)
- `NEXTAUTH_URL`: `http://localhost:3000`
- `NEXTAUTH_SECRET`: Generated secure secret for local development

**Note:** `.env.local` is ignored by git and should not be committed.

## Docker Services

### PostgreSQL 16
- **Container name:** `ticketcall-postgres`
- **Port:** `5432`
- **Database:** `ticketcall`
- **User:** `postgres`
- **Password:** `postgres`
- **Volume:** `ticketcall-postgres-data` (persistent data storage)

### Managing the Database

**Start:**
```bash
docker-compose up -d
```

**Stop:**
```bash
docker-compose down
```

**Stop and remove data:**
```bash
docker-compose down -v
```

**View logs:**
```bash
docker-compose logs postgres
```

## Troubleshooting

### Docker Desktop not running
If you see "Docker Desktop is unable to start", make sure Docker Desktop is running on your system.

### Port 5432 already in use
If port 5432 is already in use, you can change it in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use 5433 instead of 5432
```
Then update `.env.local`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ticketcall"
```

### Database connection errors
1. Verify Docker container is running: `docker ps`
2. Check container logs: `docker-compose logs postgres`
3. Verify `.env.local` exists and has correct `DATABASE_URL`

## Production vs Local

- **Local:** Uses `.env.local` with Docker PostgreSQL
- **Production (Railway):** Uses environment variables set in Railway dashboard

The Prisma configuration automatically detects and uses the appropriate database URL.
