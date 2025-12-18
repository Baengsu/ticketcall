# 배포 및 자동 리빌드 설정 가이드

## 데이터베이스 설정 (PostgreSQL)

현재 프로젝트는 **PostgreSQL**을 사용합니다.

### Railway PostgreSQL 연결

Railway에서 제공하는 PostgreSQL 연결 문자열:
```
postgresql://postgres:OSwLzvXqVrivGrtMfSyLDkfvKYAwbYiQ@postgres.railway.internal:5432/railway
```

**중요:**
- `postgres.railway.internal`은 Railway **내부 네트워크**용입니다
- **외부에서 접근하려면** Railway 대시보드에서 **Public URL**을 사용해야 합니다
- Public URL 형식: `postgresql://postgres:비밀번호@containers-us-west-xxx.railway.app:5432/railway`

### 환경 변수 설정

`.env` 파일 또는 배포 플랫폼의 환경 변수에 설정:
```env
DATABASE_URL="postgresql://postgres:OSwLzvXqVrivGrtMfSyLDkfvKYAwbYiQ@postgres.railway.internal:5432/railway"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="https://your-app-domain.com"
```

### 마이그레이션 실행

PostgreSQL로 전환 후 마이그레이션을 실행해야 합니다:

```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 마이그레이션 실행 (기존 데이터 유지)
npx prisma migrate deploy

# 또는 개발 환경에서 새로 시작
npx prisma migrate dev
```

## 배포 플랫폼 추천

### 1. Vercel (가장 추천) ⭐⭐⭐

**장점:**
- ✅ Next.js 최적화 (Turbopack 지원)
- ✅ 무료 플랜 제공 (개인 프로젝트용 충분)
- ✅ 자동 배포 (GitHub 연결 시)
- ✅ Cron Jobs 내장 지원 (`vercel.json`에 설정됨)
- ✅ CDN 자동 설정
- ✅ 간단한 설정
- ✅ SSL 자동 인증서

**설정 방법:**

1. **Vercel 계정 생성**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```
   또는 Vercel 웹사이트에서 GitHub 저장소 연결

3. **환경 변수 설정** (Vercel 대시보드 → Settings → Environment Variables)
   - `DATABASE_URL`: Railway PostgreSQL **Public URL** 사용
   - `NEXTAUTH_SECRET`: 랜덤 문자열 생성
     ```bash
     openssl rand -base64 32
     ```
   - `NEXTAUTH_URL`: Vercel 배포 URL (예: `https://your-app.vercel.app`)
   - `REDIS_URL`: (선택사항) Redis 연결 문자열

4. **자동 배포**
   - GitHub에 push하면 자동 배포
   - Preview 배포도 자동 생성

5. **Cron Jobs 확인**
   - Vercel 대시보드 → 프로젝트 → Cron Jobs
   - `vercel.json`에 설정된 스케줄 확인

**비용:** 무료 플랜 (월 100GB 대역폭, 무제한 요청)

---

### 2. Railway ⭐⭐

**장점:**
- ✅ 데이터베이스와 앱을 같은 플랫폼에서 관리
- ✅ 간단한 배포
- ✅ PostgreSQL 내장 제공
- ✅ 무료 크레딧 제공 ($5)

**설정 방법:**

1. Railway 계정 생성 (https://railway.app)
2. 새 프로젝트 생성
3. PostgreSQL 서비스 추가 (이미 있으면 스킵)
4. Next.js 서비스 추가
5. 환경 변수 설정:
   - `DATABASE_URL`: Railway가 자동으로 제공 (내부 네트워크용)
   - `NEXTAUTH_SECRET`: 생성
   - `NEXTAUTH_URL`: Railway 배포 URL

**비용:** 무료 크레딧 후 유료 ($5/월부터)

---

### 3. Render ⭐

**장점:**
- ✅ 무료 플랜 제공
- ✅ PostgreSQL 지원
- ✅ Cron Jobs 지원

**단점:**
- ⚠️ 15분 비활성 시 슬리프 모드 (첫 요청 느림)

**설정 방법:**

1. Render 계정 생성 (https://render.com)
2. PostgreSQL 데이터베이스 생성
3. Web Service 생성 (Next.js)
4. 환경 변수 설정
5. Cron Job 설정 (자동 리빌드용)

**비용:** 무료 플랜 (슬리프 모드 있음)

---

### 4. AWS (프로덕션용)

**장점:**
- ✅ 확장성
- ✅ 안정성
- ✅ 세밀한 제어

**서비스 구성:**
- **Vercel** 또는 **CloudFront + S3 + Lambda@Edge**: 프론트엔드
- **RDS PostgreSQL**: 데이터베이스
- **ElastiCache Redis**: 캐시 (선택사항)
- **EventBridge**: Cron Jobs

**비용:** 사용량 기반 (월 $10-50 정도)

---

## 추천 배포 구성

### 옵션 1: Vercel + Railway PostgreSQL (추천) ⭐

- **프론트엔드/API**: Vercel (무료, 빠름)
- **데이터베이스**: Railway PostgreSQL (이미 설정됨)
- **Redis**: Railway Redis 또는 Upstash (선택사항)

**장점:**
- Vercel의 빠른 CDN과 Next.js 최적화
- Railway의 간단한 데이터베이스 관리
- 비용 효율적

### 옵션 2: Railway 전체

- **모든 서비스**: Railway
- **프론트엔드/API**: Railway Next.js 서비스
- **데이터베이스**: Railway PostgreSQL

**장점:**
- 모든 서비스를 한 곳에서 관리
- 내부 네트워크로 빠른 연결

---

## 필수 환경 변수

모든 배포 플랫폼에서 필요한 환경 변수:

```env
# 데이터베이스 (필수)
DATABASE_URL="postgresql://postgres:비밀번호@호스트:5432/데이터베이스명"

# NextAuth (필수)
NEXTAUTH_SECRET="최소-32자-랜덤-문자열"
NEXTAUTH_URL="https://your-app-domain.com"

# 선택사항
CRON_SECRET="cron-요청-인증용-비밀키"
REDIS_URL="redis://호스트:포트"  # 온라인 카운터용
```

---

## 마이그레이션 가이드 (MySQL → PostgreSQL)

기존 MySQL 데이터베이스에서 PostgreSQL로 마이그레이션:

1. **데이터 백업**
   ```bash
   # MySQL 데이터 덤프
   mysqldump -u 사용자 -p 데이터베이스명 > backup.sql
   ```

2. **PostgreSQL 스키마 생성**
   ```bash
   npx prisma migrate dev --name init_postgresql
   ```

3. **데이터 마이그레이션** (필요시)
   - MySQL 데이터를 PostgreSQL 형식으로 변환
   - 또는 Prisma Migrate로 스키마만 생성하고 새로 시작

---

## 로컬 개발 환경 설정

```bash
# 1. 환경 변수 설정 (.env 파일)
DATABASE_URL="postgresql://postgres:비밀번호@localhost:5432/railway"
NEXTAUTH_SECRET="local-dev-secret"
NEXTAUTH_URL="http://localhost:3000"

# 2. Prisma 클라이언트 생성
npx prisma generate

# 3. 마이그레이션 실행
npx prisma migrate dev

# 4. 개발 서버 실행
npm run dev
```

---

## 확인 방법

1. **관리자 페이지**: 리빌드 로그에서 `userEmail: "system-cron"` 확인
2. **홈페이지**: 마지막 리빌드 시간 확인
3. **배포 플랫폼 대시보드**: Cron 실행 이력 확인
