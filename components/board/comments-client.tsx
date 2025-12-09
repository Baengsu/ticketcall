// components/board/comments-client.tsx
"use client";

import { useState, FormEvent } from "react";

interface CommentAuthor {
  id: string;
  name: string | null;
}

export interface CommentItem {
  id: number;
  content: string;
  createdAt: string; // ISO string
  authorId: string;
  author: CommentAuthor | null;
}

interface CommentsClientProps {
  postId: number;
  slug: string;
  isNotice: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  initialComments: CommentItem[];
}

export default function CommentsClient({
  postId,
  slug,
  isNotice,
  currentUserId,
  currentUserRole,
  initialComments,
}: CommentsClientProps) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const isAdmin = currentUserRole === "admin";

  if (isNotice) {
    return (
      <p className="text-sm text-muted-foreground">
        공지사항에는 댓글을 달 수 없습니다.
      </p>
    );
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const content = newContent.trim();
    if (!content) {
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

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "댓글 등록에 실패했습니다.");
      }

      if (data.comment) {
        setComments((prev) => [...prev, data.comment as CommentItem]);
      }
      setNewContent("");
    } catch (err: any) {
      setErrorMsg(err.message ?? "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/board/comment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "댓글 삭제에 실패했습니다.");
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message ?? "알 수 없는 오류가 발생했습니다.");
    }
  };

  const startEdit = (c: CommentItem) => {
    setEditingId(c.id);
    setEditingContent(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editingId == null) return;

    const content = editingContent.trim();
    if (!content) {
      setErrorMsg("수정할 내용을 입력해 주세요.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch("/api/board/comment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: editingId, content }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "댓글 수정에 실패했습니다.");
      }

      if (data.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === editingId ? (data.comment as CommentItem) : c))
        );
      }

      setEditingId(null);
      setEditingContent("");
    } catch (err: any) {
      setErrorMsg(err.message ?? "알 수 없는 오류가 발생했습니다.");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">아직 댓글이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const isAuthor = currentUserId === c.authorId;
            const canEditDelete = isAdmin || isAuthor;

            return (
              <li
                key={c.id}
                className="border rounded-md p-3 text-sm space-y-1"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{c.author?.name ?? "익명"}</span>
                  <span>
                    {c.createdAt.slice(0, 16).replace("T", " ")}
                  </span>
                </div>

                {editingId === c.id ? (
                  <form onSubmit={handleEditSubmit} className="space-y-2 pt-1">
                    <textarea
                      className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      disabled={editSubmitting}
                    />
                    <div className="flex gap-2 text-xs">
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                      >
                        {editSubmitting ? "수정 중..." : "수정 완료"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={editSubmitting}
                        className="px-2 py-1 rounded border"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap pt-1">{c.content}</p>
                    {canEditDelete && (
                      <div className="flex gap-2 pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="px-2 py-1 rounded bg-blue-500 text-white"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 rounded bg-red-500 text-white"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 에러 메시지 */}
      {errorMsg && (
        <p className="text-xs text-red-500 whitespace-pre-line">{errorMsg}</p>
      )}

      {/* 댓글 작성 폼 */}
      {currentUserId ? (
        <form onSubmit={handleCreate} className="space-y-2">
          <textarea
            className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
            placeholder="댓글을 입력하세요."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs disabled:opacity-60"
          >
            {submitting ? "등록 중..." : "댓글 등록"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          댓글을 작성하려면 로그인 해 주세요.
        </p>
      )}
    </div>
  );
}
