/**
 * 관리자 메시지 스레드 조회 API
 * 
 * 관리자가 특정 스레드의 모든 메시지를 조회할 수 있습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    threadId: string;
  }>;
}

/**
 * GET /api/admin/messages/thread/[threadId]
 * 특정 스레드의 모든 메시지 조회 (관리자 전용)
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status }
      );
    }

    const { threadId } = await context.params;

    // 스레드의 모든 메시지 조회 (소프트 삭제된 메시지 포함)
    const messages = await prisma.message.findMany({
      where: { threadId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            nickname: true,
            username: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            nickname: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "asc" }, // 시간순 정렬 (평면 리스트)
    });

    return NextResponse.json({ ok: true, messages }, { status: 200 });
  } catch (err: any) {
    console.error("[Admin Message Thread GET] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}



