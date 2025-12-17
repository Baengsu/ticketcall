# 배포 및 자동 리빌드 설정 가이드

## 로컬 테스트

로컬 개발 환경에서 자동 리빌드를 테스트하려면:

```bash
# 1. 환경 변수 설정 (선택사항)
export CRON_SECRET=local-dev-secret
export INTERVAL_MINUTES=60  # 60분마다 실행 (기본값)

# 2. Next.js 개발 서버 실행
npm run dev

# 3. 별도 터미널에서 자동 리빌드 스크립트 실행
npm run cron:local
```

또는 직접 실행:
```bash
node scripts/local-cron.js
```

## 배포 플랫폼별 설정

### 1. Vercel (추천)

**장점:**
- Next.js 최적화
- 무료 플랜 제공
- Cron Jobs 내장 지원
- 간단한 설정

**설정 방법:**

1. `vercel.json` 파일이 이미 생성되어 있습니다.
2. Vercel에 프로젝트 배포:
   ```bash
   npm i -g vercel
   vercel
   ```
3. 환경 변수 설정 (Vercel 대시보드):
   - `CRON_SECRET`: 선택사항 (보안 강화용)
   - `DATABASE_URL`: 데이터베이스 연결 문자열
   - 기타 필요한 환경 변수들

4. Cron Jobs 확인:
   - Vercel 대시보드 → 프로젝트 → Cron Jobs
   - 실행 이력 확인 가능

**Cron 스케줄:**
- 현재 설정: `"0 * * * *"` (UTC 기준 매 정각 = 한국 시간 기준 매 정각)
- 한국 시간(KST, UTC+9) 기준 매 정각에 자동 실행됩니다.
- 예: 한국 시간 00:00, 01:00, 02:00, ..., 23:00에 실행

### 2. Railway

**장점:**
- 간단한 배포
- 데이터베이스 포함 제공
- Cron Jobs 지원

**설정 방법:**

1. `railway.json` 파일 생성:
   ```json
   {
     "cron": {
       "rebuild": {
         "schedule": "0 * * * *",
         "command": "curl -X GET https://your-app.railway.app/api/rebuild -H 'x-cron-secret: YOUR_SECRET'"
       }
     }
   }
   ```

2. 또는 Railway 대시보드에서 Cron Job 설정

### 3. Render

**장점:**
- 무료 플랜 제공
- Cron Jobs 지원

**설정 방법:**

1. Render 대시보드 → Cron Job 생성
2. 설정:
   - Schedule: `0 * * * *`
   - Command: `curl -X GET https://your-app.onrender.com/api/rebuild -H 'x-cron-secret: YOUR_SECRET'`

### 4. AWS (Lambda + EventBridge)

**장점:**
- 확장성
- 세밀한 제어

**설정 방법:**

1. Lambda 함수 생성
2. EventBridge 규칙 생성 (매 시간마다 실행)
3. Lambda에서 API 호출:
   ```javascript
   const https = require('https');
   const options = {
     hostname: 'your-api-domain.com',
     path: '/api/rebuild',
     method: 'GET',
     headers: {
       'x-cron-secret': process.env.CRON_SECRET
     }
   };
   // ... 호출 로직
   ```

### 5. GitHub Actions

**장점:**
- 무료 (공개 저장소)
- 코드와 함께 관리

**설정 방법:**

`.github/workflows/cron-rebuild.yml` 파일 생성:
```yaml
name: Auto Rebuild

on:
  schedule:
    - cron: '0 * * * *'  # 매 시간마다
  workflow_dispatch:  # 수동 실행도 가능

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - name: Call Rebuild API
        run: |
          curl -X GET ${{ secrets.API_URL }}/api/rebuild \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

## 환경 변수 설정

모든 배포 플랫폼에서 필요한 환경 변수:

- `DATABASE_URL`: 데이터베이스 연결 문자열
- `NEXTAUTH_SECRET`: NextAuth 비밀키
- `NEXTAUTH_URL`: 애플리케이션 URL
- `CRON_SECRET`: (선택사항) Cron 요청 인증용 비밀키

## 한국 시간 기준 매 정각 실행

한국 시간(UTC+9) 기준으로 매 정각 실행하려면:

**Vercel:**
```json
{
  "crons": [
    {
      "path": "/api/rebuild",
      "schedule": "0 0-23 * * *"  // UTC 기준 매 정각
    }
  ]
}
```

**다른 플랫폼:**
- Cron 표현식: `0 0-23 * * *` (UTC 기준)
- 한국 시간 00:00 = UTC 15:00 (전날)
- 한국 시간 01:00 = UTC 16:00 (전날)
- ...
- 한국 시간 09:00 = UTC 00:00
- 한국 시간 10:00 = UTC 01:00

정확한 한국 시간 기준으로 하려면 각 시간대별로 계산 필요:
```
한국 00시 = UTC 15시 (전날) → "0 15 * * *"
한국 01시 = UTC 16시 (전날) → "0 16 * * *"
...
한국 09시 = UTC 00시 → "0 0 * * *"
한국 10시 = UTC 01시 → "0 1 * * *"
...
한국 23시 = UTC 14시 → "0 14 * * *"
```

또는 간단하게 UTC 기준 매 시간마다 실행하면 한국 시간 기준으로도 매 시간마다 실행됩니다.

## 확인 방법

1. **관리자 페이지**: 리빌드 로그에서 `userEmail: "system-cron"` 확인
2. **홈페이지**: 마지막 리빌드 시간 확인
3. **배포 플랫폼 대시보드**: Cron 실행 이력 확인

