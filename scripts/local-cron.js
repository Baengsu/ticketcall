// 로컬 개발 환경에서 자동 리빌드를 테스트하기 위한 스크립트
// 사용법: node scripts/local-cron.js

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'local-dev-secret';
// 한국 시간 기준 매 정각 실행 (기본 60분마다, 하지만 정각에 맞춰 실행)
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || '60', 10);

console.log(`🚀 로컬 자동 리빌드 스크립트 시작`);
console.log(`📍 API URL: ${API_URL}/api/rebuild`);
console.log(`⏰ 실행 간격: ${INTERVAL_MINUTES}분마다`);
console.log(`\n첫 실행은 즉시 시작됩니다...\n`);

function callRebuild() {
  const url = new URL(`${API_URL}/api/rebuild`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET',
    headers: {
      'x-cron-secret': CRON_SECRET,
      'x-vercel-cron': '1', // Vercel 형식도 지원
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const timestamp = new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour12: false,
      });
      
      if (res.statusCode === 200) {
        try {
          const result = JSON.parse(data);
          console.log(`✅ [${timestamp}] 리빌드 성공 - 사이트 ${result.siteCount || 0}개`);
        } catch (e) {
          console.log(`✅ [${timestamp}] 리빌드 성공`);
        }
      } else {
        console.error(`❌ [${timestamp}] 리빌드 실패 (${res.statusCode}):`, data);
      }
    });
  });

  req.on('error', (error) => {
    const timestamp = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour12: false,
    });
    console.error(`❌ [${timestamp}] 네트워크 오류:`, error.message);
  });

  req.end();
}

// 한국 시간 기준 매 정각에 실행되도록 설정
function getNextKSTMinute() {
  const now = new Date();
  const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const currentMinute = kstNow.getMinutes();
  const currentSecond = kstNow.getSeconds();
  const currentMillisecond = kstNow.getMilliseconds();
  
  // 다음 정각까지의 시간 계산 (밀리초)
  const msUntilNextHour = (60 - currentMinute) * 60 * 1000 - currentSecond * 1000 - currentMillisecond;
  
  return msUntilNextHour;
}

function scheduleNextRebuild() {
  const msUntilNext = getNextKSTMinute();
  const nextTime = new Date(Date.now() + msUntilNext);
  const nextTimeStr = nextTime.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
  });
  
  console.log(`⏰ 다음 실행 예정: ${nextTimeStr} (한국 시간 기준)`);
  
  setTimeout(() => {
    callRebuild();
    // 매 정각마다 실행되도록 재귀 호출
    setInterval(callRebuild, 60 * 60 * 1000); // 60분마다
  }, msUntilNext);
}

// 즉시 한 번 실행
callRebuild();

// 한국 시간 기준 매 정각에 실행되도록 스케줄링
scheduleNextRebuild();

console.log(`\n⏳ 한국 시간 기준 매 정각(00분)에 실행됩니다.`);
console.log(`종료하려면 Ctrl+C를 누르세요.\n`);

