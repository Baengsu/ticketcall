"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { sanitizeHtmlClient, ALLOWED_TAGS, ALLOWED_ATTR } from "@/lib/html-sanitize";

interface PostContentProps {
  content: string;
  className?: string;
}

export default function PostContent({ content, className = "" }: PostContentProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Sanitize HTML on client side using centralized configuration
    // This ensures consistent sanitization rules across the app
    const clean = sanitizeHtmlClient(content);
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
