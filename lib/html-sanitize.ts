/**
 * HTML Sanitization Utilities
 * 
 * Provides server-side and client-side HTML sanitization to prevent XSS attacks.
 * Uses DOMPurify for client-side, and a strict allowlist for server-side.
 */

/**
 * Allowed HTML tags for post content
 * This list should be kept minimal for security
 */
export const ALLOWED_TAGS = [
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
] as const;

/**
 * Allowed HTML attributes
 */
export const ALLOWED_ATTR = ["href", "target", "rel"] as const;

/**
 * Server-side HTML sanitization
 * Strips all HTML tags except those in ALLOWED_TAGS
 * Removes all attributes except those in ALLOWED_ATTR
 * 
 * Note: This is a basic sanitization. For production, consider using
 * a library like `isomorphic-dompurify` or `sanitize-html` for better security.
 * 
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtmlServer(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  // Remove script tags and event handlers (basic XSS prevention)
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

  // For server-side, we'll do a basic tag allowlist
  // In production, use a proper HTML parser like `node-html-parser` or `cheerio`
  // This is a simplified version that removes disallowed tags
  
  // Keep only allowed tags (negative lookahead to remove disallowed tags)
  const allowedTagsStr = ALLOWED_TAGS.join("|");
  const allowedTagsRegex = new RegExp(
    `</?(?!${allowedTagsStr}\\b)[^>]+>`,
    "gi"
  );
  sanitized = sanitized.replace(allowedTagsRegex, "");

  // Remove disallowed attributes (keep only href, target, rel for links)
  sanitized = sanitized.replace(
    /<(\w+)([^>]*)>/g,
    (match, tag, attrs) => {
      if (!ALLOWED_TAGS.includes(tag as any)) {
        return "";
      }
      
      // Extract allowed attributes
      const allowedAttrs: string[] = [];
      if (tag === "a") {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        const targetMatch = attrs.match(/target=["']([^"']+)["']/i);
        const relMatch = attrs.match(/rel=["']([^"']+)["']/i);
        
        if (hrefMatch) {
          const href = hrefMatch[1];
          // Only allow http, https, or relative URLs
          if (
            href.startsWith("http://") ||
            href.startsWith("https://") ||
            href.startsWith("/") ||
            href.startsWith("#")
          ) {
            allowedAttrs.push(`href="${href}"`);
          }
        }
        if (targetMatch && targetMatch[1] === "_blank") {
          allowedAttrs.push('target="_blank"');
        }
        if (relMatch) {
          allowedAttrs.push(`rel="${relMatch[1]}"`);
        } else if (targetMatch && targetMatch[1] === "_blank") {
          allowedAttrs.push('rel="noopener noreferrer"');
        }
      }
      
      return allowedAttrs.length > 0
        ? `<${tag} ${allowedAttrs.join(" ")}>`
        : `<${tag}>`;
    }
  );

  return sanitized.trim();
}

/**
 * Client-side HTML sanitization using DOMPurify
 * More thorough than server-side sanitization
 * 
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtmlClient(html: string): string {
  if (typeof window === "undefined") {
    // Fallback to server-side sanitization if DOMPurify is not available
    return sanitizeHtmlServer(html);
  }

  // Dynamic import to avoid SSR issues
  const DOMPurify = require("dompurify");
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Prevent script injection
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}

/**
 * Sanitize HTML content before saving to database
 * Uses server-side sanitization for API routes
 * 
 * @param html - Raw HTML string from editor
 * @returns Sanitized HTML safe for database storage
 */
export function sanitizeForStorage(html: string): string {
  return sanitizeHtmlServer(html);
}
