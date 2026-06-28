import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const urlParam = req.nextUrl.searchParams.get("url");
    if (!urlParam) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // 仅允许合法 R2 URL，防止 SSRF
    const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
    if (!r2PublicUrl || !urlParam.startsWith(r2PublicUrl)) {
      return NextResponse.json(
        { error: "Invalid URL: must start with R2_PUBLIC_URL" },
        { status: 400 }
      );
    }

    const response = await fetch(urlParam, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/download]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
