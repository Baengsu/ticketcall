// app/api/debug/yes/route.ts
import { NextResponse } from "next/server";
import { saveYesDebug } from "@/lib/yes";

export async function GET() {
  const filePath = await saveYesDebug();
  return NextResponse.json({ ok: true, filePath });
}
