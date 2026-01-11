/**
 * 메시지 수신 UI 페이지
 * 
 * 레벨 제한 없이 모든 로그인 사용자가 접근 가능합니다.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import MessagesList from "@/components/messages/messages-list";
import BlockedUsersManager from "@/components/messages/blocked-users-manager";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.id) {
    redirect("/auth/login");
  }

  const userId = user.id as string;

  // 현재 사용자 포인트 조회 (신고 권한 체크용)
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  const currentUserPoints = currentUser?.points ?? 0;

  // 받은 메시지 조회 (소프트 삭제되지 않은 메시지만, threadId 포함)
  const receivedMessages = await prisma.message.findMany({
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
    },
    orderBy: { createdAt: "asc" }, // 스레드 내에서 시간순 정렬 (평면 리스트)
  });

  // 보낸 메시지 조회 (소프트 삭제되지 않은 메시지만, threadId 포함)
  const sentMessages = await prisma.message.findMany({
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
    },
    orderBy: { createdAt: "asc" }, // 스레드 내에서 시간순 정렬 (평면 리스트)
  });

  // threadId별로 그룹화
  const receivedThreadsMap = new Map<string, typeof receivedMessages>();
  receivedMessages.forEach((msg) => {
    if (!receivedThreadsMap.has(msg.threadId)) {
      receivedThreadsMap.set(msg.threadId, []);
    }
    receivedThreadsMap.get(msg.threadId)!.push(msg);
  });

  const sentThreadsMap = new Map<string, typeof sentMessages>();
  sentMessages.forEach((msg) => {
    if (!sentThreadsMap.has(msg.threadId)) {
      sentThreadsMap.set(msg.threadId, []);
    }
    sentThreadsMap.get(msg.threadId)!.push(msg);
  });

  // 각 스레드의 최신 메시지 시간 기준으로 정렬
  const receivedThreads = Array.from(receivedThreadsMap.entries())
    .map(([threadId, msgs]) => ({
      threadId,
      messages: msgs,
      lastMessageAt: msgs[msgs.length - 1].createdAt,
    }))
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

  const sentThreads = Array.from(sentThreadsMap.entries())
    .map(([threadId, msgs]) => ({
      threadId,
      messages: msgs,
      lastMessageAt: msgs[msgs.length - 1].createdAt,
    }))
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

  const unreadCount = receivedMessages.filter((m) => !m.isRead).length;

  return (
    <main className="container mx-auto py-10 space-y-6 max-w-4xl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">메시지</h1>
        <p className="text-sm text-muted-foreground">
          받은 메시지와 보낸 메시지를 확인할 수 있습니다.
          {unreadCount > 0 && (
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
              읽지 않은 메시지 {unreadCount}개
            </span>
          )}
        </p>
      </header>

      {/* 받은 메시지 (Inbox) 및 보낸 메시지 (Sent) 탭으로 구성 */}
      <MessagesList
        receivedThreads={receivedThreads}
        sentThreads={sentThreads}
        currentUserId={userId}
        currentUserPoints={currentUserPoints}
      />

      <div className="mt-8 pt-8 border-t">
        <BlockedUsersManager currentUserId={userId} />
      </div>
    </main>
  );
}

