import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 특정 이벤트의 찜하기 상태 확인
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { ok: false, isFavorite: false },
      { status: 400 }
    );
  }

  if (!user?.id) {
    return NextResponse.json({ ok: true, isFavorite: false });
  }

  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      isFavorite: !!favorite,
    });
  } catch (error) {
    console.error("Check favorite error:", error);
    return NextResponse.json(
      { ok: false, isFavorite: false },
      { status: 500 }
    );
  }
}
