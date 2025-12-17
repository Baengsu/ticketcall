// components/board/comment-section.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface CommentItem {
  id: number;
  content: string;
  createdAt: string; // ISO string
  authorName: string | null;
  authorEmail: string | null;
}

interface CommentSectionProps {
  postId: number;
  slug: string;
  comments: CommentItem[];
  canWrite: boolean; // 작성 가능 여부 (작성자 + admin)
}

export default function CommentSection({
  postId,
  slug,
  comments: initialComments,
  canWrite,
}: CommentSectionProps) {
  const router = useRouter();
  const [comments] = useState<CommentItem[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!content.trim()) {
      setErrorMsg("댓글 내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/board/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.message ?? "댓글 등록에 실패했습니다.");
      } else {
        setContent("");
        router.refresh(); // 서버 컴포넌트 다시 렌더링 → 최신 댓글 반영
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">댓글</h2>

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="border rounded-md px-3 py-2 text-sm space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {c.authorName ?? c.authorEmail ?? "익명"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {/* 댓글 작성 폼 */}
      {canWrite ? (
        <form onSubmit={handleSubmit} className="space-y-2 mt-4">
          <textarea
            className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
          />
          {errorMsg && (
            <p className="text-xs text-red-500">
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm"
          >
            {submitting ? "등록 중..." : "댓글 등록"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          댓글은 <span className="font-medium">작성자와 관리자만</span> 작성할 수
          있습니다.
        </p>
      )}
    </section>
  );
}
