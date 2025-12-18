import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 찜하기 추가/삭제
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const eventId = body.eventId as string | undefined;

    if (!eventId) {
      return NextResponse.json(
        { ok: false, message: "eventId가 필요합니다." },
        { status: 400 }
      );
    }

    // 이미 찜한 항목인지 확인
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
    });

    if (existing) {
      // 이미 찜한 경우 삭제
      await prisma.favorite.delete({
        where: {
          id: existing.id,
        },
      });

      return NextResponse.json({ ok: true, isFavorite: false });
    } else {
      // 찜하기 추가
      await prisma.favorite.create({
        data: {
          userId: user.id,
          eventId,
        },
      });

      return NextResponse.json({ ok: true, isFavorite: true });
    }
  } catch (error) {
    console.error("Favorite toggle error:", error);
    return NextResponse.json(
      { ok: false, message: "찜하기 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 찜한 목록 조회
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, favorites: [] },
      { status: 401 }
    );
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: user.id,
      },
      select: {
        eventId: true,
      },
    });

    const eventIds = favorites.map((f) => f.eventId);

    return NextResponse.json({ ok: true, favorites: eventIds });
  } catch (error) {
    console.error("Get favorites error:", error);
    return NextResponse.json(
      { ok: false, favorites: [] },
      { status: 500 }
    );
  }
}
