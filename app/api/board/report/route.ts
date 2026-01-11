/**
 * 신고 API
 * POST /api/board/report
 * 
 * Body: { targetType: "POST" | "COMMENT", targetId: number, reason: string }
 * 
 * 규칙:
 * - Lv.4 이상 사용자만 신고 가능
 * - 한 사용자가 한 타겟에 대해 한 번만 신고 가능
 * - 신고는 포인트에 직접 영향을 주지 않음
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getLevel } from "@/lib/level";
import { canReportPost } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    // 1. 세션 확인 (로그인 필수)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const reporterId = (session.user as any).id as string | undefined;
    if (!reporterId) {
      return NextResponse.json(
        { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
        { status: 401 }
      );
    }

    // 2. 요청 바디 파싱
    const body = await req.json().catch(() => null);
    const targetType = body?.targetType as string | undefined;
    const targetId = body?.targetId as number | undefined;
    const reason = body?.reason as string | undefined;

    // 3. 입력 검증
    if (!targetType || (targetType !== "POST" && targetType !== "COMMENT")) {
      return NextResponse.json(
        { ok: false, message: "targetType은 'POST' 또는 'COMMENT'여야 합니다." },
        { status: 400 }
      );
    }

    if (!targetId || !Number.isFinite(targetId)) {
      return NextResponse.json(
        { ok: false, message: "유효한 targetId가 필요합니다." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "신고 사유를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 4. 레벨 기반 권한 체크 (Lv.4+ 필요)
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
    });

    if (!reporter) {
      return NextResponse.json(
        { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isAdmin = reporter.role === "admin";
    if (!isAdmin) {
      if ((reporter as any).points === undefined) {
        return NextResponse.json(
          { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      const reporterLevel = getLevel((reporter as any).points);
      if (!canReportPost(reporterLevel)) {
        return NextResponse.json(
          {
            ok: false,
            message: `신고 기능은 Lv.4 이상부터 사용할 수 있습니다. 현재 레벨은 Lv.${reporterLevel}입니다.`,
            requiredLevel: 4,
            currentLevel: reporterLevel,
          },
          { status: 403 }
        );
      }
    }

    // 5. 타겟 존재 확인
    if (targetType === "POST") {
      const post = await prisma.post.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      if (!post) {
        return NextResponse.json(
          { ok: false, message: "게시물을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    } else if (targetType === "COMMENT") {
      const comment = await prisma.comment.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      if (!comment) {
        return NextResponse.json(
          { ok: false, message: "댓글을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    // 6. 이미 신고했는지 확인 (한 사용자가 한 타겟에 대해 한 번만 신고 가능)
    const existingReport = await prisma.report.findUnique({
      where: {
        reporterId_targetType_targetId: {
          reporterId,
          targetType,
          targetId,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          ok: false,
          message: "이미 신고한 항목입니다. 한 사용자는 한 항목에 대해 한 번만 신고할 수 있습니다.",
        },
        { status: 409 }
      );
    }

    // 7. 신고 생성
    await prisma.report.create({
      data: {
        targetType,
        targetId,
        reporterId,
        reason: reason.trim(),
        status: "pending",
      },
    });

    return NextResponse.json(
      { ok: true, message: "신고가 접수되었습니다." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Report] Error:", err);

    // 복합 키 중복 오류 처리 (이미 신고한 경우)
    if (err.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          message: "이미 신고한 항목입니다. 한 사용자는 한 항목에 대해 한 번만 신고할 수 있습니다.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

