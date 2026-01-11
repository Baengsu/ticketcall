/**
 * 메시지 API
 * 
 * 규칙:
 * - 수신: 인증된 모든 사용자 가능 (레벨 제한 없음)
 * - 전송: Lv.3 이상만 가능 (서버에서 강제 검증)
 * - 포인트 영향 없음
 * - 모든 메시지는 저장되어 감사 가능
 * - 첨부파일: 이미지(JPG, PNG, WebP, GIF) 및 PDF 지원, 최대 5MB
 * - 첨부파일은 전송 후 읽기 전용 (수정 불가)
 * 
 * 서버 검증 (모든 검증은 서버에서 강제):
 * - 레벨 체크: Lv.3+ 필요 (관리자 제외)
 * - Rate limits: Lv.3-4는 10초당 1개, Lv.5+는 제한 없음
 * - 차단 규칙: 수신자가 발신자를 차단한 경우 메시지 전송 불가
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getLevel } from "@/lib/level";
import redis from "@/lib/redis";

/**
 * GET /api/messages
 * 메시지 목록 조회 (받은 메시지, 보낸 메시지)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;
    const type = req.nextUrl.searchParams.get("type") || "received"; // "received" | "sent"

    if (type === "received") {
      // 받은 메시지 조회 (수신자는 레벨 체크 없음)
      // threadId 기준으로 그룹화하여 대화별로 반환
      const messages = await prisma.message.findMany({
        where: {
          receiverId: userId,
          deletedByReceiverAt: null, // 수신자가 삭제하지 않은 메시지만
        },
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
          attachments: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" }, // 스레드 내에서 시간순 정렬 (평면 리스트)
      });

      // threadId별로 그룹화 (평면 리스트 - 중첩 없음)
      const threadsMap = new Map<string, typeof messages>();
      messages.forEach((msg) => {
        if (!threadsMap.has(msg.threadId)) {
          threadsMap.set(msg.threadId, []);
        }
        threadsMap.get(msg.threadId)!.push(msg);
      });

      // 각 스레드의 최신 메시지 시간 기준으로 정렬
      const threads = Array.from(threadsMap.entries())
        .map(([threadId, msgs]) => ({
          threadId,
          messages: msgs,
          lastMessageAt: msgs[msgs.length - 1].createdAt,
        }))
        .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

      return NextResponse.json({ ok: true, threads }, { status: 200 });
    } else if (type === "sent") {
      // 보낸 메시지 조회 (발신자가 삭제하지 않은 메시지만)
      // threadId 기준으로 그룹화하여 대화별로 반환
      const messages = await prisma.message.findMany({
        where: {
          senderId: userId,
          deletedBySenderAt: null, // 발신자가 삭제하지 않은 메시지만
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              nickname: true,
              username: true,
            },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" }, // 스레드 내에서 시간순 정렬 (평면 리스트)
      });

      // threadId별로 그룹화 (평면 리스트 - 중첩 없음)
      const threadsMap = new Map<string, typeof messages>();
      messages.forEach((msg) => {
        if (!threadsMap.has(msg.threadId)) {
          threadsMap.set(msg.threadId, []);
        }
        threadsMap.get(msg.threadId)!.push(msg);
      });

      // 각 스레드의 최신 메시지 시간 기준으로 정렬
      const threads = Array.from(threadsMap.entries())
        .map(([threadId, msgs]) => ({
          threadId,
          messages: msgs,
          lastMessageAt: msgs[msgs.length - 1].createdAt,
        }))
        .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

      return NextResponse.json({ ok: true, threads }, { status: 200 });
    } else {
      return NextResponse.json(
        { ok: false, message: "잘못된 타입입니다." },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("[Messages GET] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * 메시지 전송
 * 
 * Body: { 
 *   receiverId: string, 
 *   content: string,
 *   title?: string,
 *   threadId?: string,
 *   attachments?: Array<{ url: string, fileName: string, fileSize: number }>
 * }
 * 
 * 첨부파일은 먼저 /api/messages/upload로 업로드한 후, 
 * 반환된 정보를 attachments 배열에 포함하여 전송합니다.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 인증 확인 (Sender must be authenticated)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const senderId = (session.user as any).id as string;

    // 2. 발신자 정보 조회 (레벨 계산 및 rate limiting을 위해)
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { 
        points: true, 
        role: true, 
        isDisabled: true, 
        messageBlockedUntil: true,
        nickname: true,
        username: true,
        name: true,
        email: true,
      },
    });

    if (!sender) {
      return NextResponse.json(
        { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 3. 발신자가 차단되지 않았는지 확인 (isDisabled 체크)
    if (sender.isDisabled) {
      return NextResponse.json(
        { ok: false, message: "차단된 계정은 메시지를 보낼 수 없습니다." },
        { status: 403 }
      );
    }

    // 3-1. 메시지 전송 일시 차단 확인 (If now < messageBlockedUntil: Reject sending)
    const now = new Date();
    if (sender.messageBlockedUntil && now < sender.messageBlockedUntil) {
      const blockedUntilStr = sender.messageBlockedUntil.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return NextResponse.json(
        {
          ok: false,
          message: `메시지 전송이 일시적으로 차단되었습니다. 차단 해제 시간: ${blockedUntilStr}`,
        },
        { status: 403 }
      );
    }

    // 4. 레벨 체크 (Lv.3+ 필요) - 관리자는 제외
    const isAdmin = sender.role === "admin";
    let senderLevel = 0;
    if (!isAdmin) {
      // 발신자 레벨 계산
      senderLevel = getLevel(sender.points);
      
      // senderLevel < 3 이면 거부
      if (senderLevel < 3) {
        return NextResponse.json(
          {
            ok: false,
            message: "You must be Lv.3 or higher to send messages.",
          },
          { status: 403 }
        );
      }
    } else {
      // 관리자는 레벨 제한 없음 (rate limit도 없음)
      senderLevel = 999; // 관리자는 rate limit 체크를 건너뛰기 위한 값
    }

    // 4-1. Rate limiting 체크 (Lv.3-4: 10초당 1개, Lv.5+: 제한 없음)
    if (!isAdmin && senderLevel >= 3 && senderLevel < 5) {
      // Lv.3-4인 경우 rate limit 적용 (Redis 기반)
      const rateLimitKey = `message:rate-limit:${senderId}`;
      const existingLimit = await redis.get(rateLimitKey);

      if (existingLimit !== null) {
        // rate limit에 걸린 경우
        const lastSentTime = parseInt(existingLimit, 10);
        const timeSinceLastMessage = now.getTime() - lastSentTime;
        const rateLimitSeconds = 10 * 1000; // 10초

        if (timeSinceLastMessage < rateLimitSeconds) {
          const remainingSeconds = Math.ceil((rateLimitSeconds - timeSinceLastMessage) / 1000);
          return NextResponse.json(
            {
              ok: false,
              message: `메시지 전송은 10초에 1회로 제한됩니다. ${remainingSeconds}초 후 다시 시도해 주세요.`,
            },
            { status: 429 } // Too Many Requests
          );
        }
      }
    }
    // Lv.5+ 또는 관리자는 rate limit 없음

    // 5. 요청 본문 파싱

    const body = await req.json().catch(() => null);
    const receiverId = body?.receiverId as string | undefined;
    const content = body?.content as string | undefined;
    const attachments = body?.attachments as Array<{ url: string; fileName: string; fileSize: number }> | undefined;

    // 6. 입력 검증
    if (!receiverId || typeof receiverId !== "string") {
      return NextResponse.json(
        { ok: false, message: "수신자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "메시지 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    // 7. 자기 자신에게 메시지 보내기 방지 (Sender is not sending to themselves)
    if (senderId === receiverId) {
      return NextResponse.json(
        { ok: false, message: "자기 자신에게 메시지를 보낼 수 없습니다." },
        { status: 400 }
      );
    }

    // 8. 수신자 존재 확인 (Receiving users are NOT checked for level)
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { ok: false, message: "수신자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 8-1. 차단 사용자 체크: 수신자가 발신자를 차단했는지 확인
    const isBlocked = await prisma.userMessagePreference.findUnique({
      where: {
        userId_blockedUserId: {
          userId: receiverId,
          blockedUserId: senderId,
        },
      },
    });

    if (isBlocked) {
      return NextResponse.json(
        { ok: false, message: "이 사용자로부터 메시지를 받을 수 없습니다. 차단된 사용자입니다." },
        { status: 403 }
      );
    }

    // 9. threadId 처리: 답장인 경우 기존 threadId 재사용, 새 대화면 새 threadId 생성
    const threadId = body?.threadId as string | undefined;
    let finalThreadId: string;

    if (threadId && typeof threadId === "string") {
      // 답장인 경우: 기존 스레드가 존재하고 해당 스레드에 참여 권한이 있는지 확인
      const existingThread = await prisma.message.findFirst({
        where: {
          threadId,
          OR: [
            { senderId, receiverId }, // 발신자-수신자 조합
            { senderId: receiverId, receiverId: senderId }, // 수신자-발신자 조합 (역방향)
          ],
        },
        select: { id: true },
      });

      if (existingThread) {
        finalThreadId = threadId;
      } else {
        // 잘못된 threadId이면 새 스레드 생성
        const { nanoid } = await import("nanoid");
        finalThreadId = nanoid();
      }
    } else {
      // 새 대화인 경우: 새로운 threadId 생성
      const { nanoid } = await import("nanoid");
      finalThreadId = nanoid();
    }

    // 메시지 생성 (포인트 영향 없음 - addPoints 호출하지 않음)
    const title = body?.title as string | undefined; // 제목은 선택적
    
    // 첨부파일 검증 (있는 경우)
    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        if (!attachment.url || !attachment.fileName || typeof attachment.fileSize !== "number") {
          return NextResponse.json(
            { ok: false, message: "첨부파일 정보가 올바르지 않습니다." },
            { status: 400 }
          );
        }
        // 파일 크기 검증 (5MB 제한)
        if (attachment.fileSize > 5 * 1024 * 1024) {
          return NextResponse.json(
            { ok: false, message: "첨부파일 크기는 5MB를 초과할 수 없습니다." },
            { status: 400 }
          );
        }
      }
    }
    
    const message = await prisma.$transaction(async (tx) => {
      // 메시지 생성
      const createdMessage = await tx.message.create({
        data: {
          senderId,
          receiverId,
          threadId: finalThreadId,
          title: title?.trim() || null,
          content: content.trim(),
        },
      });

      // 첨부파일 생성 (있는 경우)
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        await tx.messageAttachment.createMany({
          data: attachments.map((att) => ({
            messageId: createdMessage.id,
            fileUrl: att.url,
            fileName: att.fileName,
            fileSize: att.fileSize,
          })),
        });
      }

      // MESSAGE_RECEIVED 알림 생성 (포인트 영향 없음)
      const senderName = sender.nickname || sender.username || sender.name || sender.email || "알 수 없음";
      const notificationMessage = title 
        ? `${senderName}님이 "${title}" 메시지를 보냈습니다.`
        : `${senderName}님이 메시지를 보냈습니다.`;
      
      await tx.notification.create({
        data: {
          userId: receiverId,
          type: "MESSAGE_RECEIVED",
          message: notificationMessage,
          read: false,
        },
      });

      // receiver 정보 및 첨부파일 포함하여 반환
      const messageWithReceiver = await tx.message.findUnique({
        where: { id: createdMessage.id },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              nickname: true,
              username: true,
            },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return messageWithReceiver;
    });

    // Rate limiting: Lv.3-4인 경우 Redis에 마지막 전송 시간 저장 (10초 TTL)
    if (!isAdmin && senderLevel >= 3 && senderLevel < 5) {
      const rateLimitKey = `message:rate-limit:${senderId}`;
      await redis.set(rateLimitKey, now.getTime().toString(), 10); // 10초 TTL
    }

    return NextResponse.json(
      { ok: true, message: "메시지가 전송되었습니다.", data: message },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Messages POST] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

