// C:\ticketcall\app\api\rebuild\route.ts
// app/api/rebuild/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildMergedData, saveMergedData } from "@/lib/aggregate";

// 크론(자동 스케줄러)에서도 호출할 수 있도록,
// 헤더에 비밀 키가 있을 때는 세션/관리자 체크를 생략하고 시스템 계정으로 처리합니다.
async function handleRebuild(req: Request) {
  console.log("[Rebuild] Request received", {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  // Vercel Cron은 자동으로 x-vercel-cron 헤더를 보냅니다
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  
  // 또는 사용자 정의 secret을 사용할 수도 있습니다
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  const isCustomCron = !!cronSecret && headerSecret === cronSecret;
  
  // Vercel Cron 또는 사용자 정의 secret이 있으면 cron 요청으로 인식
  const isCronRequest = vercelCronHeader === "1" || isCustomCron;

  let userEmail: string | null = null;
  let userId: string | null = null;
  let userRole: string | null = null;

  if (!isCronRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.log("[Rebuild] Unauthorized: No session");
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    userEmail = session.user.email;
    userId = (session.user as any)?.id ?? null;
    userRole = (session.user as any)?.role ?? null;

    console.log("[Rebuild] User check", {
      email: userEmail,
      userId,
      role: userRole,
    });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user || user.role !== "admin") {
      console.log("[Rebuild] Forbidden: Not admin", {
        userExists: !!user,
        userRole: user?.role,
      });
      return NextResponse.json(
        { ok: false, error: "관리자만 실행할 수 있습니다." },
        { status: 403 }
      );
    }

    console.log("[Rebuild] Authorized admin user", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    // 크론에서 호출한 경우, 로그에 남길 시스템 계정 표시
    userEmail = "system-cron";
    console.log("[Rebuild] Cron request detected");
  }

  // 실제 크롤링 + 병합
  try {
    console.log("[Rebuild] Starting data rebuild...");
    const merged = await buildMergedData();
    console.log("[Rebuild] Data built successfully", {
      siteCount: merged.sites?.length ?? 0,
      generatedAt: merged.generatedAt,
    });

    await saveMergedData(merged);
    console.log("[Rebuild] Data saved successfully");

    // Success log
    const siteCount = merged.sites?.length ?? 0;
    const generatedAt = merged.generatedAt ?? null;

    const message = `리빌드 성공 - 사이트 ${siteCount}개 병합${
      generatedAt ? ` (generatedAt: ${generatedAt})` : ""
    }`;

    await prisma.rebuildLog.create({
      data: {
        status: "success",
        message,
        userEmail,
      },
    });

    console.log("[Rebuild] Success - Rebuild completed", {
      userId,
      userEmail,
      userRole,
      siteCount,
      generatedAt,
    });

    return NextResponse.json(
      {
        ok: true,
        generatedAt,
        siteCount,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const errorMessage =
      e?.message ?? "리빌드 중 알 수 없는 오류가 발생했습니다.";
    const errorStack = e?.stack ?? "No stack trace available";

    console.error("[Rebuild] Error occurred", {
      userId,
      userEmail,
      userRole,
      error: errorMessage,
      stack: errorStack,
      fullError: e,
    });

    // Error log
    await prisma.rebuildLog.create({
      data: {
        status: "error",
        message: errorMessage,
        userEmail,
      },
    }).catch((logError) => {
      console.error("[Rebuild] Failed to create error log", logError);
    });

    return NextResponse.json(
      { 
        ok: false, 
        error: errorMessage,
        message: "리빌드 중 오류가 발생했습니다.",
      },
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
