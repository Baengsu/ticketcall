/**
 * HTML Sanitization Utilities
 * 
 * Provides server-side and client-side HTML sanitization to prevent XSS attacks.
 * Uses DOMPurify for client-side, and a strict allowlist for server-side.
 */

/**
 * Allowed HTML tags for post content
 * This list should be kept minimal for security
 * Only basic formatting tags are allowed
 */
export const ALLOWED_TAGS = [
  "p",
  "span",
  "a",
  "img",
  "strong",
  "em",
  "u",
  "br",
] as const;

/**
 * Allowed HTML attributes
 * - p: style
 * - span: style
 * - a: href, target, rel
 * - img: src, alt, title
 */
export const ALLOWED_ATTR = ["href", "target", "rel", "style", "src", "alt", "title"] as const;

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

  // Remove disallowed attributes (keep only href, target, rel, and safe style attributes)
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
      } else if (tag === "img") {
        // Validate and extract img attributes (only src, alt, title allowed)
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
        const titleMatch = attrs.match(/title=["']([^"']*)["']/i);
        
        if (srcMatch) {
          const src = srcMatch[1];
          // Only allow http, https, or relative URLs (no javascript:, data:, etc.)
          if (
            src.startsWith("http://") ||
            src.startsWith("https://") ||
            src.startsWith("/")
          ) {
            // Additional validation: no javascript: or data: protocols
            if (
              !src.toLowerCase().includes("javascript:") &&
              !src.toLowerCase().startsWith("data:")
            ) {
              allowedAttrs.push(`src="${src}"`);
            }
          }
        }
        
        if (altMatch) {
          // Sanitize alt text (remove any potential XSS)
          const alt = altMatch[1]
            .replace(/[<>]/g, "")
            .substring(0, 200); // Limit length
          allowedAttrs.push(`alt="${alt}"`);
        }
        
        if (titleMatch) {
          // Sanitize title text (remove any potential XSS)
          const title = titleMatch[1]
            .replace(/[<>]/g, "")
            .substring(0, 200); // Limit length
          allowedAttrs.push(`title="${title}"`);
        }
      }
      
      // Extract and sanitize style attribute (for span and p tags)
      // For span: allow color, font-size, font-family, text-align
      // For p: allow text-align, color only
      if (tag === "span" || tag === "p") {
        const styleMatch = attrs.match(/style=["']([^"']+)["']/i);
        if (styleMatch) {
          const styleContent = styleMatch[1];
          const safeStyles: string[] = [];
          const isSpan = tag === "span";
          
          // Extract font-size (only for span)
          if (isSpan) {
            const fontSizeMatch = styleContent.match(/font-size:\s*(\d+)px/i);
            if (fontSizeMatch) {
              const size = parseInt(fontSizeMatch[1], 10);
              // Only allow reasonable font sizes (8-100px)
              if (size >= 8 && size <= 100) {
                safeStyles.push(`font-size: ${size}px`);
              }
            }
            
            // Extract font-family (only for span)
            const fontFamilyMatch = styleContent.match(/font-family:\s*([^;]+)/i);
            if (fontFamilyMatch) {
              const fontFamily = fontFamilyMatch[1].trim();
              // Only allow safe font families (no javascript:, expression(), etc.)
              if (
                fontFamily &&
                !fontFamily.includes("javascript:") &&
                !fontFamily.includes("expression(") &&
                !fontFamily.includes("url(") &&
                fontFamily.length < 200
              ) {
                safeStyles.push(`font-family: ${fontFamily}`);
              }
            }
          }
          
          // Extract color (for both span and p)
          const colorMatch = styleContent.match(/color:\s*([^;]+)/i);
          if (colorMatch) {
            const color = colorMatch[1].trim();
            // Only allow hex colors, rgb/rgba, or named colors
            if (
              color &&
              (color.match(/^#[0-9a-f]{3,6}$/i) ||
                color.match(/^rgb\(/i) ||
                color.match(/^rgba\(/i) ||
                /^[a-z]+$/i.test(color)) &&
              !color.includes("javascript:") &&
              !color.includes("expression(") &&
              color.length < 50
            ) {
              safeStyles.push(`color: ${color}`);
            }
          }
          
          // Extract text-align (for both span and p)
          const textAlignMatch = styleContent.match(/text-align:\s*(left|center|right|justify)/i);
          if (textAlignMatch) {
            const align = textAlignMatch[1].toLowerCase();
            if (["left", "center", "right", "justify"].includes(align)) {
              safeStyles.push(`text-align: ${align}`);
            }
          }
          
          if (safeStyles.length > 0) {
            allowedAttrs.push(`style="${safeStyles.join("; ")}"`);
          }
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
  
  // DOMPurify hook to sanitize style attributes
  const DOMPurifyInstance = DOMPurify;
  
  // Add hook to sanitize attributes
  DOMPurifyInstance.addHook("uponSanitizeAttribute", (node: any, data: any) => {
    const tagName = (node.tagName || "").toLowerCase();
    
    // Sanitize img attributes (only allow src, alt, title)
    if (tagName === "img") {
      if (data.attrName === "src") {
        const src = data.attrValue;
        // Only allow http, https, or relative URLs
        if (
          src &&
          (src.startsWith("http://") ||
            src.startsWith("https://") ||
            src.startsWith("/")) &&
          !src.toLowerCase().includes("javascript:") &&
          !src.toLowerCase().startsWith("data:")
        ) {
          // Keep the attribute
          return;
        } else {
          // Remove unsafe src
          data.keepAttr = false;
          return;
        }
      }
      // Allow alt and title attributes for img
      if (data.attrName === "alt" || data.attrName === "title") {
        return; // Keep the attribute
      }
      // Remove all other attributes from img
      if (data.attrName !== "src" && data.attrName !== "alt" && data.attrName !== "title") {
        data.keepAttr = false;
        return;
      }
    }
    
    // Sanitize a tag attributes (only allow href, target, rel)
    if (tagName === "a") {
      if (data.attrName === "href") {
        const href = data.attrValue;
        // Only allow http, https, relative URLs, or anchors
        if (
          href &&
          (href.startsWith("http://") ||
            href.startsWith("https://") ||
            href.startsWith("/") ||
            href.startsWith("#")) &&
          !href.toLowerCase().includes("javascript:")
        ) {
          return; // Keep the attribute
        } else {
          data.keepAttr = false;
          return;
        }
      }
      // Allow target and rel attributes for a
      if (data.attrName === "target" || data.attrName === "rel") {
        return; // Keep the attribute
      }
      // Remove all other attributes from a
      if (data.attrName !== "href" && data.attrName !== "target" && data.attrName !== "rel") {
        data.keepAttr = false;
        return;
      }
    }
    
    // Sanitize style attributes (for span and p tags)
    // For span: allow color, font-size, font-family, text-align
    // For p: allow text-align, color only
    if (data.attrName === "style" && (tagName === "span" || tagName === "p") && data.attrValue) {
      const styleContent = data.attrValue;
      const safeStyles: string[] = [];
      const isSpan = tagName === "span";
      
      // Extract font-size (only for span)
      if (isSpan) {
        const fontSizeMatch = styleContent.match(/font-size:\s*(\d+)px/i);
        if (fontSizeMatch) {
          const size = parseInt(fontSizeMatch[1], 10);
          if (size >= 8 && size <= 100) {
            safeStyles.push(`font-size: ${size}px`);
          }
        }
        
        // Extract font-family (only for span)
        const fontFamilyMatch = styleContent.match(/font-family:\s*([^;]+)/i);
        if (fontFamilyMatch) {
          const fontFamily = fontFamilyMatch[1].trim();
          if (
            fontFamily &&
            !fontFamily.includes("javascript:") &&
            !fontFamily.includes("expression(") &&
            !fontFamily.includes("url(") &&
            fontFamily.length < 200
          ) {
            safeStyles.push(`font-family: ${fontFamily}`);
          }
        }
      }
      
      // Extract color (for both span and p)
      const colorMatch = styleContent.match(/color:\s*([^;]+)/i);
      if (colorMatch) {
        const color = colorMatch[1].trim();
        if (
          color &&
          (color.match(/^#[0-9a-f]{3,6}$/i) ||
            color.match(/^rgb\(/i) ||
            color.match(/^rgba\(/i) ||
            /^[a-z]+$/i.test(color)) &&
          !color.includes("javascript:") &&
          !color.includes("expression(") &&
          color.length < 50
        ) {
          safeStyles.push(`color: ${color}`);
        }
      }
      
      // Extract text-align (for both span and p)
      const textAlignMatch = styleContent.match(/text-align:\s*(left|center|right|justify)/i);
      if (textAlignMatch) {
        const align = textAlignMatch[1].toLowerCase();
        if (["left", "center", "right", "justify"].includes(align)) {
          safeStyles.push(`text-align: ${align}`);
        }
      }
      
      if (safeStyles.length > 0) {
        data.attrValue = safeStyles.join("; ");
      } else {
        // Remove style attribute if no safe styles found
        data.keepAttr = false;
      }
    } else if (data.attrName === "style" && tagName !== "span" && tagName !== "p") {
      // Remove style attribute from non-allowed tags
      data.keepAttr = false;
    }
  });
  
  const sanitized = DOMPurifyInstance.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Prevent script injection
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
  
  // Remove hook after use
  DOMPurifyInstance.removeHook("uponSanitizeAttribute");
  
  return sanitized;
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

/**
 * Server-side HTML sanitization for rendering
 * Allows all tags (except dangerous ones) and explicitly allows style and class attributes
 * Preserves inline styles including text-align and color
 * 
 * This is used when rendering post content to preserve TipTap-generated HTML exactly as authored
 * while remaining XSS-safe.
 * 
 * @param html - Raw HTML string from database
 * @returns Sanitized HTML safe for rendering with preserved styles
 */
export function sanitizeForRender(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  // Basic XSS prevention: remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");

  // Remove event handlers and dangerous protocols from attributes
  sanitized = sanitized.replace(
    /<([a-z][a-z0-9]*)\b([^>]*)>/gi,
    (match, tag, attrs) => {
      // Extract all attributes
      const attrMatches = attrs.match(/(\w+)\s*=\s*(["'])((?:(?!\2)[^\\]|\\.)*)\2/gi) || [];
      
      const safeAttrs: string[] = [];
      
      for (const attr of attrMatches) {
        const nameMatch = attr.match(/^(\w+)\s*=/i);
        if (!nameMatch) continue;
        
        const attrName = nameMatch[1].toLowerCase();
        const valueMatch = attr.match(/=\s*(["'])((?:(?!\1)[^\\]|\\.)*)\1/i);
        const attrValue = valueMatch ? valueMatch[2] : "";
        
        // Remove event handlers
        if (attrName.startsWith("on")) {
          continue;
        }
        
        // For href and src, validate URLs to prevent javascript: and data: protocols
        if (attrName === "href" || attrName === "src") {
          const lowerValue = attrValue.toLowerCase().trim();
          if (
            lowerValue.startsWith("javascript:") ||
            lowerValue.startsWith("data:text/html") ||
            lowerValue.startsWith("vbscript:")
          ) {
            continue;
          }
        }
        
        // Allow style, class, and other safe attributes
        // Style and class are explicitly allowed as per requirements
        safeAttrs.push(attr);
      }
      
      if (safeAttrs.length > 0) {
        return `<${tag} ${safeAttrs.join(" ")}>`;
      }
      return `<${tag}>`;
    }
  );

  // Final cleanup: remove any remaining event handlers that might have been missed
  sanitized = sanitized
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son\w+\s*=\s*[''][^'']*['']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/vbscript:/gi, "");

  return sanitized.trim();
}
