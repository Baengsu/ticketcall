/**
 * Client-side image compression utilities
 * Converts images to WebP format with resizing and quality control
 */

import imageCompression from "browser-image-compression";

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
  fileType?: string;
}

/**
 * Compress and convert image to WebP format
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed File object
 * @throws Error if file is too large or compression fails
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    maxSizeMB = 3,
    fileType = "image/webp",
  } = options;

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error(
      "지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 지원합니다."
    );
  }

  // Check initial file size
  const initialSizeMB = file.size / (1024 * 1024);
  if (initialSizeMB > maxSizeMB * 2) {
    // If file is more than 2x the max size, reject early
    throw new Error(
      `이미지가 너무 큽니다. 최대 ${maxSizeMB * 2}MB까지 허용됩니다.`
    );
  }

  try {
    // Compress image
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      fileType,
      initialQuality: quality,
      alwaysKeepResolution: false,
    });

    // Check final size
    const finalSizeMB = compressedFile.size / (1024 * 1024);
    if (finalSizeMB > maxSizeMB) {
      // If still too large, try more aggressive compression
      const moreCompressed = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight: Math.max(maxWidth, maxHeight) * 0.8,
        useWebWorker: true,
        fileType,
        initialQuality: quality * 0.7,
        alwaysKeepResolution: false,
      });

      const moreCompressedSizeMB = moreCompressed.size / (1024 * 1024);
      if (moreCompressedSizeMB > maxSizeMB) {
        throw new Error(
          `이미지를 ${maxSizeMB}MB 이하로 압축할 수 없습니다. 더 작은 이미지를 사용해 주세요.`
        );
      }

      return moreCompressed;
    }

    return compressedFile;
  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error("이미지 압축 중 오류가 발생했습니다.");
  }
}

/**
 * Validate image file before compression
 * @param file - File to validate
 * @returns true if valid, throws error if invalid
 */
export function validateImageFile(file: File): boolean {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const fileType = file.type.toLowerCase();

  if (!allowedTypes.includes(fileType)) {
    throw new Error(
      "지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 지원합니다."
    );
  }

  // Check file size (max 10MB before compression)
  const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeBeforeCompression) {
    throw new Error(
      "이미지가 너무 큽니다. 최대 10MB까지 허용됩니다."
    );
  }

  return true;
}
