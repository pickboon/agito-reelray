import { NextRequest, NextResponse } from "next/server";
import { getR2SignedUrl } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get("url");
    if (!urlParam) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // If it's an external URL (e.g., HappyHorse output), proxy it
    const isInternal = urlParam.includes(process.env.CLOUDFLARE_R2_PUBLIC_URL || "r2.cloudflarestorage.com");

    if (isInternal) {
      // Generate signed URL for internal R2 objects
      const key = urlParam.split("/").slice(-2).join("/");
      const signedUrl = await getR2SignedUrl(key);
      return NextResponse.json({ url: signedUrl });
    }

    // Proxy external video
    const response = await fetch(urlParam);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
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
