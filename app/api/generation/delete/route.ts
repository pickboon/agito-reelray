import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
    }

    const { data: task } = await supabase
      .from("generation_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("generation_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("Delete task error:", error);
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
