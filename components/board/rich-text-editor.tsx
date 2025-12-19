"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
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
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
      },
    },
  });

  // Update editor content when prop changes (for edit mode)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="w-full border rounded-md px-3 py-2 text-sm min-h-[200px] bg-muted/20 animate-pulse">
        에디터 로딩 중...
      </div>
    );
  }

  return (
    <div className="w-full border rounded-md focus-within:ring focus-within:ring-primary/40">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/30">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive("bold") ? "bg-primary text-primary-foreground" : ""
          }`}
          title="굵게 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive("italic") ? "bg-primary text-primary-foreground" : ""
          }`}
          title="기울임 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive("underline") ? "bg-primary text-primary-foreground" : ""
          }`}
          title="밑줄"
        >
          <u>U</u>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive({ textAlign: "left" })
              ? "bg-primary text-primary-foreground"
              : ""
          }`}
          title="왼쪽 정렬"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive({ textAlign: "center" })
              ? "bg-primary text-primary-foreground"
              : ""
          }`}
          title="가운데 정렬"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive({ textAlign: "right" })
              ? "bg-primary text-primary-foreground"
              : ""
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
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive("bulletList")
              ? "bg-primary text-primary-foreground"
              : ""
          }`}
          title="글머리 기호"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive("orderedList")
              ? "bg-primary text-primary-foreground"
              : ""
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
          className={`px-2 py-1 text-sm rounded hover:bg-muted ${
            editor.isActive("link")
              ? "bg-primary text-primary-foreground"
              : ""
          }`}
          title="링크 추가"
        >
          🔗
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-2 py-1 text-sm rounded hover:bg-muted"
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
