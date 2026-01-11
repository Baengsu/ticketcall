// app/api/icons/equip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/icons/equip
 * 아이콘 장착
 * 
 * Body: { iconId: string }
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
    const iconId = body?.iconId as string | undefined;

    if (!iconId || typeof iconId !== "string") {
      return NextResponse.json(
        { ok: false, message: "아이콘 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 아이콘 존재 확인
    const icon = await prisma.iconItem.findUnique({
      where: { id: iconId },
    });

    if (!icon) {
      return NextResponse.json(
        { ok: false, message: "아이콘을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 사용자가 해당 아이콘을 소유하고 있는지 확인
    const ownership = await prisma.userIconOwnership.findUnique({
      where: {
        userId_iconId: {
          userId,
          iconId,
        },
      },
    });

    if (!ownership) {
      return NextResponse.json(
        { ok: false, message: "소유하지 않은 아이콘은 장착할 수 없습니다." },
        { status: 403 }
      );
    }

    // 아이콘 장착 (한 번에 하나만 장착 가능)
    await prisma.user.update({
      where: { id: userId },
      data: { equippedIconId: iconId },
    });

    return NextResponse.json(
      { ok: true, message: "아이콘이 장착되었습니다." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Icons Equip] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/icons/equip
 * 아이콘 장착 해제
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;

    // 아이콘 장착 해제
    await prisma.user.update({
      where: { id: userId },
      data: { equippedIconId: null },
    });

    return NextResponse.json(
      { ok: true, message: "아이콘이 해제되었습니다." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Icons Unequip] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

