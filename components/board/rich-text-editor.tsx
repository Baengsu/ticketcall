"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import React from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
  hasError = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:h-0",
        "data-placeholder": placeholder,
      },
    },
  });

  // Update editor content when prop changes (for edit mode)
  // Use a ref to track the last set content to prevent unnecessary updates
  const lastContentRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    if (!editor) return;
    
    const currentHtml = editor.getHTML();
    // Only update if content prop actually changed
    if (content !== lastContentRef.current && content !== currentHtml) {
      // Check if content is actually different (not just whitespace/empty tags)
      const normalizedContent = content.trim().replace(/<p><\/p>/g, "").replace(/<br\s*\/?>/g, "");
      const normalizedCurrent = currentHtml.trim().replace(/<p><\/p>/g, "").replace(/<br\s*\/?>/g, "");
      
      if (normalizedContent !== normalizedCurrent) {
        editor.commands.setContent(content || "", {
          emitUpdate: false,
        });
        lastContentRef.current = content;
      }
    }
  }, [editor, content]);

  if (!editor) {
    return (
      <div className="w-full border rounded-md px-3 py-2 text-sm min-h-[200px] bg-muted/20 animate-pulse">
        에디터 로딩 중...
      </div>
    );
  }

  return (
    <div
      className={`w-full border rounded-md focus-within:ring focus-within:ring-primary/40 ${
        hasError ? "border-red-500 focus-within:ring-red-500/40" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/30 rounded-t-md">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive("bold")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="굵게 (Ctrl+B)"
        >
          <strong className="font-bold">B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive("italic")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="기울임 (Ctrl+I)"
        >
          <em className="italic">I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive("underline")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="밑줄"
        >
          <u className="underline">U</u>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "left" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="왼쪽 정렬"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "center" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="가운데 정렬"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "right" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="오른쪽 정렬"
        >
          ➡
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive("bulletList")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="글머리 기호"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive("orderedList")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="번호 매기기"
        >
          1.
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("링크 URL을 입력하세요:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted ${
            editor.isActive("link")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="링크 추가"
        >
          🔗
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-muted bg-background"
            title="링크 제거"
          >
            🔗✕
          </button>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
