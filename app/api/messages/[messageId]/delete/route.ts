/**
 * 메시지 소프트 삭제 API
 * 
 * 메시지는 하드 삭제되지 않고 소프트 삭제만 가능
 * 관리자는 항상 모든 메시지를 볼 수 있음
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
 * DELETE /api/messages/[messageId]/delete
 * 메시지 소프트 삭제 (발신자 또는 수신자만 가능)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
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

    // 메시지 조회 및 권한 확인
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        deletedBySenderAt: true,
        deletedByReceiverAt: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { ok: false, message: "메시지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isSender = message.senderId === userId;
    const isReceiver = message.receiverId === userId;

    if (!isSender && !isReceiver) {
      return NextResponse.json(
        { ok: false, message: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 소프트 삭제 처리
    const updateData: any = {};
    if (isSender && !message.deletedBySenderAt) {
      updateData.deletedBySenderAt = new Date();
    }
    if (isReceiver && !message.deletedByReceiverAt) {
      updateData.deletedByReceiverAt = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, message: "이미 삭제된 메시지입니다." },
        { status: 400 }
      );
    }

    await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    return NextResponse.json(
      { ok: true, message: "메시지가 삭제되었습니다." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Messages DELETE] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

