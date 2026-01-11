/**
 * 관리자 포인트 조정 API
 * POST /api/admin/points
 * 
 * Body: { userId: string, amount: number, reason: string }
 * 
 * 관리자만 사용자 포인트를 수동으로 조정할 수 있습니다.
 * 모든 액션은 AdminActionLog와 PointHistory에 기록됩니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { addPointsInTransaction } from "@/lib/points";

export async function POST(req: NextRequest) {
  try {
    // 1. 세션 및 관리자 권한 확인
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status }
      );
    }

    const adminId = gate.userId;

    // 2. 요청 바디 파싱
    const body = await req.json().catch(() => null);
    const userId = body?.userId as string | undefined;
    const amount = body?.amount as number | undefined;
    const reason = body?.reason as string | undefined;

    // 3. 입력 검증
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { ok: false, message: "유효한 userId가 필요합니다." },
        { status: 400 }
      );
    }

    if (amount === undefined || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json(
        { ok: false, message: "0이 아닌 유효한 amount가 필요합니다." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "포인트 조정 이유를 입력해 주세요." },
        { status: 400 }
      );
    }

    // TypeScript 타입 가드: amount는 이제 number임이 보장됨
    const amountNumber: number = amount;

    // 4. 사용자 존재 확인 및 현재 포인트 조회
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { ok: false, message: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const oldPoints = (targetUser as any).points ?? 0;

    // 5. 포인트 조정 및 로그 기록 (트랜잭션)
    // addPointsInTransaction 사용하여 포인트 추가
    let newPoints: number = oldPoints;
    await prisma.$transaction(async (tx) => {
      // 포인트 추가 (PointHistory 생성 및 User.points 업데이트)
      // PointHistory의 reason은 정확히 "ADMIN_ADJUST"로 설정
      // 상세 이유는 AdminActionLog에 기록됨
      newPoints = await addPointsInTransaction(
        tx,
        userId,
        amountNumber,
        "ADMIN_ADJUST",
        null
      );

      // 관리자 액션 로그 기록 (상세 이유 포함)
      await tx.adminActionLog.create({
        data: {
          adminId,
          actionType: "ADJUST_POINTS",
          targetType: "USER",
          targetId: userId,
          reason: reason.trim(),
          oldValue: JSON.stringify({ points: oldPoints }),
          newValue: JSON.stringify({ points: newPoints }),
        },
      });
    });

    return NextResponse.json(
      {
        ok: true,
        message: "포인트 조정이 완료되었습니다.",
        oldPoints,
        newPoints,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Admin Points] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

