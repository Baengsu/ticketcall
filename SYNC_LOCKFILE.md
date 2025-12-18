# package-lock.json 동기화 절차

## 문제
Railway 빌드에서 `npm ci` 실패: package.json과 package-lock.json이 동기화되지 않음
Missing 패키지: preact@10.11.3 등

## ✅ 검증된 해결 절차

### 1단계: 기존 파일 완전 삭제
```powershell
# node_modules 삭제
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# package-lock.json 삭제
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# npm 캐시 정리 (권장)
npm cache clean --force
```

### 2단계: Lockfile 재생성 및 검증
```powershell
# package.json과 완전히 동기화된 lockfile 생성
npm install

# 검증: npm ci가 통과하는지 확인 (node_modules 없이)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
```

**예상 결과:**
- ✅ `npm ci` 성공 (499 packages 설치)
- ✅ `package-lock.json` 생성됨 (lockfileVersion: 3)

### 3단계: 커밋할 파일

**반드시 커밋해야 할 파일:**
- ✅ `package-lock.json` (새로 생성/업데이트됨)
- ✅ `package.json` (변경사항이 있다면)

**커밋하지 말아야 할 파일:**
- ❌ `node_modules/` (이미 .gitignore에 포함됨)
- ❌ `.npm/` (캐시 디렉토리)

### 4단계: Git 커밋 및 Railway 배포

```bash
# 변경사항 확인
git status

# package-lock.json 추가
git add package-lock.json package.json

# 커밋
git commit -m "fix: sync package-lock.json with package.json"

# Railway에 배포 (GitHub push 또는 Railway 수동 재배포)
git push origin main
```

### 5단계: Railway 빌드 확인
Railway 대시보드에서:
1. 새 배포 트리거 (GitHub push 또는 수동 재배포)
2. 빌드 로그에서 `npm ci` 성공 확인
3. 빌드 완료 확인

## 모노레포 확인
현재 프로젝트는 **단일 레포지토리**입니다 (모노레포 아님).
- ✅ 루트에 `package.json` 1개만 존재
- ✅ 하위 디렉토리에 별도 package.json 없음
- ✅ 루트 디렉토리: `c:\ticketcall\`

## 참고사항
- `npm ci`는 package-lock.json을 엄격하게 따릅니다
- `npm install`은 package.json을 기반으로 lockfile을 업데이트합니다
- Railway는 `npm ci`를 사용하므로 lockfile이 반드시 필요합니다
- lockfileVersion: 3 (npm 7+ 호환)

## 문제 해결 체크리스트
- [x] node_modules 삭제 완료
- [x] package-lock.json 삭제 완료
- [x] npm cache 정리 완료
- [x] npm install 성공
- [x] npm ci 검증 통과
- [ ] package-lock.json Git 커밋
- [ ] Railway 배포 성공
