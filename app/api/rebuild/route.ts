// app/api/rebuild/route.ts
import { NextResponse } from "next/server";
import { buildMergedData, saveMergedData } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const merged = await buildMergedData();
    await saveMergedData(merged);

    return NextResponse.json({
      ok: true,
      generatedAt: merged.generatedAt,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
