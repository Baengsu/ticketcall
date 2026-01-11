/**
 * 관리자 메시지 차단 API
 * 
 * 관리자가 사용자의 메시지 전송을 일시적으로 차단할 수 있습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/messages/block
 * 메시지 전송 일시 차단 설정/해제
 * 
 * Body: { userId: string, blockedUntil: string (ISO date string) | null, reason: string }
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status }
      );
    }

    const adminId = gate.userId;

    const body = await req.json().catch(() => null);
    const userId = body?.userId as string | undefined;
    const blockedUntilStr = body?.blockedUntil as string | undefined | null;
    const reason = body?.reason as string | undefined;

    // 입력 검증
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { ok: false, message: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, messageBlockedUntil: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { ok: false, message: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const oldBlockedUntil = targetUser.messageBlockedUntil;
    let blockedUntil: Date | null = null;

    if (blockedUntilStr) {
      blockedUntil = new Date(blockedUntilStr);
      if (isNaN(blockedUntil.getTime())) {
        return NextResponse.json(
          { ok: false, message: "유효하지 않은 날짜 형식입니다." },
          { status: 400 }
        );
      }
    }

    // 차단 설정/해제 및 로그 기록
    await prisma.$transaction(async (tx) => {
      // 차단 시간 업데이트
      await tx.user.update({
        where: { id: userId },
        data: { messageBlockedUntil: blockedUntil },
      });

      // AdminActionLog 기록
      const actionType = blockedUntil ? "BLOCK_MESSAGE_SENDING" : "UNBLOCK_MESSAGE_SENDING";
      await tx.adminActionLog.create({
        data: {
          adminId,
          actionType,
          targetType: "USER",
          targetId: userId,
          reason: reason?.trim() || (blockedUntil ? "메시지 전송 일시 차단" : "메시지 전송 차단 해제"),
          oldValue: JSON.stringify({
            messageBlockedUntil: oldBlockedUntil?.toISOString() || null,
          }),
          newValue: JSON.stringify({
            messageBlockedUntil: blockedUntil?.toISOString() || null,
          }),
        },
      });
    });

    return NextResponse.json(
      {
        ok: true,
        message: blockedUntil
          ? `메시지 전송이 ${blockedUntil.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}까지 차단되었습니다.`
          : "메시지 전송 차단이 해제되었습니다.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Admin Messages Block POST] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}



