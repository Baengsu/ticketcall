// components/board/new-post-form.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RichTextEditor from "./rich-text-editor";
import { sanitizeForStorage } from "@/lib/html-sanitize";

interface NewPostFormProps {
  slug: string;
  mode?: "create" | "edit";
  postId?: number;
  initialTitle?: string;
  initialContent?: string;
}

export default function NewPostForm({
  slug,
  mode = "create",
  postId,
  initialTitle,
  initialContent,
}: NewPostFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState(initialTitle ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  // SSR 때 받은 초기값과 클라이언트 마운트 후 동기화
  useEffect(() => {
    if (initialTitle !== undefined) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // 로그인 안 되어 있으면 안내
  if (status === "unauthenticated") {
    return (
      <div className="p-4 border rounded-md bg-muted/40 text-sm">
        글을 작성하려면 먼저 로그인해 주세요.
      </div>
    );
  }

  // HTML에서 실제 텍스트만 추출하여 검증
  function getTextFromHtml(html: string): string {
    if (!html || typeof window === "undefined") {
      // SSR 환경에서는 간단한 정규식으로 처리
      return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    }
    // HTML 태그 제거 및 엔티티 디코딩
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || "").trim();
  }

  // 제목 검증
  function validateTitle(title: string): string | null {
    const trimmed = title.trim();
    if (!trimmed) {
      return "제목을 입력해 주세요.";
    }
    if (trimmed.length > 200) {
      return "제목은 200자 이하여야 합니다.";
    }
    return null;
  }

  // 내용 검증
  function validateContent(content: string): string | null {
    const textContent = getTextFromHtml(content);
    if (!textContent.trim()) {
      return "내용을 입력해 주세요.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setTitleError(null);
    setContentError(null);

    // 개별 필드 검증
    const titleErr = validateTitle(title);
    const contentErr = validateContent(content);

    if (titleErr) {
      setTitleError(titleErr);
    }
    if (contentErr) {
      setContentError(contentErr);
    }

    if (titleErr || contentErr) {
      return;
    }

    setLoading(true);
    try {
      const isEdit = mode === "edit";

      // Sanitize HTML content before sending to server
      // This provides an additional layer of security
      // (Server will also sanitize, but defense in depth is best practice)
      const sanitizedContent = sanitizeForStorage(content);

      const res = await fetch(`/api/board/${slug}/posts`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { postId, title, content: sanitizedContent }
            : { title, content: sanitizedContent }
        ),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "요청 처리에 실패했습니다.");
      }

      // 성공하면 해당 게시판 목록 or 상세로 이동
      if (isEdit && postId != null) {
        router.push(`/board/${slug}/${postId}`);
      } else {
        router.push(`/board/${slug}`);
      }
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
        <label className="text-sm font-medium">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/40 ${
            titleError ? "border-red-500 focus:ring-red-500/40" : ""
          }`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError(null);
          }}
          maxLength={200}
          placeholder="제목을 입력하세요"
        />
        {titleError && (
          <p className="text-xs text-red-500 mt-1">{titleError}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {title.length}/200자
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          내용 <span className="text-red-500">*</span>
        </label>
        <RichTextEditor
          content={content}
          onChange={(html) => {
            setContent(html);
            if (contentError) setContentError(null);
          }}
          placeholder="내용을 입력하세요..."
          hasError={!!contentError}
        />
        {contentError && (
          <p className="text-xs text-red-500 mt-1">{contentError}</p>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-red-500 whitespace-pre-line">{errorMsg}</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-red-500">*</span> 필수 입력 항목
        </p>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60 hover:bg-black/90 transition-colors"
        >
          {loading
            ? mode === "edit"
              ? "수정 중..."
              : "작성 중..."
            : mode === "edit"
            ? "수정 완료"
            : "등록"}
        </button>
      </div>
    </form>
  );
}
