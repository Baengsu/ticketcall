/**
 * 관리자 메시지 조회 API
 * 
 * 관리자는 모든 메시지에 접근 가능 (소프트 삭제된 메시지 포함)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/messages
 * 관리자용 메시지 목록 조회 (모든 메시지, 삭제된 메시지 포함)
 */
export async function GET(req: NextRequest) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status }
      );
    }

    const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
    const senderId = req.nextUrl.searchParams.get("senderId");
    const receiverId = req.nextUrl.searchParams.get("receiverId");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    // 관리자는 모든 메시지 조회 가능 (소프트 삭제된 메시지 포함)
    const where: any = {};
    if (senderId) {
      where.senderId = senderId;
    }
    if (receiverId) {
      where.receiverId = receiverId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // endDate의 다음 날 00:00:00까지 포함하기 위해 하루를 더함
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lte = end;
      }
    }

    const messages = await prisma.message.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, messages }, { status: 200 });
  } catch (err: any) {
    console.error("[Admin Messages GET] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

