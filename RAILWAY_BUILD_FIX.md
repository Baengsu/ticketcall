# Railway 빌드 오류 해결: preact@10.11.3 누락 문제

## 🔍 문제 분석 결과

### 1. preact 의존성 출처

**직접 의존성:** 없음 (package.json에 없음)

**간접 의존성 (의존성 체인):**
```
ticketcall (루트)
├── next-auth@4.24.13
│   ├── preact@^10.6.3 (직접 의존성)
│   └── @auth/core@0.34.3 (peer dependency, optional)
│       └── preact@10.11.3 ⚠️ (문제의 원인)
│
└── @auth/prisma-adapter@2.11.1
    └── @auth/core@0.41.1
        └── preact@10.24.3
```

**핵심 문제:**
- `@auth/core@0.34.3`이 **optional dependency**로 표시되어 있음
- 이 패키지가 `preact@10.11.3`을 의존성으로 요구함
- `npm ci`는 기본적으로 optional dependency를 설치하지 않음
- Railway 빌드에서 `preact@10.11.3`이 누락되어 에러 발생

### 2. package-lock.json 상태

✅ **커밋 상태:** package-lock.json은 Git에 커밋되어 있음 (working tree clean)

✅ **구조:**
- 루트 레벨에 `preact@10.24.3` 존재
- `preact@10.11.3`은 `@auth/core@0.34.3`의 하위 의존성으로만 존재
- `@auth/core@0.34.3`이 `"optional": true`로 표시됨

⚠️ **문제점:**
- `npm ci` 실행 시 optional dependency가 설치되지 않아 `preact@10.11.3` 누락
- package-lock.json에는 기록되어 있지만, 실제 설치 시 제외됨

### 3. 모노레포/서브폴더 구조 확인

✅ **단일 레포지토리** (모노레포 아님)
- 루트에 `package.json` 1개만 존재
- 하위 디렉토리에 별도 package.json 없음
- 루트 디렉토리: `c:\ticketcall\` (또는 Railway에서 `/`)

✅ **Railway Root Directory 설정:**
- **루트 디렉토리 (`/`)**로 설정해야 함
- 별도 설정 불필요 (기본값)

## 🔧 해결 방법

### 방법 1: Railway 빌드 설정 수정 (권장) ✅

`.nixpacks.toml` 파일을 수정하여 optional dependency도 설치하도록 설정:

```toml
[phases.install]
cmds = [
  "npm ci --include=optional",  # optional dependency 포함
  "npx prisma generate"
]
```

**이미 적용됨:** `.nixpacks.toml` 파일이 업데이트되었습니다.

### 방법 2: package-lock.json 재생성 (대안)

만약 방법 1이 작동하지 않는다면:

```powershell
# 1. 기존 파일 삭제
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# 2. Lockfile 재생성
npm install

# 3. 검증
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci --include=optional

# 4. 커밋
git add package-lock.json
git commit -m "fix: regenerate package-lock.json with optional dependencies"
```

## 📋 검증 체크리스트

- [x] preact 의존성 출처 확인 완료
- [x] package-lock.json Git 커밋 상태 확인 완료
- [x] 모노레포 구조 확인 완료 (단일 레포)
- [x] Railway Root Directory 확인 완료 (루트 `/`)
- [x] `.nixpacks.toml` 수정 완료 (`npm ci --include=optional`)
- [ ] Railway에 배포하여 빌드 성공 확인 필요

## 🚀 다음 단계

1. **변경사항 커밋:**
   ```bash
   git add .nixpacks.toml
   git commit -m "fix: include optional dependencies in npm ci for Railway build"
   git push origin main
   ```

2. **Railway 배포 확인:**
   - Railway 대시보드에서 새 배포 트리거
   - 빌드 로그에서 `npm ci --include=optional` 실행 확인
   - `preact@10.11.3` 설치 확인
   - 빌드 성공 확인

## 📝 참고사항

- `npm ci`는 package-lock.json을 엄격하게 따르지만, optional dependency는 기본적으로 제외됨
- `--include=optional` 플래그로 optional dependency도 설치 가능
- Railway는 Nixpacks를 사용하여 빌드하므로 `.nixpacks.toml` 설정이 적용됨
- `next-auth@4.24.13`이 `@auth/core@0.34.3`을 peer dependency로 요구하지만 optional로 표시됨
