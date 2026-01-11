// 17.4 lib/redis-cache.ts
import redis from "@/lib/redis";

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSec: number) {
  await redis.set(key, JSON.stringify(value), ttlSec);
}

