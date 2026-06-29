import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/adapters";

export async function GET(request: NextRequest) {
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

    // Get task from database
    const { data: task, error } = await supabase
      .from("generation_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If task is still running, poll the adapter
    if (task.status === "running" && task.task_id) {
      try {
        const adapter = getAdapter(task.model_id);
        const result = await adapter.poll(task.task_id);

        // Update task with new status
        const updateData: Record<string, any> = {
          status: result.status,
          elapsed_seconds: result.elapsed_seconds,
          updated_at: new Date().toISOString(),
        };

        if (result.status === "completed") {
          updateData.video_url = result.videoUrl;
          updateData.thumbnail_url = result.thumbnailUrl;
        } else if (result.status === "failed") {
          updateData.error_message = result.errorMessage;
        }

        await supabase
          .from("generation_tasks")
          .update(updateData)
          .eq("id", taskId);

        return NextResponse.json({
          ...task,
          ...updateData,
        });
      } catch (error) {
        console.error("Adapter poll failed:", error);
        // Return current task data even if poll fails
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
