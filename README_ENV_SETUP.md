# 환경 변수 설정 가이드

## 로컬 개발 환경 설정

### 1. .env 파일 구성

`.env` 파일은 다음과 같이 구성되어 있습니다:

```env
# Local development: Docker PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketcall?schema=public"

# Production: Railway PostgreSQL (for reference only, Railway uses its own env vars)
DATABASE_URL_PROD="postgresql://postgres:...@postgres.railway.internal:5432/railway"

# Shadow database for migrations (optional, recommended for local dev)
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketcall_shadow?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Shadow Database 생성 (선택적, 권장)

Shadow database는 Prisma 마이그레이션 시 스키마 변경을 안전하게 테스트하기 위해 사용됩니다.

```bash
# Docker 컨테이너에서 shadow DB 생성
docker exec -it ticketcall-postgres psql -U postgres -c "CREATE DATABASE ticketcall_shadow;"
```

Shadow DB가 없어도 마이그레이션은 작동하지만, 일부 마이그레이션에서는 필요할 수 있습니다.

### 3. Prisma 마이그레이션 실행

```bash
# Prisma Client 생성
npx prisma generate

# 마이그레이션 실행
npx prisma migrate dev --name add_nickname_icons
```

### 4. Railway 배포 시

Railway에서는 자체 환경 변수를 사용하므로:
- `DATABASE_URL`은 Railway가 자동으로 설정합니다
- `DATABASE_URL_PROD`는 로컬 개발용 참고용입니다
- `SHADOW_DATABASE_URL`은 Railway에서도 설정 가능합니다 (선택적)

## 문제 해결

### Prisma가 .env를 로드하지 않는 경우

`prisma.config.ts`가 이미 dotenv를 로드하도록 설정되어 있습니다:
- `.env.local` 우선 로드 (Next.js convention)
- `.env` 폴백 로드
- Production에서는 `process.env` 직접 사용

### DATABASE_URL 불일치 오류

로컬 개발 시:
- `DATABASE_URL`은 로컬 Docker PostgreSQL을 가리켜야 합니다
- Railway URL은 `DATABASE_URL_PROD`로 분리되어 있습니다

Production (Railway):
- Railway가 자동으로 `DATABASE_URL`을 설정합니다
- 로컬 `.env` 파일은 Railway에 영향을 주지 않습니다

