// app/api/rebuild/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildMergedData, saveMergedData } from "@/lib/aggregate";

async function handleRebuild(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "관리자만 실행할 수 있습니다." },
      { status: 403 }
    );
  }

  // 실제 크롤링 + 병합
  try {
    const merged = await buildMergedData();
    await saveMergedData(merged);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: merged.generatedAt,
        siteCount: merged.sites.length,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("rebuild error", e);
    return NextResponse.json(
      { ok: false, message: "리빌드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 브라우저에서 직접 GET으로 쳐도 되고,
// 버튼에서는 POST로 호출해도 되도록 둘 다 export
export async function GET(req: Request) {
  return handleRebuild(req);
}

export async function POST(req: Request) {
  return handleRebuild(req);
}
