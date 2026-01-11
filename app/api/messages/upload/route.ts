// app/api/messages/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  // PDF
  "application/pdf",
];

/**
 * Generate a unique filename preserving original extension
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = originalName.split(".").pop() || "";
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Validate MIME type
 */
function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any | undefined;
    const userId = currentUser?.id as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 3. Validate file type
    const mimeType = file.type;
    if (!isValidMimeType(mimeType)) {
      return NextResponse.json(
        { ok: false, message: "지원하지 않는 파일 형식입니다. 이미지(JPG, PNG, WebP, GIF) 또는 PDF만 지원합니다." },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, message: `파일이 너무 큽니다. 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 허용됩니다.` },
        { status: 400 }
      );
    }

    // 5. Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // 6. Generate unique filename preserving extension
    const filename = generateUniqueFilename(file.name);
    const filepath = join(uploadsDir, filename);

    // 7. Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filepath, buffer);

    // 8. Return public URL and file info
    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json(
      {
        ok: true,
        url: publicUrl,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[messages/upload] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || "파일 업로드 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

