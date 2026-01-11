/**
 * 관리자 메시지 신고 관리 페이지
 * 
 * 관리자가 모든 메시지 신고를 조회하고 처리할 수 있습니다.
 * 메시지 내용은 편집할 수 없습니다 (읽기 전용).
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface MessageReport {
  id: string;
  createdAt: Date;
  reason: string;
  reporter: {
    id: string;
    name: string | null;
    email: string | null;
    nickname: string | null;
    username: string | null;
  };
  message: {
    id: string;
    threadId: string;
    title: string | null;
    content: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string | null;
      email: string | null;
      nickname: string | null;
      username: string | null;
    };
    receiver: {
      id: string;
      name: string | null;
      email: string | null;
      nickname: string | null;
      username: string | null;
    };
  };
}

export default function AdminMessageReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);

  // 클라이언트 사이드 권한 체크 (추가 보안)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (session?.user && (session.user as any).role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState<string | null>(null);
  const [blockUntil, setBlockUntil] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/admin/messages/reports");
      const data = await res.json();
      if (data.ok) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (threadId: string) => {
    if (selectedThreadId === threadId) {
      setSelectedThreadId(null);
      setThreadMessages([]);
      return;
    }

    setLoadingThread(true);
    setSelectedThreadId(threadId);
    try {
      const res = await fetch(`/api/admin/messages/thread/${threadId}`);
      const data = await res.json();
      if (data.ok) {
        setThreadMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch thread", err);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!blockReason.trim()) {
      setBlockError("차단 사유를 입력해 주세요.");
      return;
    }

    setBlockingUserId(userId);
    setBlockError(null);

    try {
      const res = await fetch("/api/admin/messages/block-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          blockedUntil: blockUntil || "permanent",
          reason: blockReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "차단 처리에 실패했습니다.");
      }

      alert("사용자가 차단되었습니다.");
      setShowBlockDialog(null);
      setBlockUntil("");
      setBlockReason("");
      setBlockError(null);
    } catch (err: any) {
      setBlockError(err.message ?? "차단 처리 중 오류가 발생했습니다.");
    } finally {
      setBlockingUserId(null);
    }
  };

  const getDisplayName = (user: {
    name: string | null;
    email: string | null;
    nickname: string | null;
    username: string | null;
  }): string => {
    return user.nickname || user.username || user.name || user.email?.split("@")[0] || "알 수 없음";
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto py-10 space-y-6">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">메시지 신고 관리</h1>
        <p className="text-sm text-muted-foreground">
          모든 메시지 신고를 조회하고 처리할 수 있습니다. 메시지 내용은 편집할 수 없습니다.
        </p>
      </header>

      {/* 신고 목록 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">신고 목록 ({reports.length}개)</h2>
        <div className="border rounded-lg overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              신고된 메시지가 없습니다.
            </div>
          ) : (
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">신고자:</span>
                        <span className="font-medium text-sm">
                          {getDisplayName(report.reporter)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-muted-foreground">신고 사유:</span>
                        <p className="text-sm mt-1">{report.reason}</p>
                      </div>
                      <div className="border rounded p-3 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">발신자:</span>
                          <span className="font-medium text-sm">
                            {getDisplayName(report.message.sender)}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs text-muted-foreground">수신자:</span>
                          <span className="font-medium text-sm">
                            {getDisplayName(report.message.receiver)}
                          </span>
                        </div>
                        {report.message.title && (
                          <h4 className="font-semibold text-sm mb-1">{report.message.title}</h4>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{report.message.content}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => fetchThread(report.message.threadId)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {selectedThreadId === report.message.threadId
                              ? "스레드 닫기"
                              : "전체 스레드 보기"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBlockDialog(report.message.sender.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            발신자 차단
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 스레드 메시지 목록 */}
                  {selectedThreadId === report.message.threadId && (
                    <div className="ml-4 border-l-2 pl-4 space-y-2">
                      {loadingThread ? (
                        <p className="text-xs text-muted-foreground">로딩 중...</p>
                      ) : (
                        threadMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="border rounded p-2 bg-muted/20 text-sm"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {getDisplayName(msg.sender)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleString("ko-KR", {
                                  timeZone: "Asia/Seoul",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {msg.title && (
                              <h5 className="font-semibold text-xs mb-1">{msg.title}</h5>
                            )}
                            <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 발신자 차단 다이얼로그 */}
      {showBlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">발신자 차단</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowBlockDialog(null);
                    setBlockUntil("");
                    setBlockReason("");
                    setBlockError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {blockError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                  {blockError}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="block-until" className="block text-sm font-medium mb-1">
                  차단 종료 시간
                </label>
                <select
                  id="block-until"
                  value={blockUntil}
                  onChange={(e) => setBlockUntil(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background mb-2"
                >
                  <option value="permanent">영구 차단</option>
                  <option value="">일시 차단 (날짜 선택)</option>
                </select>
                {blockUntil === "" && (
                  <input
                    type="datetime-local"
                    onChange={(e) => setBlockUntil(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="block-reason" className="block text-sm font-medium mb-1">
                  차단 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="block-reason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background min-h-[100px] resize-y"
                  placeholder="차단 사유를 입력하세요"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowBlockDialog(null);
                    setBlockUntil("");
                    setBlockReason("");
                    setBlockError(null);
                  }}
                  className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
                  disabled={blockingUserId !== null}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockUser(showBlockDialog)}
                  disabled={blockingUserId !== null || !blockReason.trim()}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {blockingUserId !== null ? "차단 중..." : "차단하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

