# MySQL → PostgreSQL 마이그레이션 가이드

## ✅ 완료된 작업

1. **schema.prisma**: 이미 `provider = "postgresql"`로 설정됨
2. **migration_lock.toml**: `mysql` → `postgresql`로 변경 완료
3. **schema.prisma**: 긴 텍스트 필드에 `@db.Text` 추가
4. **nixpacks.toml**: `prisma migrate deploy` 추가 완료

## 🔄 마이그레이션 재생성 방법

### 옵션 1: 기존 마이그레이션 삭제 후 재생성 (새 DB인 경우 권장)

```bash
# 1. 기존 마이그레이션 백업 (선택사항)
mv prisma/migrations prisma/migrations.mysql.backup

# 2. PostgreSQL 데이터베이스 연결 확인
# DATABASE_URL이 PostgreSQL을 가리키는지 확인
echo $DATABASE_URL  # 또는 .env 파일 확인

# 3. 새 마이그레이션 생성
npx prisma migrate dev --name init_postgresql

# 4. Prisma 클라이언트 생성
npx prisma generate
```

### 옵션 2: 기존 마이그레이션 유지 (데이터 마이그레이션 필요 시)

기존 마이그레이션 파일들이 MySQL 구문이므로, PostgreSQL로 변환하거나 새로 생성해야 합니다.

**권장**: 새 DB라면 옵션 1을 사용하세요.

## 🚀 Railway 배포 설정

### nixpacks.toml (이미 적용됨)

```toml
[phases.install]
cmds = ["npm ci"]

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

### Railway 환경 변수 확인

Railway 대시보드에서 다음 환경 변수가 설정되어 있는지 확인:

```env
DATABASE_URL="postgresql://postgres:비밀번호@호스트:5432/railway"
NEXTAUTH_SECRET="최소-32자-랜덤-문자열"
NEXTAUTH_URL="https://your-app-domain.com"
```

## 📋 로컬 테스트 절차

### 1. PostgreSQL 로컬 설정 (Docker 사용)

```bash
# PostgreSQL 컨테이너 실행
docker run --name ticketcall-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ticketcall \
  -p 5432:5432 \
  -d postgres:15

# DATABASE_URL 설정
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketcall"
```

### 2. 마이그레이션 실행

```bash
# 기존 마이그레이션 삭제 (새 DB인 경우)
rm -rf prisma/migrations

# 새 마이그레이션 생성
npx prisma migrate dev --name init_postgresql

# Prisma 클라이언트 생성
npx prisma generate

# 빌드 테스트
npm run build
```

### 3. 스키마 확인

```bash
# Prisma Studio로 확인
npx prisma studio
```

## 🔍 변경 사항 요약

### schema.prisma 변경

- ✅ `provider = "postgresql"` (이미 설정됨)
- ✅ 긴 텍스트 필드에 `@db.Text` 추가:
  - `Post.content`
  - `Post.adminReply`
  - `Comment.content`
  - `RebuildLog.message`
  - `Report.reason`
  - `Notification.message`
  - `EtcEvent.memo`

### migration_lock.toml 변경

- ✅ `provider = "postgresql"`로 변경

### nixpacks.toml 변경

- ✅ `[phases.deploy]` 섹션 추가
- ✅ `npx prisma migrate deploy` 명령 추가
- ✅ 빌드 순서 최적화 (generate → build)

## ⚠️ 주의사항

1. **기존 데이터가 있는 경우**: 데이터 마이그레이션 스크립트가 필요할 수 있습니다.
2. **Railway 배포**: 첫 배포 시 `prisma migrate deploy`가 실행되어 테이블이 생성됩니다.
3. **로컬 개발**: `.env` 파일에 올바른 `DATABASE_URL`이 설정되어 있어야 합니다.

## ✅ 검증 체크리스트

- [x] schema.prisma provider 확인
- [x] migration_lock.toml 변경
- [x] 긴 텍스트 필드에 @db.Text 추가
- [x] nixpacks.toml에 migrate deploy 추가
- [ ] 로컬에서 마이그레이션 재생성 및 테스트
- [ ] Railway 배포 후 테이블 생성 확인

## 🐛 문제 해결

### P2021 에러 (테이블이 없음)

```bash
# Railway에서 마이그레이션 수동 실행
railway run npx prisma migrate deploy
```

### 마이그레이션 충돌

```bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 문제가 있으면 리셋 (주의: 데이터 삭제됨)
npx prisma migrate reset
```


