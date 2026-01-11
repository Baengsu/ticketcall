"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextAlignPersist } from "@/lib/tiptap-extensions/text-align-persist";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { useEffect, useState, useRef } from "react";
import React from "react";
// HTML sanitization is done on render, not on save
import { FontSize } from "@/lib/tiptap-extensions/font-size";
import { FontFamily } from "@/lib/tiptap-extensions/font-family";
import { compressImage, validateImageFile } from "@/lib/image-compress";

// Debug flag: Only enable HTML validation in development mode
// HTML validation should NOT run during live editing to avoid noise from transient invalid HTML
// TipTap often produces orphaned closing tags during composition, which is expected
const DEBUG_EDITOR_HTML = process.env.NODE_ENV === "development";

// Debug flag for Tiptap editor HTML and selection updates
const DEBUG_EDITOR = true;
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Link as LinkIcon,
  Link2Off,
  Image as ImageIcon,
  X,
} from "lucide-react";

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
  // Client-only mount gate to prevent SSR hydration errors
  const [isMounted, setIsMounted] = useState(false);

  // Formatting state: pending (user selection) and applied (active defaults)
  const [pendingColor, setPendingColor] = useState<string>("#000000");
  const [pendingFontSize, setPendingFontSize] = useState<string>("");
  const [pendingFontFamily, setPendingFontFamily] = useState<string>("");
  
  const [appliedColor, setAppliedColor] = useState<string | null>(null);
  const [appliedFontSize, setAppliedFontSize] = useState<string | null>(null);
  const [appliedFontFamily, setAppliedFontFamily] = useState<string | null>(null);

  // Debug: Throttle timer for HTML logging
  const debugLogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoggedHtmlRef = useRef<string>("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debug: Helper function to detect malformed HTML
  const detectMalformedHtml = (html: string): string[] => {
    const issues: string[] = [];
    
    // Check for unclosed tags (basic check)
    const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (html.match(/<\/[^>]+>/g) || []).length;
    if (openTags !== closeTags) {
      issues.push(`Tag mismatch: ${openTags} open tags, ${closeTags} close tags`);
    }
    
    // Check for nested <p> tags
    if (/<p[^>]*>[\s\S]*?<p[^>]*>/i.test(html)) {
      issues.push("Nested <p> tags detected");
    }
    
    // Check for <p> inside <p>
    const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
    if (pMatches) {
      pMatches.forEach((pTag, idx) => {
        if (pTag.match(/<p[^>]*>/gi)?.length && pTag.match(/<p[^>]*>/gi)!.length > 1) {
          issues.push(`Nested <p> in paragraph ${idx + 1}`);
        }
      });
    }
    
    // Check for orphaned closing tags
    const orphanedCloseTags = html.match(/<\/[^>]+>(?![^<]*<[^/])/g);
    if (orphanedCloseTags && orphanedCloseTags.length > 0) {
      issues.push(`Orphaned closing tags: ${orphanedCloseTags.join(", ")}`);
    }
    
    // Check for unclosed self-closing tags that should be closed
    const unclosedTags = html.match(/<(img|br|hr)[^>]*(?<!\/)>/gi);
    if (unclosedTags && unclosedTags.length > 0) {
      // This is actually OK for img/br/hr, but we log it for visibility
    }
    
    return issues;
  };

  // Debug: Log HTML with malformation detection
  // NOTE: This validation is intentionally skipped during live editing (onUpdate events)
  // to avoid noise from transient invalid HTML during typing/composition.
  // TipTap often produces orphaned closing tags during editing, which is expected behavior.
  // This function should only be called:
  // - During editor initialization (development mode only)
  // - Before saving content (if needed, can be called explicitly)
  const debugLogHtml = (html: string, context: string, skipValidation = false) => {
    if (!DEBUG_EDITOR_HTML) return;
    
    // Skip validation during live editing to avoid false positives
    if (skipValidation) {
      console.group(`[Editor HTML Debug] ${context}`);
      console.log("HTML:", html);
      console.log("Length:", html.length);
      console.log("ℹ️ Validation skipped (live editing mode)");
      console.groupEnd();
      return;
    }
    
    const issues = detectMalformedHtml(html);
    const hasIssues = issues.length > 0;
    
    console.group(`[Editor HTML Debug] ${context}`);
    console.log("HTML:", html);
    console.log("Length:", html.length);
    
    if (hasIssues) {
      // Use console.warn instead of console.error - malformed HTML during editing is not an error
      // It's expected behavior with TipTap during composition
      console.warn("⚠️ MALFORMED HTML DETECTED (non-blocking):", issues);
      // Also log a formatted version for easier inspection
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const parseErrors = doc.querySelectorAll("parsererror");
        if (parseErrors.length > 0) {
          console.warn("Parser warnings:", Array.from(parseErrors).map(e => e.textContent));
        }
      } catch (e) {
        console.warn("Failed to parse HTML (non-critical):", e);
      }
    } else {
      console.log("✅ HTML appears valid");
    }
    
    // Show tag structure
    const tagCounts: Record<string, number> = {};
    html.replace(/<\/?([a-z][a-z0-9]*)/gi, (_, tag) => {
      tagCounts[tag.toLowerCase()] = (tagCounts[tag.toLowerCase()] || 0) + 1;
      return "";
    });
    console.log("Tag counts:", tagCounts);
    
    console.groupEnd();
  };

  const editor = useEditor({
    // Prevent Next.js SSR hydration mismatch by deferring editor initialization
    // until after client-side mount. This works together with the isMounted gate
    // and next/dynamic import to ensure the editor never renders during SSR.
    immediatelyRender: false,
    extensions: [
      // Configure StarterKit to exclude list extensions and disable built-in link/underline
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        link: false,
        underline: false,
      }),
      // Use standalone Underline extension (not from StarterKit)
      Underline,
      // Configure TextStyle to merge nested span styles for better persistence
      TextStyle.configure({
        mergeNestedSpanStyles: true,
      }),
      // Color extension automatically works with textStyle marks
      // No additional configuration needed - it uses textStyle by default
      Color,
      FontSize,
      FontFamily,
      TextAlignPersist.configure({
        types: ["paragraph", "heading"],
        defaultAlignment: "left",
      }),
      // Add Link as standalone extension with custom configuration
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        // Validate URLs to prevent javascript: and data: protocols
        validate: (url) => {
          try {
            const parsed = new URL(url, window.location.href);
            // Only allow http, https, or relative URLs
            return (
              parsed.protocol === "http:" ||
              parsed.protocol === "https:" ||
              url.startsWith("/") ||
              url.startsWith("#")
            );
          } catch {
            // Invalid URL, reject
            return false;
          }
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false, // Security: don't allow base64 images
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
      }),
    ],
    // Only set initial content - do NOT make editor controlled by React state
    content: content || "",
    onCreate({ editor }) {
      if (DEBUG_EDITOR_HTML) console.log("[TIPTAP CREATE]", editor.getHTML());
    },
    onUpdate({ editor }) {
      // Pass raw HTML from editor - no sanitization or manipulation
      // Sanitization is done on render, not on save
      // DO NOT call setContent here - it causes typing bugs
      // editor.getHTML() produces valid nested HTML because list extensions are disabled
      const rawHtml = editor.getHTML();
      
      // DO NOT run HTML validation during onUpdate - TipTap often produces transient invalid HTML
      // during typing/composition (e.g., orphaned </p> tags), which is expected behavior.
      // Validation should only run in development mode during initialization, or before saving.
      if (DEBUG_EDITOR_HTML) {
        console.log("[TIPTAP UPDATE]", rawHtml.substring(0, 100) + "...");
      }
      
      onChange(rawHtml);
    },
    onSelectionUpdate({ editor }) {
      if (DEBUG_EDITOR_HTML) {
        console.log("[TIPTAP SELECTION]", {
          paragraph: editor.getAttributes("paragraph"),
          textStyle: editor.getAttributes("textStyle"),
        });
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:h-0",
        "data-placeholder": placeholder,
      },
    },
  });

  // Apply pending formatting (called when user clicks Apply button)
  const handleApplyFormatting = () => {
    const newAppliedColor = pendingColor !== "#000000" ? pendingColor : null;
    const newAppliedFontSize = pendingFontSize || null;
    const newAppliedFontFamily = pendingFontFamily || null;
    
    setAppliedColor(newAppliedColor);
    setAppliedFontSize(newAppliedFontSize);
    setAppliedFontFamily(newAppliedFontFamily);
    
    // Apply to editor
    if (!editor) return;
    
    const chain = editor.chain().focus();
    
    if (newAppliedColor !== null) {
      chain.setColor(newAppliedColor);
    } else {
      chain.unsetColor();
    }
    
    if (newAppliedFontSize !== null) {
      chain.setFontSize(newAppliedFontSize);
    } else {
      chain.unsetFontSize();
    }
    
    if (newAppliedFontFamily !== null) {
      chain.setFontFamily(newAppliedFontFamily);
    } else {
      chain.unsetFontFamily();
    }
    
    chain.run();
  };

  // Reset all formatting
  const handleResetFormatting = () => {
    setPendingColor("#000000");
    setPendingFontSize("");
    setPendingFontFamily("");
    setAppliedColor(null);
    setAppliedFontSize(null);
    setAppliedFontFamily(null);
    
    if (!editor) return;
    
    editor.chain().focus()
      .unsetColor()
      .unsetFontSize()
      .unsetFontFamily()
      .run();
  };

  // Apply formatting marks persistently across typing and new paragraphs
  // This ensures that applied formatting is maintained when user types or presses Enter
  // IMPORTANT: This uses marks only, NEVER calls setContent to avoid re-render loops
  useEffect(() => {
    if (!editor || !isMounted) return;
    
    // Track if we're currently applying marks to avoid infinite loops
    let isApplying = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Function to check and re-apply marks if needed
    // Uses debouncing to avoid excessive mark applications
    const checkAndApplyMarks = () => {
      if (!editor || isApplying) return;
      
      // Only apply if there's an applied state
      if (appliedColor === null && appliedFontSize === null && appliedFontFamily === null) {
        return;
      }
      
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Debounce mark application to avoid excessive updates
      timeoutId = setTimeout(() => {
        if (!editor || isApplying) return;
        
        // Get current marks at cursor position
        const attrs = editor.getAttributes("textStyle");
        const colorAttr = editor.getAttributes("color");
        
        // Check what needs to be applied (only if marks are missing)
        const needsColor = appliedColor !== null && colorAttr.color !== appliedColor;
        const needsFontSize = appliedFontSize !== null && attrs.fontSize !== appliedFontSize;
        const needsFontFamily = appliedFontFamily !== null && attrs.fontFamily !== appliedFontFamily;
        
        // Only re-apply if marks are missing (avoid infinite loops)
        if (needsColor || needsFontSize || needsFontFamily) {
          isApplying = true;
          
          // Use requestAnimationFrame to apply after the current transaction completes
          requestAnimationFrame(() => {
            if (!editor) {
              isApplying = false;
              return;
            }
            
            // Double-check that marks are still missing (avoid race conditions)
            const currentAttrs = editor.getAttributes("textStyle");
            const currentColorAttr = editor.getAttributes("color");
            const stillNeedsColor = appliedColor !== null && currentColorAttr.color !== appliedColor;
            const stillNeedsFontSize = appliedFontSize !== null && currentAttrs.fontSize !== appliedFontSize;
            const stillNeedsFontFamily = appliedFontFamily !== null && currentAttrs.fontFamily !== appliedFontFamily;
            
            if (stillNeedsColor || stillNeedsFontSize || stillNeedsFontFamily) {
              // Apply marks using chain - NEVER use setContent
              const chain = editor.chain().focus();
              
              if (stillNeedsColor && appliedColor !== null) {
                chain.setColor(appliedColor);
              }
              if (stillNeedsFontSize && appliedFontSize !== null) {
                chain.setMark("textStyle", { fontSize: appliedFontSize });
              }
              if (stillNeedsFontFamily && appliedFontFamily !== null) {
                chain.setMark("textStyle", { fontFamily: appliedFontFamily });
              }
              
              chain.run();
            }
            
            isApplying = false;
          });
        }
      }, 50); // 50ms debounce
    };
    
    // Handle transaction events (typing, Enter, etc.)
    // Only trigger on actual content changes, not on every transaction
    const handleTransaction = ({ transaction }: { transaction: any }) => {
      if (!editor || isApplying) return;
      
      // Only check marks if there are actual document changes
      if (transaction.docChanged) {
        // Check if this is a text input transaction or Enter key (new paragraph)
        const hasTextInsertion = transaction.steps.some((step: any) => {
          // Check for text replacement or insertion
          return step.stepType === "replace" && step.slice && step.slice.content && step.slice.content.size > 0;
        });
        
        // Check if Enter was pressed (new paragraph created)
        // When Enter is pressed, preserve alignment from previous paragraph
        // This ensures alignment persists across new paragraphs
        // IMPORTANT: Do NOT interfere with list behavior - let Tiptap handle list Enter keys
        if (hasTextInsertion) {
          // After transaction completes, check if we need to inherit alignment
          requestAnimationFrame(() => {
            if (!editor || isApplying) return;
            
            try {
              const { state } = editor.view;
              const { selection } = state;
              const { $from } = selection;
              const currentNode = $from.parent;
              
              // If we're in a paragraph/heading, check if alignment needs to be inherited
              if (currentNode.type.name === "paragraph" || currentNode.type.name === "heading") {
                // Get current alignment
                const currentAlign = currentNode.attrs.textAlign || "left";
                
                // If alignment is default (left), try to inherit from previous sibling paragraph
                if (currentAlign === "left") {
                  // Look for previous paragraph at the same level
                  let depth = $from.depth;
                  while (depth > 0) {
                    const node = $from.node(depth);
                    const pos = $from.start(depth);
                    
                    // Check if there's a previous sibling
                    if (pos > 0) {
                      const prevPos = pos - 1;
                      const prevNode = state.doc.nodeAt(prevPos);
                      
                      if (prevNode && (prevNode.type.name === "paragraph" || prevNode.type.name === "heading")) {
                        const prevAlign = prevNode.attrs.textAlign;
                        // If previous paragraph has non-default alignment, apply it
                        if (prevAlign && prevAlign !== "left") {
                          // Apply alignment using commands (not setContent) - this is safe and won't cause loops
                          editor.chain().focus().setTextAlign(prevAlign).run();
                          return; // Exit early after applying alignment
                        }
                      }
                    }
                    depth--;
                  }
                }
              }
            } catch (error) {
              // Silently ignore errors in alignment inheritance
              // This prevents breaking the editor if there's an issue
            }
          });
        }
        
        // Apply color/font marks after text insertion (typing) or Enter (new paragraph)
        if (hasTextInsertion) {
          checkAndApplyMarks();
        }
      }
    };
    
    // Handle selection updates (cursor movement, clicking)
    // Only apply marks when cursor is at an empty position (not when selecting text)
    const handleSelectionUpdate = () => {
      if (!editor || isApplying) return;
      
      // Only apply if selection is empty (cursor position, not text selection)
      // and if there are applied formatting states
      if (editor.state.selection.empty && 
          (appliedColor !== null || appliedFontSize !== null || appliedFontFamily !== null)) {
        checkAndApplyMarks();
      }
    };
    
    editor.on("transaction", handleTransaction);
    editor.on("selectionUpdate", handleSelectionUpdate);
    
    return () => {
      editor.off("transaction", handleTransaction);
      editor.off("selectionUpdate", handleSelectionUpdate);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [editor, isMounted, appliedColor, appliedFontSize, appliedFontFamily]);

  // Debug: Log HTML after editor initialization (development mode only)
  // NOTE: HTML validation is intentionally minimal here - we don't want to block or warn
  // about transient invalid HTML that TipTap may produce during normal editing
  useEffect(() => {
    if (!editor || !isMounted || !DEBUG_EDITOR_HTML) return;
    
    // Log initial HTML after a short delay to ensure editor is fully initialized
    // Only validate on initialization, not during updates
    const initTimer = setTimeout(() => {
      const html = editor.getHTML();
      // Run validation only during initialization (not during live editing)
      debugLogHtml(html, "Editor initialized", false);
      lastLoggedHtmlRef.current = html;
    }, 100);
    
    return () => {
      clearTimeout(initTimer);
      if (debugLogTimerRef.current) {
        clearTimeout(debugLogTimerRef.current);
      }
    };
  }, [editor, isMounted]);

  // Update editor content ONLY when prop changes AND only if different from current HTML
  // This is for edit mode - do NOT update during typing
  const lastContentRef = React.useRef<string | null>(null);
  const isInitialMountRef = React.useRef(true);
  
  useEffect(() => {
    if (!editor || !isMounted) return;
    
    // On initial mount, set content if provided
    if (isInitialMountRef.current) {
      if (content) {
        editor.commands.setContent(content, {
          emitUpdate: false,
        });
        lastContentRef.current = content;
      }
      isInitialMountRef.current = false;
      return;
    }
    
    // After initial mount, only update if content prop changed AND is different from editor HTML
    const incomingHTML = content || "";
    const currentHtml = editor.getHTML();
    
    // Guard: only update if incoming HTML is different from current editor HTML
    // IMPORTANT: Do NOT normalize or manipulate HTML - use exact strings to preserve structure
    if (incomingHTML && editor && incomingHTML !== currentHtml && incomingHTML !== lastContentRef.current) {
      // Set content exactly as received - no manipulation
      editor.commands.setContent(incomingHTML, {
        emitUpdate: false,
      });
      lastContentRef.current = incomingHTML;
    }
  }, [editor, content, isMounted]);

  // Return skeleton placeholder during SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div
        className={`w-full border rounded-md focus-within:ring focus-within:ring-primary/40 ${
          hasError ? "border-red-500 focus-within:ring-red-500/40" : ""
        }`}
      >
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
    );
  }

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
        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed bg-background"
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed bg-background"
          title="다시 실행 (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive("bold")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="굵게 (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
            editor.isActive("italic")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="기울임 (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted ${
            editor.isActive("underline")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="밑줄"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font Size */}
        <select
          value={pendingFontSize}
          onChange={(e) => {
            setPendingFontSize(e.target.value);
          }}
          className="px-2 py-1.5 text-sm rounded-md border bg-background hover:bg-muted focus:outline-none focus:ring focus:ring-primary/40"
          title="글자 크기"
        >
          <option value="">크기</option>
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
          <option value="32">32px</option>
        </select>

        {/* Font Family */}
        <select
          value={pendingFontFamily}
          onChange={(e) => {
            setPendingFontFamily(e.target.value);
          }}
          className="px-2 py-1.5 text-sm rounded-md border bg-background hover:bg-muted focus:outline-none focus:ring focus:ring-primary/40"
          title="글꼴"
        >
          <option value="">글꼴</option>
          <option value="system-ui, -apple-system, sans-serif">시스템 기본</option>
          <option value="Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif">Pretendard</option>
          <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
        </select>

        {/* Text Color */}
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={pendingColor}
            onChange={(e) => {
              setPendingColor(e.target.value);
            }}
            className="w-8 h-8 rounded border cursor-pointer"
            title="텍스트 색상"
          />
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Apply Formatting */}
        <button
          type="button"
          onClick={handleApplyFormatting}
          disabled={
            (pendingColor === "#000000" || pendingColor === appliedColor) &&
            (pendingFontSize === "" || pendingFontSize === (appliedFontSize || "")) &&
            (pendingFontFamily === "" || pendingFontFamily === (appliedFontFamily || ""))
          }
          className="px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground"
          title="포맷팅 적용"
        >
          적용
        </button>

        {/* Reset Formatting */}
        <button
          type="button"
          onClick={handleResetFormatting}
          className="px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted bg-background"
          title="포맷팅 초기화"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "left" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="왼쪽 정렬"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "center" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="가운데 정렬"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "right" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="오른쪽 정렬"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted ${
            editor.isActive({ textAlign: "justify" })
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="양쪽 정렬"
        >
          <AlignJustify className="w-4 h-4" />
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
          className={`px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted ${
            editor.isActive("link")
              ? "bg-primary text-primary-foreground"
              : "bg-background"
          }`}
          title="링크 추가"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted bg-background"
            title="링크 제거"
          >
            <Link2Off className="w-4 h-4" />
          </button>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Image Upload */}
        <button
          type="button"
          onClick={async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/jpeg,image/jpg,image/png,image/webp";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;

              try {
                // Validate file
                validateImageFile(file);

                // Insert placeholder image with unique src to track it
                const placeholderId = `upload-${Date.now()}`;
                const placeholderSrc = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E업로드 중...%3C/text%3E%3C/svg%3E#${placeholderId}`;
                editor.chain().focus().setImage({ 
                  src: placeholderSrc,
                  alt: "업로드 중..."
                }).run();

                // Compress image
                const compressedFile = await compressImage(file, {
                  maxWidth: 1600,
                  maxHeight: 1600,
                  quality: 0.8,
                  maxSizeMB: 3,
                  fileType: "image/webp",
                });

                // Upload to server
                const formData = new FormData();
                formData.append("image", compressedFile);

                const res = await fetch("/api/board/upload-image", {
                  method: "POST",
                  body: formData,
                });

                if (!res.ok) {
                  const error = await res.json().catch(() => ({ message: "업로드 실패" }));
                  throw new Error(error.message || "이미지 업로드에 실패했습니다.");
                }

                const data = await res.json();
                if (!data.ok || !data.url) {
                  throw new Error(data.message || "이미지 URL을 받을 수 없습니다.");
                }

                // Replace placeholder with actual image using Tiptap node commands
                // This preserves HTML structure better than string replacement
                const { state } = editor.view;
                const { doc } = state;
                
                // Find placeholder image node position
                let placeholderPos: number | null = null;
                let placeholderNodeSize: number = 1;
                doc.descendants((node, pos) => {
                  if (node.type.name === "image" && node.attrs.src?.includes(placeholderId)) {
                    placeholderPos = pos;
                    placeholderNodeSize = node.nodeSize;
                    return false; // Stop searching
                  }
                });
                
                if (placeholderPos !== null) {
                  // Replace the image node using Tiptap commands (preserves HTML structure)
                  editor.chain()
                    .focus()
                    .setTextSelection({ from: placeholderPos, to: placeholderPos + placeholderNodeSize })
                    .deleteSelection()
                    .insertContentAt(placeholderPos, {
                      type: "image",
                      attrs: {
                        src: data.url,
                        alt: file.name.replace(/"/g, "&quot;"),
                        class: "max-w-full h-auto rounded-md",
                      },
                    })
                    .run();
                }
              } catch (error: any) {
                // Remove placeholder on error using Tiptap commands
                const { state } = editor.view;
                const { doc } = state;
                
                // Find placeholder image node position
                let placeholderPos: number | null = null;
                let placeholderNodeSize: number = 1;
                doc.descendants((node, pos) => {
                  if (node.type.name === "image" && node.attrs.src?.includes("upload-")) {
                    placeholderPos = pos;
                    placeholderNodeSize = node.nodeSize;
                    return false; // Stop searching
                  }
                });
                
                if (placeholderPos !== null) {
                  // Delete the placeholder image node using Tiptap commands
                  editor.chain()
                    .focus()
                    .setTextSelection({ from: placeholderPos, to: placeholderPos + placeholderNodeSize })
                    .deleteSelection()
                    .run();
                }

                // Show error
                alert(error.message || "이미지 업로드 중 오류가 발생했습니다.");
              }
            };
            input.click();
          }}
          className="px-2.5 py-1.5 rounded-md transition-colors hover:bg-muted bg-background"
          title="이미지 업로드"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* ============================================
            FUTURE: File Upload Button
            ============================================
            To add file upload:
            1. Add button here similar to image upload
            2. Create custom extension or use existing file extension
            3. Store file metadata and insert link/icon
            4. Update sanitization accordingly
            ============================================ */}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
