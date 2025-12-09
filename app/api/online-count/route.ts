// C:\ticketcall\app\api\online-count\route.ts
// app/api/online-count/route.ts
import { NextResponse } from "next/server";
import redis from "@/lib/redis";

export async function GET() {
  try {
    const keys = await redis.keys("online:*");
    const count = keys.length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error in /api/online-count:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
