interface PostContentProps {
  content: string;
  className?: string;
}

/**
 * PostContent component - renders sanitized HTML content
 * 
 * IMPORTANT: This component does NOT perform any sanitization.
 * The content must be sanitized on the server side before being passed to this component.
 * This ensures that inline styles (text-align, color, etc.) are preserved exactly as authored.
 */
export default function PostContent({ content, className = "" }: PostContentProps) {
  return (
    <div
      className={`post-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
