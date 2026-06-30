import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";

// GET /api/user/settings — 读取用户设置
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("visual_style, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to read settings" }, { status: 500 });
    }

    return NextResponse.json({
      visual_style: data?.visual_style ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (error) {
    console.error("[GET /api/user/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/user/settings — 更新用户设置（upsert）
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { visual_style } = body;

    if (visual_style === undefined) {
      return NextResponse.json({ error: "Missing visual_style" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          visual_style,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("visual_style, updated_at")
      .single();

    if (error) {
      console.error("[POST /api/user/settings]", error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[POST /api/user/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
