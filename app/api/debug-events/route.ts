// app/api/debug-events/route.ts
import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/events";

export async function GET() {
  const events = getAllEvents().slice(0, 50); // 앞에서 50개만
  return NextResponse.json(events);
}
