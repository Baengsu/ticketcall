// app/api/messages/block/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/messages/block
 * 차단된 사용자 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;

    // 차단된 사용자 목록 조회
    const blockedUsers = await prisma.userMessagePreference.findMany({
      where: { userId },
      include: {
        blockedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            nickname: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        ok: true,
        blockedUsers: blockedUsers.map((pref) => ({
          id: pref.id,
          blockedUserId: pref.blockedUserId,
          blockedAt: pref.createdAt,
          user: pref.blockedUser,
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Messages Block GET] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/block
 * 사용자 차단
 * 
 * Body: { blockedUserId: string }
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
    const blockedUserId = body?.blockedUserId as string | undefined;

    if (!blockedUserId || typeof blockedUserId !== "string") {
      return NextResponse.json(
        { ok: false, message: "차단할 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 자기 자신을 차단할 수 없음
    if (userId === blockedUserId) {
      return NextResponse.json(
        { ok: false, message: "자기 자신을 차단할 수 없습니다." },
        { status: 400 }
      );
    }

    // 차단할 사용자가 존재하는지 확인
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true },
    });

    if (!blockedUser) {
      return NextResponse.json(
        { ok: false, message: "차단할 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 차단되어 있는지 확인
    const existingBlock = await prisma.userMessagePreference.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId,
        },
      },
    });

    if (existingBlock) {
      return NextResponse.json(
        { ok: false, message: "이미 차단된 사용자입니다." },
        { status: 400 }
      );
    }

    // 차단 생성
    const block = await prisma.userMessagePreference.create({
      data: {
        userId,
        blockedUserId,
      },
      include: {
        blockedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            nickname: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "사용자가 차단되었습니다.",
        block: {
          id: block.id,
          blockedUserId: block.blockedUserId,
          blockedAt: block.createdAt,
          user: block.blockedUser,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Messages Block POST] Error:", err);
    // Unique constraint violation (이미 차단된 경우)
    if (err.code === "P2002") {
      return NextResponse.json(
        { ok: false, message: "이미 차단된 사용자입니다." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/block
 * 사용자 차단 해제
 * 
 * Body: { blockedUserId: string }
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

    const body = await req.json().catch(() => null);
    const blockedUserId = body?.blockedUserId as string | undefined;

    if (!blockedUserId || typeof blockedUserId !== "string") {
      return NextResponse.json(
        { ok: false, message: "차단 해제할 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 차단 기록 찾기
    const block = await prisma.userMessagePreference.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId,
        },
      },
    });

    if (!block) {
      return NextResponse.json(
        { ok: false, message: "차단된 사용자가 아닙니다." },
        { status: 404 }
      );
    }

    // 차단 해제
    await prisma.userMessagePreference.delete({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId,
        },
      },
    });

    return NextResponse.json(
      { ok: true, message: "차단이 해제되었습니다." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Messages Block DELETE] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

