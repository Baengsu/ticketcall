/**
 * 메시지 신고 API
 * POST /api/messages/report
 * 
 * Body: { messageId: string, reason: string }
 * 
 * 규칙:
 * - 한 사용자가 한 메시지에 대해 한 번만 신고 가능
 * - 신고는 포인트에 영향 없음
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. 세션 확인 (로그인 필수)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const reporterId = (session.user as any).id as string | undefined;
    if (!reporterId) {
      return NextResponse.json(
        { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
        { status: 401 }
      );
    }

    // 2. 요청 바디 파싱
    const body = await req.json().catch(() => null);
    const messageId = body?.messageId as string | undefined;
    const reason = body?.reason as string | undefined;

    // 3. 입력 검증
    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json(
        { ok: false, message: "메시지 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "신고 사유를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 4. 메시지 존재 확인
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { ok: false, message: "메시지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 5. 자기 자신의 메시지는 신고할 수 없음 (선택적, 필요시 주석 해제)
    // if (message.senderId === reporterId) {
    //   return NextResponse.json(
    //     { ok: false, message: "자신이 보낸 메시지는 신고할 수 없습니다." },
    //     { status: 400 }
    //   );
    // }

    // 6. 이미 신고했는지 확인 (한 사용자가 한 메시지에 대해 한 번만 신고 가능)
    const existingReport = await prisma.messageReport.findUnique({
      where: {
        reporterId_messageId: {
          reporterId,
          messageId,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          ok: false,
          message: "이미 신고한 메시지입니다. 한 사용자는 한 메시지에 대해 한 번만 신고할 수 있습니다.",
        },
        { status: 409 }
      );
    }

    // 7. 신고 생성 (포인트 영향 없음 - addPoints 호출하지 않음)
    await prisma.messageReport.create({
      data: {
        reporterId,
        messageId,
        reason: reason.trim(),
      },
    });

    return NextResponse.json(
      { ok: true, message: "메시지 신고가 접수되었습니다." },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[MessageReport] Error:", err);

    // 복합 키 중복 오류 처리 (이미 신고한 경우)
    if (err.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          message: "이미 신고한 메시지입니다. 한 사용자는 한 메시지에 대해 한 번만 신고할 수 있습니다.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}





