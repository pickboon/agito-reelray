import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/templates/user — 获取用户自己的模板
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: templates, error } = await supabase
      .from("user_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/templates/user]", error);
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }

    return NextResponse.json({ templates: templates ?? [] });
  } catch (error) {
    console.error("[GET /api/templates/user]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/templates/user — 删除模板
export async function DELETE(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`templates-delete:${clientIp}`, 30, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "Missing template id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/templates/user]", error);
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/templates/user]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
