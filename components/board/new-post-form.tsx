// components/board/new-post-form.tsx
"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
// HTML sanitization is done on render, not on save

// TEMPORARY: Debug flag to trace HTML content
// Set to false to disable debug logging
const DEBUG_HTML_TRACE = false;

// Dynamically import RichTextEditor with SSR disabled to prevent hydration errors
// This provides an additional layer of protection beyond the component's internal mount gate
const RichTextEditor = dynamic(
  () => import("./rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full border rounded-md">
        <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/30 rounded-t-md">
          <div className="h-8 w-8 bg-muted rounded-md animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded-md animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="w-full px-3 py-2 text-sm min-h-[200px] bg-muted/20 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    ),
  }
);

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
  // Store editor content in ref to avoid re-renders on every keystroke
  const contentRef = useRef<string>(initialContent ?? "");
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

  // Update ref when initialContent changes (for edit mode)
  useEffect(() => {
    if (initialContent !== undefined) {
      contentRef.current = initialContent;
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

    // Read content from ref (not state) to avoid re-render issues
    const currentContent = contentRef.current;

    // 개별 필드 검증
    const titleErr = validateTitle(title);
    const contentErr = validateContent(currentContent);

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

      // Debug: Log HTML content right before sending to server
      if (DEBUG_HTML_TRACE) {
        console.group(`[Client] ${isEdit ? "PUT" : "POST"} - Content before save`);
        console.log("Content length:", currentContent.length);
        console.log("Content preview (first 200 chars):", currentContent.substring(0, 200));
        console.log("Full content:", currentContent);
        
        // Check for malformed HTML
        const openTags = (currentContent.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (currentContent.match(/<\/[^>]+>/g) || []).length;
        if (openTags !== closeTags) {
          console.warn(`⚠️ Tag mismatch: ${openTags} open tags, ${closeTags} close tags`);
        }
        if (/<p[^>]*>[\s\S]*?<p[^>]*>/i.test(currentContent)) {
          console.warn("⚠️ Nested <p> tags detected");
        }
        console.groupEnd();
      }

      // Send raw HTML content - no sanitization or manipulation
      // Sanitization is done on render, not on save
      const res = await fetch(`/api/board/${slug}/posts`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { postId, title, content: currentContent }
            : { title, content: currentContent }
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
          content={initialContent ?? ""}
          onChange={(html) => {
            // Update ref only - do NOT set state to avoid re-renders
            contentRef.current = html;
            // Clear error if there was one
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
