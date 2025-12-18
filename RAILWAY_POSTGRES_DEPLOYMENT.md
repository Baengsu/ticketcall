# Railway PostgreSQL 배포 설정 가이드

## 📋 목차

1. [DATABASE_URL 설정](#1-database_url-설정)
2. [Prisma 명령어 실행 시점](#2-prisma-명령어-실행-시점)
3. [Railway 배포 프로세스](#3-railway-배포-프로세스)
4. [설정 파일 설명](#4-설정-파일-설명)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [문제 해결](#6-문제-해결)

---

## 1. DATABASE_URL 설정

### 1.1 Railway에서 DATABASE_URL 자동 제공

Railway에서 PostgreSQL 서비스를 추가하면 **자동으로 `DATABASE_URL` 환경 변수가 생성**됩니다.

**Railway 대시보드에서 확인:**
- 프로젝트 → PostgreSQL 서비스 → Variables 탭
- `DATABASE_URL` 자동 생성됨

### 1.2 DATABASE_URL 형식

#### 내부 네트워크용 (Railway 서비스 간 통신)
```
postgresql://postgres:비밀번호@postgres.railway.internal:5432/railway
```

**특징:**
- `postgres.railway.internal`은 Railway **내부 네트워크** 전용
- 같은 프로젝트 내 서비스 간 통신에 사용
- **외부에서 접근 불가능**

#### Public URL (외부 접근용)
```
postgresql://postgres:비밀번호@containers-us-west-xxx.railway.app:5432/railway
```

**특징:**
- Railway 대시보드에서 **Public URL** 활성화 필요
- 외부에서 접근 가능 (Vercel 등 다른 플랫폼에서 사용 시)
- 보안 주의 필요

### 1.3 DATABASE_URL 확인 방법

**Railway 대시보드:**
1. 프로젝트 선택
2. PostgreSQL 서비스 선택
3. Variables 탭에서 `DATABASE_URL` 확인

**Railway CLI:**
```bash
railway variables
```

**환경 변수 형식 검증:**
- ✅ 올바른 형식: `postgresql://...` (postgresql로 시작)
- ❌ 잘못된 형식: `mysql://...` (MySQL 형식)

---

## 2. Prisma 명령어 실행 시점

### 2.1 `npx prisma generate`

**실행 시점:** Build Phase (빌드 단계)

**이유:**
- Prisma Client를 생성하여 TypeScript 타입 정의 생성
- `npm run build` 전에 실행되어야 Next.js 빌드 시 타입 오류 방지
- 빌드된 애플리케이션에 Prisma Client 포함

**실행 위치:** `nixpacks.toml`의 `[phases.build]` 섹션

```toml
[phases.build]
cmds = [
  "npx prisma generate",  # 1. Prisma Client 생성
  "npm run build"         # 2. Next.js 빌드
]
```

**주의사항:**
- `DATABASE_URL`이 설정되어 있어야 함 (스키마 검증용)
- 실제 DB 연결은 필요 없음 (스키마 파일만 필요)

### 2.2 `npx prisma migrate deploy`

**실행 시점:** Deploy Phase (배포 단계)

**이유:**
- 프로덕션 환경에서 마이그레이션 적용
- `migrate dev`와 달리 개발용 마이그레이션 파일 생성하지 않음
- 기존 마이그레이션 파일만 적용

**실행 위치:** `nixpacks.toml`의 `[phases.deploy]` 섹션

```toml
[phases.deploy]
cmds = ["npx prisma migrate deploy"]
```

**주의사항:**
- **실제 데이터베이스 연결 필요**
- `DATABASE_URL`이 올바르게 설정되어 있어야 함
- 첫 배포 시 모든 마이그레이션이 순차적으로 적용됨

### 2.3 명령어 비교

| 명령어 | 실행 시점 | 용도 | DB 연결 필요 |
|--------|----------|------|-------------|
| `prisma generate` | Build Phase | Prisma Client 생성 | ❌ (스키마만 필요) |
| `prisma migrate deploy` | Deploy Phase | 프로덕션 마이그레이션 적용 | ✅ |
| `prisma migrate dev` | 로컬 개발 | 개발용 마이그레이션 생성 및 적용 | ✅ |

---

## 3. Railway 배포 프로세스

### 3.1 전체 배포 흐름

```
1. Install Phase (의존성 설치)
   ↓
2. Build Phase (Prisma Client 생성 + Next.js 빌드)
   ↓
3. Deploy Phase (데이터베이스 마이그레이션)
   ↓
4. Start (애플리케이션 시작)
```

### 3.2 단계별 상세 설명

#### Phase 1: Install (의존성 설치)

**실행 명령어:**
```bash
npm ci --include=optional
```

**목적:**
- `package-lock.json` 기반으로 정확한 의존성 설치
- `--include=optional`: optional dependencies 포함 (preact 등)

**소요 시간:** 약 1-2분

**주의사항:**
- `npm install` 대신 `npm ci` 사용 (빌드 재현성)
- optional dependencies 포함 필요 (next-auth 의존성)

#### Phase 2: Build (빌드)

**실행 명령어:**
```bash
npx prisma generate
npm run build
```

**목적:**
1. `prisma generate`: Prisma Client 생성
2. `npm run build`: Next.js 프로덕션 빌드

**소요 시간:** 약 3-5분

**실행 순서가 중요한 이유:**
- Prisma Client가 생성되어야 TypeScript 컴파일 성공
- 빌드된 애플리케이션에 Prisma Client 포함

#### Phase 3: Deploy (마이그레이션)

**실행 명령어:**
```bash
npx prisma migrate deploy
```

**목적:**
- 데이터베이스에 마이그레이션 적용
- 테이블 생성/수정

**소요 시간:** 약 10-30초 (마이그레이션 수에 따라)

**주의사항:**
- 첫 배포 시 모든 마이그레이션이 적용됨
- 기존 데이터가 있으면 충돌 가능 (새 DB 권장)

#### Phase 4: Start (애플리케이션 시작)

**실행 명령어:**
```bash
npm start
```

**목적:**
- Next.js 프로덕션 서버 시작
- 포트 3000 (또는 Railway가 지정한 포트)에서 실행

---

## 4. 설정 파일 설명

### 4.1 `nixpacks.toml` (Railway 빌드 설정)

**전체 내용:**
```toml
[phases.install]
cmds = ["npm ci --include=optional"]

[phases.build]
cmds = [
  "npx prisma generate",
  "npm run build"
]

[phases.deploy]
cmds = ["npx prisma migrate deploy"]

[start]
cmd = "npm start"
```

**설명:**
- Railway는 Nixpacks를 사용하여 빌드
- `nixpacks.toml`이 있으면 자동으로 사용됨
- 없으면 Railway가 자동 감지 (덜 정확할 수 있음)

### 4.2 `railway.json` (Railway 배포 설정)

**전체 내용:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**설명:**
- `builder: "NIXPACKS"`: Nixpacks 빌더 사용 명시
- `startCommand`: 애플리케이션 시작 명령어 (nixpacks.toml의 [start]와 동일)
- `restartPolicyType`: 실패 시 재시작 정책

**참고:**
- `nixpacks.toml`이 있으면 `railway.json`의 `startCommand`는 무시됨
- `nixpacks.toml`의 `[start]` 섹션이 우선

---

## 5. 환경 변수 설정

### 5.1 Railway 대시보드에서 설정

**필수 환경 변수:**

1. **DATABASE_URL** (자동 생성)
   - PostgreSQL 서비스 추가 시 자동 생성
   - 수동 설정 불필요 (자동 연결)

2. **NEXTAUTH_SECRET** (수동 설정 필요)
   ```
   최소 32자 랜덤 문자열
   ```
   생성 방법:
   ```bash
   openssl rand -base64 32
   ```

3. **NEXTAUTH_URL** (수동 설정 필요)
   ```
   https://your-app.railway.app
   ```
   - Railway 배포 URL
   - 프로덕션 도메인 사용 시 해당 도메인

### 5.2 환경 변수 설정 위치

**Railway 대시보드:**
1. 프로젝트 선택
2. Next.js 서비스 선택
3. Variables 탭
4. "New Variable" 클릭
5. 변수명과 값 입력

**Railway CLI:**
```bash
railway variables set NEXTAUTH_SECRET="your-secret-here"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
```

### 5.3 환경 변수 확인

**Railway 대시보드:**
- Variables 탭에서 모든 환경 변수 확인

**Railway CLI:**
```bash
railway variables
```

**로컬 테스트:**
```bash
railway run printenv | grep DATABASE_URL
```

---

## 6. 문제 해결

### 6.1 마이그레이션 실패

**에러:**
```
Error: P3005 - Database schema is not empty
```

**원인:**
- 데이터베이스에 기존 테이블이 있음
- 마이그레이션 히스토리 불일치

**해결 방법:**

**옵션 A: 데이터베이스 초기화 (새 DB인 경우)**
```bash
railway run npx prisma migrate reset
```

**옵션 B: 마이그레이션 상태 확인**
```bash
railway run npx prisma migrate status
```

**옵션 C: 수동 마이그레이션**
```bash
railway run npx prisma migrate deploy
```

### 6.2 Prisma Client 생성 실패

**에러:**
```
Error: Can't find Prisma Client
```

**원인:**
- `prisma generate`가 실행되지 않음
- 빌드 단계에서 실패

**해결 방법:**
1. `nixpacks.toml`의 `[phases.build]` 확인
2. `npx prisma generate`가 `npm run build` 전에 있는지 확인
3. Railway 대시보드에서 빌드 로그 확인

### 6.3 DATABASE_URL 연결 실패

**에러:**
```
Error: Can't reach database server
```

**원인:**
- DATABASE_URL이 잘못 설정됨
- PostgreSQL 서비스가 실행되지 않음
- 네트워크 문제

**해결 방법:**
1. Railway 대시보드에서 PostgreSQL 서비스 상태 확인
2. DATABASE_URL 형식 확인 (`postgresql://`로 시작해야 함)
3. PostgreSQL 서비스 재시작

### 6.4 빌드 실패 (optional dependencies)

**에러:**
```
Error: Cannot find module 'preact'
```

**원인:**
- `npm ci`가 optional dependencies를 설치하지 않음

**해결 방법:**
- `nixpacks.toml`의 `[phases.install]`에 `--include=optional` 추가
- 이미 적용되어 있으면 Railway 재배포

### 6.5 마이그레이션 충돌

**에러:**
```
Error: Migration ... failed to apply
```

**해결 방법:**
```bash
# 1. 마이그레이션 상태 확인
railway run npx prisma migrate status

# 2. 문제가 있으면 리셋 (주의: 데이터 삭제)
railway run npx prisma migrate reset

# 3. 또는 수동으로 마이그레이션 적용
railway run npx prisma migrate deploy
```

---

## 7. 배포 체크리스트

### 배포 전 확인사항

- [ ] `prisma/schema.prisma`의 `provider = "postgresql"` 확인
- [ ] `nixpacks.toml`에 모든 Prisma 명령어 포함 확인
- [ ] Railway에 PostgreSQL 서비스 추가됨
- [ ] `DATABASE_URL` 자동 생성 확인
- [ ] `NEXTAUTH_SECRET` 설정됨
- [ ] `NEXTAUTH_URL` 설정됨
- [ ] 로컬에서 `npm run build` 성공 확인

### 배포 후 확인사항

- [ ] Railway 빌드 로그에서 모든 단계 성공 확인
- [ ] `prisma migrate deploy` 성공 확인
- [ ] 애플리케이션 정상 시작 확인
- [ ] 데이터베이스 테이블 생성 확인 (Prisma Studio 또는 Railway PostgreSQL 대시보드)
- [ ] 애플리케이션 동작 테스트

---

## 8. 참고 자료

- [Railway 공식 문서](https://docs.railway.app)
- [Prisma Migrate 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)

---

## 9. 요약

### 핵심 포인트

1. **DATABASE_URL**: Railway가 자동 생성 (PostgreSQL 서비스 연결 시)
2. **prisma generate**: Build Phase에서 실행 (Prisma Client 생성)
3. **prisma migrate deploy**: Deploy Phase에서 실행 (마이그레이션 적용)
4. **npm start**: Start Phase에서 실행 (애플리케이션 시작)

### 명령어 실행 순서

```
Install → Build (generate + build) → Deploy (migrate) → Start
```

### 설정 파일

- `nixpacks.toml`: Railway 빌드 설정 (Prisma 명령어 포함)
- `railway.json`: Railway 배포 설정 (시작 명령어 등)
- `prisma/schema.prisma`: 데이터베이스 스키마 정의
