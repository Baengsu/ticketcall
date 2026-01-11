/**
 * 콘텐츠 숨김 처리 API
 * POST /api/admin/hide
 * 
 * Body: { targetType: "POST" | "COMMENT", targetId: number, reason: string }
 * 
 * 관리자 또는 Lv.5+ 사용자가 게시물 또는 댓글을 숨길 수 있습니다.
 * 모든 액션은 AdminActionLog에 기록됩니다.
 * 
 * 권한 요구사항:
 * - 관리자 (role === "admin"): 항상 가능
 * - 일반 사용자: Lv.5 이상 필요
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { getLevel } from "@/lib/level";
import { canHideContent } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    // 1. 세션 확인
    const { userId, isAdmin } = await getAuthUser();

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 2. 권한 확인 (관리자 또는 Lv.5+)
    if (!isAdmin) {
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });

      if (!userData) {
        return NextResponse.json(
          { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const userLevel = getLevel(userData.points);
      if (!canHideContent(userLevel)) {
        return NextResponse.json(
          {
            ok: false,
            message: `콘텐츠 숨김 기능은 Lv.5 이상부터 사용할 수 있습니다. 현재 레벨은 Lv.${userLevel}입니다.`,
            requiredLevel: 5,
            currentLevel: userLevel,
          },
          { status: 403 }
        );
      }
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
        { ok: false, message: "숨김 처리 이유를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 4. 타겟 존재 확인 및 현재 상태 확인
    let oldValue: any = null;
    let newValue: any = null;

    if (targetType === "POST") {
      const post = await prisma.post.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          title: true,
          isHidden: true,
        },
      });

      if (!post) {
        return NextResponse.json(
          { ok: false, message: "게시물을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (post.isHidden) {
        return NextResponse.json(
          { ok: false, message: "이미 숨김 처리된 게시물입니다." },
          { status: 409 }
        );
      }

      oldValue = JSON.stringify({ isHidden: post.isHidden });
      newValue = JSON.stringify({ isHidden: true });

      // 5. 게시물 숨김 처리 및 로그 기록 (트랜잭션)
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.post.update({
          where: { id: targetId },
          data: {
            isHidden: true,
            hiddenAt: now,
            hiddenReason: reason.trim(),
          },
        });

        await tx.adminActionLog.create({
          data: {
            adminId: userId,
            actionType: "HIDE_POST",
            targetType: "POST",
            targetId: String(targetId),
            reason: reason.trim(),
            oldValue,
            newValue,
          },
        });
      });
    } else if (targetType === "COMMENT") {
      const comment = await prisma.comment.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          content: true,
          isHidden: true,
        },
      });

      if (!comment) {
        return NextResponse.json(
          { ok: false, message: "댓글을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (comment.isHidden) {
        return NextResponse.json(
          { ok: false, message: "이미 숨김 처리된 댓글입니다." },
          { status: 409 }
        );
      }

      oldValue = JSON.stringify({ isHidden: comment.isHidden });
      newValue = JSON.stringify({ isHidden: true });

      // 5. 댓글 숨김 처리 및 로그 기록 (트랜잭션)
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.comment.update({
          where: { id: targetId },
          data: {
            isHidden: true,
            hiddenAt: now,
            hiddenReason: reason.trim(),
          },
        });

        await tx.adminActionLog.create({
          data: {
            adminId: userId,
            actionType: "HIDE_COMMENT",
            targetType: "COMMENT",
            targetId: String(targetId),
            reason: reason.trim(),
            oldValue,
            newValue,
          },
        });
      });
    }

    return NextResponse.json(
      { ok: true, message: "숨김 처리가 완료되었습니다." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Admin Hide] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

