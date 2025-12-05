// components/board/new-post-form.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface NewPostFormProps {
  slug: string;
}

export default function NewPostForm({ slug }: NewPostFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 로그인 안 되어 있으면 안내
  if (status === "unauthenticated") {
    return (
      <div className="p-4 border rounded-md bg-muted/40 text-sm">
        글을 작성하려면 먼저 로그인해 주세요.
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !content.trim()) {
      setErrorMsg("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/board/${slug}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "글 작성에 실패했습니다.");
      }

      // 성공하면 해당 게시판 목록으로 이동
      router.push(`/board/${slug}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message ?? "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">제목</label>
        <input
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/40"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">내용</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[160px] resize-y focus:outline-none focus:ring focus:ring-primary/40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-500 whitespace-pre-line">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
      >
        {loading ? "작성 중..." : "등록"}
      </button>
    </form>
  );
}
