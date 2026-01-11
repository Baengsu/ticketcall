/**
 * 메시지 개별 조회/수정 API
 * 
 * PUT /api/messages/[messageId] - 메시지 읽음 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    messageId: string;
  }>;
}

/**
 * PUT /api/messages/[messageId]
 * 메시지 읽음 처리
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;
    const { messageId } = await context.params;

    // 메시지 조회 및 권한 확인 (수신자만 읽음 처리 가능)
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, receiverId: true, isRead: true },
    });

    if (!message) {
      return NextResponse.json(
        { ok: false, message: "메시지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (message.receiverId !== userId) {
      return NextResponse.json(
        { ok: false, message: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 읽음 처리
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true, message: updated }, { status: 200 });
  } catch (err: any) {
    console.error("[Messages PUT] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

