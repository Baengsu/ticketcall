// app/api/messages/mark-notifications-read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/messages/mark-notifications-read
 * 메시지 스레드 열릴 때 해당 스레드의 MESSAGE_RECEIVED 알림을 읽음 처리
 * 
 * Body: { threadId: string }
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
    const threadId = body?.threadId as string | undefined;

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json(
        { ok: false, message: "threadId가 필요합니다." },
        { status: 400 }
      );
    }

    // 해당 스레드의 메시지들 확인
    const messages = await prisma.message.findMany({
      where: {
        threadId,
        receiverId: userId,
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (messages.length === 0) {
      // 스레드가 없거나 접근 권한이 없는 경우
      return NextResponse.json(
        { ok: false, message: "스레드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 해당 스레드의 가장 최근 메시지 시간 이후에 생성된 MESSAGE_RECEIVED 알림을 읽음 처리
    // 스레드가 열렸다는 것은 사용자가 해당 대화를 확인했다는 의미이므로,
    // 해당 스레드의 최근 메시지 이후에 생성된 알림들을 읽음 처리
    const latestMessageTime = messages[0].createdAt;
    
    await prisma.notification.updateMany({
      where: {
        userId,
        type: "MESSAGE_RECEIVED",
        read: false,
        createdAt: {
          gte: latestMessageTime,
        },
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json(
      { ok: true, message: "알림이 읽음 처리되었습니다." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Messages Mark Notifications Read] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

