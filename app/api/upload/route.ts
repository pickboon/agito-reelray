import { NextRequest, NextResponse } from "next/server";
import { putR2Object, generateR2Key } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

// P3-8: 文件 magic bytes 校验
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return false;
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => buffer[i] === byte);
}

export async function POST(req: NextRequest) {
  try {
    // P2-6: CSRF 验证
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }

    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(`upload:${clientIp}`, 20, 60000)) {
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
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // P3-8: magic bytes 校验，防止 MIME 伪造
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const key = generateR2Key("uploads", file.name);
    const url = await putR2Object(key, buffer, file.type);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
