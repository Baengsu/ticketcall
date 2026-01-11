// C:\ticketcall\lib\redis.ts
import Redis from "ioredis";

// ----- In-memory fallback store (REDIS_URL 없을 때만 사용) -----
type StoreEntry = {
  value: string;
  expiresAt: number; // ms 단위 timestamp
};

const memoryStore = new Map<string, StoreEntry>();
const memoryCounters = new Map<string, { value: number; expiresAt: number }>();

const memoryRedis = {
  // Supports:
  // - set(key, value)
  // - set(key, value, ttlSeconds:number)               (legacy)
  // - set(key, value, "EX", seconds)
  // - set(key, value, "NX", "EX", seconds)
  // - set(key, value, "EX", seconds, "NX")
  async set(key: string, value: string, ...args: any[]): Promise<"OK" | null> {
    const now = Date.now();

    // clear expired existing key
    const existing = memoryStore.get(key);
    if (existing && existing.expiresAt !== Infinity && existing.expiresAt <= now) {
      memoryStore.delete(key);
    }

    let nx = false;
    let exSeconds: number | undefined;

    // legacy: (ttlSeconds?: number)
    if (args.length === 1 && typeof args[0] === "number") {
      exSeconds = args[0];
    } else if (args.length > 0) {
      const tokens = args.map((a) => (typeof a === "string" ? a.toUpperCase() : a));

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === "NX") nx = true;
        if (t === "EX" && typeof tokens[i + 1] === "number") {
          exSeconds = tokens[i + 1];
          i += 1;
        }
      }
    }

    if (nx) {
      const alive = memoryStore.get(key);
      if (alive && (alive.expiresAt === Infinity || alive.expiresAt > now)) {
        return null;
      }
    }

    const expiresAt =
      typeof exSeconds === "number" ? now + exSeconds * 1000 : Infinity;

    memoryStore.set(key, { value, expiresAt });
    return "OK";
  },

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry) {
      return null;
    }

    // 만료된 키는 삭제하고 null 반환
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
      return null;
    }

    return entry.value;
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

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const counter = memoryCounters.get(key);

    if (!counter || counter.expiresAt <= now) {
      memoryCounters.set(key, { value: 1, expiresAt: Infinity });
      return 1;
    }

    counter.value += 1;
    return counter.value;
  },

  async expire(key: string, seconds: number): Promise<number> {
    const expiresAt = Date.now() + seconds * 1000;
    
    // memoryStore의 경우
    const entry = memoryStore.get(key);
    if (entry) {
      entry.expiresAt = expiresAt;
      return 1;
    }

    // memoryCounters의 경우
    const counter = memoryCounters.get(key);
    if (counter) {
      counter.expiresAt = expiresAt;
      return 1;
    }

    // 키가 없으면 0 반환
    return 0;
  },

  async ttl(key: string): Promise<number> {
    const now = Date.now();
    
    // memoryStore 확인
    const entry = memoryStore.get(key);
    if (entry && entry.expiresAt !== Infinity) {
      const ttl = Math.ceil((entry.expiresAt - now) / 1000);
      return ttl > 0 ? ttl : -2; // -2는 키가 없음을 의미
    }

    // memoryCounters 확인
    const counter = memoryCounters.get(key);
    if (counter && counter.expiresAt !== Infinity) {
      const ttl = Math.ceil((counter.expiresAt - now) / 1000);
      return ttl > 0 ? ttl : -2;
    }

    // 키가 없거나 만료 시간이 없으면 -1 (만료 시간 없음)
    if (entry || counter) {
      return -1;
    }

    return -2; // 키가 없음
  },

  async del(key: string): Promise<number> {
    const existed = memoryStore.delete(key) ? 1 : 0;
    memoryCounters.delete(key);
    return existed;
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
  set: (key: string, value: string, ...args: any[]) => Promise<"OK" | null>;
  get: (key: string) => Promise<string | null>;
  keys: (pattern: string) => Promise<string[]>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  ttl: (key: string) => Promise<number>;
  del: (key: string) => Promise<number>;
};

if (process.env.REDIS_URL) {
  // 진짜 Redis 사용 (배포/서버 환경)
  console.log("[redis] Using real Redis:", process.env.REDIS_URL);
  const client = new Redis(process.env.REDIS_URL);

  redis = {
    async set(key, value, ...args) {
      return client.set(key, value, ...args);
    },
    async get(key) {
      return client.get(key);
    },
    async keys(pattern) {
      return client.keys(pattern);
    },
    async incr(key) {
      return client.incr(key);
    },
    async expire(key, seconds) {
      return client.expire(key, seconds);
    },
    async ttl(key) {
      return client.ttl(key);
    },
    async del(key) {
      return client.del(key);
    },
  };
} else {
  // REDIS_URL 없으면 메모리 버전 사용 (로컬 개발용)
  console.warn("[redis] REDIS_URL not set. Using in-memory store (dev only).");
  redis = memoryRedis;
}

export default redis;
