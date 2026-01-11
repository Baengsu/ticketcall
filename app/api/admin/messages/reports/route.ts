/**
 * 관리자 메시지 신고 조회 API
 * 
 * 관리자가 모든 메시지 신고를 조회할 수 있습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/messages/reports
 * 메시지 신고 목록 조회 (관리자 전용)
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
    const offset = Number(req.nextUrl.searchParams.get("offset") || 0);

    // 모든 메시지 신고 조회
    const reports = await prisma.messageReport.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            nickname: true,
            username: true,
          },
        },
        message: {
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
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ ok: true, reports }, { status: 200 });
  } catch (err: any) {
    console.error("[Admin Message Reports GET] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}



