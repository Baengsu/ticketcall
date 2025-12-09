// C:\ticketcall\app\api\board\pin\route.ts
// app/api/board/pin/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 관리자만 허용
  if (user.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "관리자만 공지를 고정/해제할 수 있습니다." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const postId = body.postId as number | undefined;
    const isPinned = body.isPinned as boolean | undefined;

    if (!postId || typeof isPinned !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "postId와 isPinned(boolean)가 필요합니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isPinned },
    });

    return NextResponse.json(
      {
        ok: true,
        postId: updated.id,
        isPinned: updated.isPinned,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("pin toggle error", error);
    return NextResponse.json(
      { ok: false, message: "공지 고정/해제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
