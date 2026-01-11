// 29.2 components/messages/messages-list.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import SendMessageButton from "./send-message-button";
import { getLevel } from "@/lib/level";
import { canReportPost } from "@/lib/permissions";
import { apiJson } from "@/lib/api-client";
import { VirtualList } from "@/components/ui/virtual-list";

interface Message {
  id: string;
  threadId: string;
  title: string | null;
  content: string;
  isRead: boolean;
  createdAt: Date;
  sender?: {
    id: string;
    name: string | null;
    email: string | null;
    nickname: string | null;
    username: string | null;
  } | null;
  receiver?: {
    id: string;
    name: string | null;
    email: string | null;
    nickname: string | null;
    username: string | null;
  } | null;
}

interface Thread {
  threadId: string;
  messages: Message[];
  lastMessageAt: Date;
}

interface MessagesListProps {
  receivedThreads: Thread[];
  sentThreads: Thread[];
  currentUserId: string;
  currentUserPoints?: number;
}

export default function MessagesList({
  receivedThreads,
  sentThreads,
  currentUserId,
  currentUserPoints = 0,
}: MessagesListProps) {
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);

  // Local state (avoid router.refresh)
  const [received, setReceived] = useState<Thread[]>(receivedThreads);
  const [sent, setSent] = useState<Thread[]>(sentThreads);

  // keep in sync when server props change (navigation)
  useEffect(() => setReceived(receivedThreads), [receivedThreads]);
  useEffect(() => setSent(sentThreads), [sentThreads]);

  // throttle: mark-notifications-read only once per thread open
  const markedThreadsRef = useRef<Set<string>>(new Set());

  const currentUserLevel = session?.user ? getLevel(currentUserPoints) : 0;
  const canReport =
    canReportPost(currentUserLevel) ||
    Boolean((session?.user as any)?.isAdmin) ||
    (session?.user as any)?.role === "ADMIN";

  const getDisplayName = (user: {
    name?: string | null;
    email?: string | null;
    nickname?: string | null;
    username?: string | null;
  }): string => {
    return (
      user.nickname ||
      user.username ||
      user.name ||
      user.email?.split("@")[0] ||
      "알 수 없음"
    );
  };

  const receivedUnreadCount = useMemo(() => {
    return received.reduce(
      (count, thread) =>
        count +
        thread.messages.filter(
          (m) => !m.isRead && m.receiver?.id === currentUserId
        ).length,
      0
    );
  }, [received, currentUserId]);

  function removeMessageFromThreads(list: Thread[], messageId: string) {
    const next: Thread[] = [];

    for (const t of list) {
      const msgs = t.messages.filter((m) => m.id !== messageId);
      if (msgs.length === 0) continue;

      // recompute lastMessageAt from last message
      const last = msgs[msgs.length - 1];
      const lastAt = new Date((last as any).createdAt);

      next.push({
        ...t,
        messages: msgs,
        lastMessageAt: lastAt as any,
      });
    }

    return next;
  }

  function markReadInThreads(list: Thread[], messageId: string) {
    return list.map((t) => ({
      ...t,
      messages: t.messages.map((m) =>
        m.id === messageId ? { ...m, isRead: true } : m
      ),
    }));
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm("정말 이 메시지를 삭제하시겠습니까?")) return;

    setDeletingId(messageId);

    try {
      await apiJson<{ ok: true }>(`/api/messages/${messageId}/delete`, {
        method: "DELETE",
      });

      // update local lists (no refresh)
      setReceived((prev) => removeMessageFromThreads(prev, messageId));
      setSent((prev) => removeMessageFromThreads(prev, messageId));
    } catch (err: any) {
      alert(err.message ?? "메시지 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await apiJson<{ ok: true }>(`/api/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      // update local state (no refresh)
      setReceived((prev) => markReadInThreads(prev, messageId));
      setSent((prev) => markReadInThreads(prev, messageId));
    } catch (err: any) {
      console.error("Mark as read error:", err);
    }
  };

  const handleReport = async (messageId: string) => {
    if (!reportReason.trim()) {
      setReportError("신고 사유를 입력해 주세요.");
      return;
    }

    setReportingId(messageId);
    setReportError(null);

    try {
      await apiJson<{ ok: true }>("/api/messages/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          reason: reportReason.trim(),
        }),
      });

      alert("메시지 신고가 접수되었습니다.");
      setShowReportDialog(null);
      setReportReason("");
      setReportError(null);
    } catch (err: any) {
      setReportError(err.message ?? "신고 처리 중 오류가 발생했습니다.");
    } finally {
      setReportingId(null);
    }
  };

  const handleBlock = async (blockedUserId: string | undefined) => {
    if (!blockedUserId) return;
    if (
      !confirm(
        "사용자를 차단하시겠습니까? 차단된 사용자는 당신에게 메시지를 보낼 수 없습니다."
      )
    )
      return;

    try {
      await apiJson<{ ok: true }>("/api/messages/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedUserId }),
      });

      alert("사용자가 차단되었습니다.");
      // update local state to remove blocked user's threads
      setReceived((prev) =>
        prev.filter(
          (t) => t.messages[0]?.sender?.id !== blockedUserId
        )
      );
    } catch (err: any) {
      alert(err.message || "차단에 실패했습니다.");
    }
  };

  const renderThread = (thread: Thread, isReceived: boolean) => {
    const isSelected = selectedThreadId === thread.threadId;
    const otherUser = isReceived
      ? thread.messages[0]?.sender
      : thread.messages[0]?.receiver;

    // throttle: mark notifications read only once per thread
    const handleThreadOpen = async () => {
      if (isSelected || markedThreadsRef.current.has(thread.threadId)) return;

      markedThreadsRef.current.add(thread.threadId);

      try {
        await apiJson<{ ok: true }>("/api/messages/mark-notifications-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: thread.threadId }),
        });
      } catch (err) {
        console.error("Failed to mark notifications as read:", err);
        markedThreadsRef.current.delete(thread.threadId);
      }
    };

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* 스레드 헤더 */}
        <div
          className="p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => {
            setSelectedThreadId(isSelected ? null : thread.threadId);
            if (!isSelected) {
              handleThreadOpen();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {otherUser ? getDisplayName(otherUser) : "알 수 없음"}
              </span>
              <span className="text-xs text-muted-foreground">
                {thread.messages.length}개의 메시지
              </span>
              {isReceived &&
                thread.messages.some(
                  (m) => !m.isRead && m.receiver?.id === currentUserId
                ) && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                    새 메시지
                  </span>
                )}
            </div>
            <span className="text-xs text-muted-foreground">
              {thread.lastMessageAt.toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* 스레드 메시지 목록 (평면 리스트) */}
        {isSelected && (
          <div className="p-4 space-y-3 bg-card">
            {thread.messages.map((message) => {
              const isFromMe = message.sender?.id === currentUserId;
              const isUnread =
                !message.isRead && message.receiver?.id === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex flex-col gap-1 ${
                    isFromMe ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isFromMe
                        ? "bg-blue-600 text-white"
                        : isUnread
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        : "bg-muted"
                    }`}
                  >
                    {message.title && (
                      <h4 className="font-semibold text-sm mb-1">
                        {message.title}
                      </h4>
                    )}
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs ${
                          isFromMe
                            ? "text-blue-100"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!isFromMe && !message.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(message.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          읽음 처리
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isFromMe && (
                      <>
                        <SendMessageButton
                          receiverId={message.sender?.id || ""}
                          receiverName={getDisplayName(
                            message.sender || {
                              name: null,
                              email: null,
                              nickname: null,
                              username: null,
                            }
                          )}
                          senderPoints={0}
                          threadId={message.threadId}
                          className="text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleBlock(message.sender?.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          차단
                        </button>
                      </>
                    )}
                    {canReport && !isFromMe && (
                      <button
                        type="button"
                        onClick={() => setShowReportDialog(message.id)}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        신고
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(message.id)}
                      disabled={deletingId === message.id}
                      className="text-xs text-red-600 hover:underline disabled:opacity-60"
                    >
                      {deletingId === message.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 탭 메뉴 */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => {
            setActiveTab("received");
            setSelectedThreadId(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "received"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          받은 메시지
          {receivedUnreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
              {receivedUnreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("sent");
            setSelectedThreadId(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "sent"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          보낸 메시지
        </button>
      </div>

      {/* 스레드 목록 */}
      <div className="space-y-3">
        {activeTab === "received" ? (
          received.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              받은 메시지가 없습니다.
            </div>
          ) : (
            <VirtualList
              items={received}
              estimateSize={120}
              height="65vh"
              overscan={10}
              itemKey={(t) => t.threadId}
              renderRow={(thread) => (
                <div className="pb-3">{renderThread(thread, true)}</div>
              )}
            />
          )
        ) : sent.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            보낸 메시지가 없습니다.
          </div>
        ) : (
          <VirtualList
            items={sent}
            estimateSize={120}
            height="65vh"
            overscan={10}
            itemKey={(t) => t.threadId}
            renderRow={(thread) => (
              <div className="pb-3">{renderThread(thread, false)}</div>
            )}
          />
        )}
      </div>

      {/* 신고 다이얼로그 */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">메시지 신고</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportDialog(null);
                    setReportReason("");
                    setReportError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {reportError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                  {reportError}
                </div>
              )}

              <div className="mb-4">
                <label
                  htmlFor="report-reason"
                  className="block text-sm font-medium mb-1"
                >
                  신고 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background min-h-[120px] resize-y"
                  placeholder="신고 사유를 입력하세요"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportDialog(null);
                    setReportReason("");
                    setReportError(null);
                  }}
                  className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
                  disabled={reportingId !== null}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => handleReport(showReportDialog)}
                  disabled={reportingId !== null || !reportReason.trim()}
                  className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {reportingId !== null ? "신고 중..." : "신고하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
