"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { getLevel } from "@/lib/level";
import { canSendMessage } from "@/lib/permissions";

interface SendMessageButtonProps {
  receiverId: string;
  receiverName?: string | null;
  senderPoints?: number;
  threadId?: string; // 답장인 경우 기존 threadId
  className?: string;
}

/**
 * 메시지 전송 버튼 컴포넌트
 * 
 * - 모든 로그인 사용자에게 보임
 * - Lv.3 미만 사용자에게는 비활성화
 * - 비활성화 시 툴팁 표시
 */
export default function SendMessageButton({
  receiverId,
  receiverName,
  senderPoints = 0,
  threadId,
  className = "",
}: SendMessageButtonProps) {
  const { data: session } = useSession();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!session?.user) {
    return null;
  }

  const senderId = (session.user as any).id as string;
  const senderLevel = getLevel(senderPoints);
  const canSend = canSendMessage(senderLevel);
  const isAdmin = (session.user as any).role === "admin";

  // 자기 자신에게는 메시지를 보낼 수 없음
  if (senderId === receiverId) {
    return null;
  }

  // 관리자는 레벨 제한 없이 메시지 전송 가능
  const isEnabled = isAdmin || canSend;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          threadId: threadId || undefined, // 답장인 경우 threadId 전달
          title: title.trim() || null,
          content: content.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "메시지 전송에 실패했습니다.");
      }

      setSuccess(true);
      setTitle("");
      setContent("");
      
      // 1초 후 다이얼로그 닫기
      setTimeout(() => {
        setIsDialogOpen(false);
        setSuccess(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message ?? "메시지 전송 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => {
            if (isEnabled) {
              setIsDialogOpen(true);
            }
          }}
          disabled={!isEnabled}
          onMouseEnter={() => !isEnabled && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isEnabled
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          } ${className}`}
        >
          메시지 보내기
        </button>

        {/* 툴팁 */}
        {!isEnabled && showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50">
            Messaging is available from Lv.3.
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </div>
        )}
      </div>

      {/* 메시지 전송 다이얼로그 */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">메시지 보내기</h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setTitle("");
                    setContent("");
                    setError(null);
                    setSuccess(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 text-sm text-muted-foreground">
                받는 사람: <span className="font-medium">{receiverName ?? "알 수 없음"}</span>
              </div>

              {success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md text-sm">
                  메시지가 성공적으로 전송되었습니다.
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="message-title" className="block text-sm font-medium mb-1">
                    제목 (선택)
                  </label>
                  <input
                    type="text"
                    id="message-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    placeholder="메시지 제목 (선택사항)"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label htmlFor="message-content" className="block text-sm font-medium mb-1">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background min-h-[120px] resize-y"
                    placeholder="메시지 내용을 입력하세요"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setTitle("");
                      setContent("");
                      setError(null);
                      setSuccess(false);
                    }}
                    className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
                    disabled={submitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={submitting || !content.trim()}
                  >
                    {submitting ? "전송 중..." : "전송"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

