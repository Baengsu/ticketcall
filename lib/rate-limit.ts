// 17.2 lib/rate-limit.ts
// NOTE: If your redis export is different, adjust the import line below.
import redis from "@/lib/redis";

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetSec: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSec);
  }

  const ttl = await redis.ttl(key); // seconds
  const resetSec = ttl > 0 ? ttl : windowSec;

  return {
    ok: current <= limit,
    remaining: Math.max(0, limit - current),
    resetSec,
  };
}

