// app/api/icons/evolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addPoints } from "@/lib/points";

/**
 * POST /api/icons/evolve
 * 아이콘 진화 업그레이드
 * 
 * Body: { currentIconKey: string }
 * 
 * 이전 단계 아이콘을 소유하고 있어야 다음 단계로 진화할 수 있습니다.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;
    const body = await req.json().catch(() => null);
    const currentIconKey = body?.currentIconKey as string | undefined;

    if (!currentIconKey || typeof currentIconKey !== "string") {
      return NextResponse.json(
        { ok: false, message: "현재 아이콘 키가 필요합니다." },
        { status: 400 }
      );
    }

    // phoenix_stage_로 시작하는지 확인
    if (!currentIconKey.startsWith("phoenix_stage_")) {
      return NextResponse.json(
        { ok: false, message: "유효하지 않은 아이콘 키입니다." },
        { status: 400 }
      );
    }

    // 현재 단계 추출 (예: "phoenix_stage_1" -> 1)
    const currentStage = parseInt(currentIconKey.replace("phoenix_stage_", ""), 10);
    if (isNaN(currentStage) || currentStage < 1 || currentStage >= 8) {
      return NextResponse.json(
        { ok: false, message: "최대 단계에 도달했거나 유효하지 않은 단계입니다." },
        { status: 400 }
      );
    }

    const nextStage = currentStage + 1;
    const nextIconKey = `phoenix_stage_${nextStage}`;

    // 다음 단계 아이콘 찾기
    const nextIcon = await prisma.iconItem.findUnique({
      where: { iconKey: nextIconKey },
    });

    if (!nextIcon) {
      return NextResponse.json(
        { ok: false, message: "다음 단계 아이콘을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 단계 아이콘 소유 확인
    const currentIcon = await prisma.iconItem.findUnique({
      where: { iconKey: currentIconKey },
    });

    if (!currentIcon) {
      return NextResponse.json(
        { ok: false, message: "현재 아이콘을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const currentOwnership = await prisma.userIconOwnership.findUnique({
      where: {
        userId_iconId: {
          userId,
          iconId: currentIcon.id,
        },
      },
    });

    if (!currentOwnership) {
      return NextResponse.json(
        { ok: false, message: "이전 단계 아이콘을 소유하고 있지 않습니다." },
        { status: 403 }
      );
    }

    // 이미 다음 단계를 소유하고 있는지 확인
    const nextOwnership = await prisma.userIconOwnership.findUnique({
      where: {
        userId_iconId: {
          userId,
          iconId: nextIcon.id,
        },
      },
    });

    if (nextOwnership) {
      return NextResponse.json(
        { ok: false, message: "이미 다음 단계 아이콘을 소유하고 있습니다." },
        { status: 400 }
      );
    }

    // 사용자 포인트 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (user.points < nextIcon.price) {
      return NextResponse.json(
        { ok: false, message: `포인트가 부족합니다. 필요 포인트: ${nextIcon.price}` },
        { status: 400 }
      );
    }

    // 진화 업그레이드 실행
    await prisma.$transaction(async (tx) => {
      // 포인트 차감 (트랜잭션 내부에서 사용)
      const { addPointsInTransaction } = await import("@/lib/points");
      await addPointsInTransaction(tx, userId, -nextIcon.price, "ICON_EVOLUTION", nextIconKey);

      // 다음 단계 아이콘 소유권 부여
      await tx.userIconOwnership.create({
        data: {
          userId,
          iconId: nextIcon.id,
        },
      });

      // 자동 장착
      await tx.user.update({
        where: { id: userId },
        data: { equippedIconId: nextIcon.id },
      });
    });

    return NextResponse.json(
      {
        ok: true,
        message: `Phoenix Stage ${nextStage}로 진화했습니다!`,
        icon: {
          id: nextIcon.id,
          iconKey: nextIcon.iconKey,
          name: nextIcon.name,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Icons Evolve] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

