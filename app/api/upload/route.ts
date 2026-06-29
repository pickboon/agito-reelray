import { NextRequest, NextResponse } from "next/server";
import { putR2Object, generateR2Key } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

// 文件 magic bytes 校验
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return false;
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => buffer[i] === byte);
}

// S-06: 从 buffer 解析图片尺寸
function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  if (mimeType === "image/png" && buffer.length > 24) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        if (offset + 9 < buffer.length) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
      }
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
    return null;
  }
  if (mimeType === "image/webp" && buffer.length > 30) {
    const width = (buffer.readUInt16LE(26) & 0x3FFF);
    const height = (buffer.readUInt16LE(28) & 0x3FFF);
    return { width, height };
  }
  return null;
}

const MAX_DIMENSION = 8192;
const MIN_DIMENSION = 64;
const MAX_ASPECT_RATIO = 50;

export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }

    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`upload:${clientIp}`, 20, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authorization required" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // S-06: 图片尺寸验证
    const dims = getImageDimensions(buffer, file.type);
    if (dims) {
      if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
        return NextResponse.json({ error: "Image dimensions exceed maximum (8192px)" }, { status: 400 });
      }
      if (dims.width < MIN_DIMENSION || dims.height < MIN_DIMENSION) {
        return NextResponse.json({ error: "Image dimensions below minimum (64px)" }, { status: 400 });
      }
      const aspectRatio = Math.max(dims.width, dims.height) / Math.max(1, Math.min(dims.width, dims.height));
      if (aspectRatio > MAX_ASPECT_RATIO) {
        return NextResponse.json({ error: "Image aspect ratio exceeds limit" }, { status: 400 });
      }
    }

    // D-05: NSFW 检测预留接口
    if (process.env.ENABLE_NSFW_CHECK === "true") {
      // TODO: 接入第三方 NSFW 检测 API (Google Vision / AWS Rekognition)
      logger.warn("upload", "NSFW check endpoint reached but no provider configured");
    }

    const key = generateR2Key("uploads", file.name);
    const url = await putR2Object(key, buffer, file.type);

    return NextResponse.json({ url, key });
  } catch (error) {
    logger.error("upload", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
