import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

function getClientId(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  // @ts-ignore - dev environment fallback
  if ((req as any).ip) {
    // @ts-ignore
    return (req as any).ip as string;
  }

  return `random-${Math.random().toString(36).slice(2)}`;
}

export async function POST(req: NextRequest) {
  try {
    const id = getClientId(req);

    // Set online status with 30 second TTL
    await redis.set(`online:${id}`, "1", 30);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in /api/ping:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}