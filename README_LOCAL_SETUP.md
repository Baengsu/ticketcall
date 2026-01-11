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
   npm run db:setup
   ```
   또는 단계별로:
   ```bash
   npx prisma generate
   npx prisma db push --accept-data-loss
   npx prisma db seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   
   **💡 Tip:** 스키마 변경 후에는 `npm run dev:clean`을 사용하면 캐시를 자동으로 클리어하고 재시작합니다.

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

## Prisma + Turbopack 워크플로우

### ⚠️ 중요: 스키마 변경 후 필수 단계

Next.js Turbopack과 Prisma를 함께 사용할 때는 다음 순서를 **반드시** 따라야 합니다:

#### 1. 스키마 변경 후

```bash
# 마이그레이션 방식 (권장)
npx prisma migrate dev --name your_migration_name

# 또는 빠른 프로토타이핑용 (데이터 손실 가능)
npx prisma db push --accept-data-loss

# Prisma Client 생성 (필수!)
npx prisma generate
```

**또는 편리한 스크립트 사용:**
```bash
npm run db:setup  # generate + push + seed 한 번에
```

#### 2. 캐시 클리어

```bash
# .next 디렉토리 삭제
npm run clean:next

# 또는 수동으로:
# Windows: rmdir /s /q .next
# Mac/Linux: rm -rf .next
```

#### 3. 개발 서버 완전 재시작

```bash
# 서버 중지 (Ctrl+C)

# 깨끗한 재시작
npm run dev:clean  # 캐시 삭제 + generate + dev 서버 시작

# 또는 단계별로:
npm run clean:next
npm run prisma:generate
npm run dev
```

### 🚨 Prisma 오류 발생 시

**절대 오류를 바로 디버깅하지 마세요!** 다음 순서를 따라주세요:

1. ✅ 개발 서버 중지 (Ctrl+C)
2. ✅ `.next` 디렉토리 삭제 (`npm run clean:next`)
3. ✅ `prisma generate` 실행 (`npm run prisma:generate`)
4. ✅ 개발 서버 재시작 (`npm run dev`)

**그래도 해결되지 않으면:**
- Prisma Studio로 데이터베이스 상태 확인: `npm run prisma:studio`
- 마이그레이션 상태 확인: `npx prisma migrate status`

### 자주 사용하는 명령어

```bash
# Prisma Client 재생성
npm run prisma:generate

# 데이터베이스 스키마 동기화 (빠른 프로토타이핑)
npm run prisma:push

# 마이그레이션 생성 및 적용 (프로덕션 준비)
npm run prisma:migrate

# 데이터베이스 리셋 (주의: 모든 데이터 삭제)
npm run prisma:reset

# Prisma Studio (DB 브라우저)
npm run prisma:studio

# Next.js 캐시 삭제
npm run clean:next

# 깨끗한 개발 서버 시작
npm run dev:clean
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

### Prisma Client 오류 (P1001, P3018 등)
1. **먼저 서버 재시작**: `npm run dev:clean`
2. Prisma Client 재생성: `npm run prisma:generate`
3. 캐시 클리어: `npm run clean:next`
4. 그래도 안 되면 Docker 컨테이너 재시작: `docker-compose restart`

## Production vs Local

- **Local:** Uses `.env.local` with Docker PostgreSQL
- **Production (Railway):** Uses environment variables set in Railway dashboard

The Prisma configuration automatically detects and uses the appropriate database URL.
