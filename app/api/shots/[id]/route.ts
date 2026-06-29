import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/shots/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: shot, error } = await supabase
      .from("shots")
      .select("*, episodes(id, project_id, projects(user_id))")
      .eq("id", id)
      .single();

    if (error || !shot) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    const ep = shot.episodes as unknown as { projects: { user_id: string } };
    const projectUserId = (ep.projects as { user_id: string }).user_id;

    if (projectUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(shot);
  } catch (error) {
    console.error("[GET /api/shots/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/shots/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`shots-update:${clientIp}`, 30, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: shot, error: fetchError } = await supabase
      .from("shots")
      .select("*, episodes(id, project_id, projects(user_id))")
      .eq("id", id)
      .single();

    if (fetchError || !shot) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    const ep = shot.episodes as unknown as { projects: { user_id: string } };
    const projectUserId = (ep.projects as { user_id: string }).user_id;

    if (projectUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { prompt, reference_character_id, status } = body;

    const updates: Record<string, unknown> = {};
    if (prompt !== undefined) updates.prompt = prompt.trim();
    if (reference_character_id !== undefined) {
      updates.reference_character_id = reference_character_id || null;
    }
    if (status !== undefined) {
      updates.status = status;
      updates.updated_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updatedShot, error } = await supabase
      .from("shots")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/shots/[id]]", error);
      return NextResponse.json({ error: "Failed to update shot" }, { status: 500 });
    }

    return NextResponse.json(updatedShot);
  } catch (error) {
    console.error("[PATCH /api/shots/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/shots/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`shots-delete:${clientIp}`, 20, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: shot, error: fetchError } = await supabase
      .from("shots")
      .select("*, episodes(id, project_id, projects(user_id))")
      .eq("id", id)
      .single();

    if (fetchError || !shot) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    const ep = shot.episodes as unknown as { projects: { user_id: string } };
    const projectUserId = (ep.projects as { user_id: string }).user_id;

    if (projectUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("shots")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/shots/[id]]", error);
      return NextResponse.json({ error: "Failed to delete shot" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/shots/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
