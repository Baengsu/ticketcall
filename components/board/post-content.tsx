"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface PostContentProps {
  content: string;
  className?: string;
}

export default function PostContent({ content, className = "" }: PostContentProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Sanitize HTML on client side
    const clean = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "ul",
        "ol",
        "li",
        "a",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "code",
        "pre",
      ],
      ALLOWED_ATTR: ["href", "target", "rel"],
      ALLOW_DATA_ATTR: false,
    });
    setSanitizedHtml(clean);
  }, [content]);

  // Show plain text during SSR to avoid hydration mismatch
  if (!isClient || sanitizedHtml === null) {
    // Strip HTML tags for SSR/initial render
    const plainText = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
    return (
      <div className={`prose prose-sm max-w-none ${className}`} suppressHydrationWarning>
        {plainText || "내용 없음"}
      </div>
    );
  }

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      suppressHydrationWarning
    />
  );
}
