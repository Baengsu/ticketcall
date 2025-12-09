// C:\ticketcall\lib\redis.ts
import Redis from "ioredis";

// ----- In-memory fallback store (REDIS_URL 없을 때만 사용) -----
type StoreEntry = {
  value: string;
  expiresAt: number; // ms 단위 timestamp
};

const memoryStore = new Map<string, StoreEntry>();

const memoryRedis = {
  // ttlSeconds 가 있으면 EX 기반으로 만료되게 흉내냄
  async set(key: string, value: string, ttlSeconds?: number) {
    let expiresAt = Infinity;

    if (typeof ttlSeconds === "number") {
      expiresAt = Date.now() + ttlSeconds * 1000;
    }

    memoryStore.set(key, { value, expiresAt });
  },

  async keys(pattern: string) {
    const now = Date.now();
    const result: string[] = [];

    for (const [key, entry] of memoryStore.entries()) {
      // 만료된 키는 삭제
      if (entry.expiresAt <= now) {
        memoryStore.delete(key);
        continue;
      }

      if (matchPattern(key, pattern)) {
        result.push(key);
      }
    }

    return result;
  },
};

// online:* 정도만 쓰는 간단한 패턴 매칭
function matchPattern(key: string, pattern: string) {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return key.startsWith(prefix);
  }
  return key === pattern;
}

// ----- 실제로 export 되는 redis 객체 선택 -----
let redis: {
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  keys: (pattern: string) => Promise<string[]>;
};

if (process.env.REDIS_URL) {
  // 진짜 Redis 사용 (배포/서버 환경)
  console.log("[redis] Using real Redis:", process.env.REDIS_URL);
  const client = new Redis(process.env.REDIS_URL);

  redis = {
    async set(key, value, ttlSeconds) {
      if (typeof ttlSeconds === "number") {
        // ioredis 시그니처: set(key, value, "EX", seconds)
        await client.set(key, value, "EX", ttlSeconds);
      } else {
        await client.set(key, value);
      }
    },
    async keys(pattern) {
      return client.keys(pattern);
    },
  };
} else {
  // REDIS_URL 없으면 메모리 버전 사용 (로컬 개발용)
  console.warn("[redis] REDIS_URL not set. Using in-memory store (dev only).");
  redis = memoryRedis;
}

export default redis;
