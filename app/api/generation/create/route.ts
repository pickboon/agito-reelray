import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/adapters";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import type { GenerateParams, AspectRatio } from "@/lib/adapters/types";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`generate:${clientIp}`, 20, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      model_id,
      prompt,
      mode,
      reference_image_url,
      aspect_ratio,
      duration,
      seed,
      project_id,
    } = body;

    // Validation
    if (!model_id || !prompt || !mode || !aspect_ratio || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["t2v", "r2v"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    // Get adapter
    const adapter = getAdapter(model_id);
    if (!adapter) {
      return NextResponse.json({ error: "Model not available" }, { status: 400 });
    }

    // Check credits
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (subError || !sub || sub.credits_remaining <= 0) {
      return NextResponse.json(
        { error: "积分不足，请先充值" },
        { status: 402 }
      );
    }

    // Estimate cost
    const cost = await adapter.getCost({
      prompt,
      mode,
      aspectRatio: aspect_ratio as AspectRatio,
      duration,
      referenceImageUrl: reference_image_url,
    });

    if (sub.credits_remaining < cost.credits) {
      return NextResponse.json(
        { error: `积分不足，需要 ${cost.credits} 积分` },
        { status: 402 }
      );
    }

    // Create task record
    const { data: task, error: insertError } = await supabase
      .from("generation_tasks")
      .insert({
        user_id: user.id,
        project_id,
        model_id,
        prompt,
        mode,
        reference_image_url,
        aspect_ratio,
        duration,
        seed,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create task:", insertError);
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 }
      );
    }

    // Submit to adapter
    try {
      const params: GenerateParams = {
        prompt,
        mode,
        aspectRatio: aspect_ratio as AspectRatio,
        duration,
        seed,
        referenceImageUrl: reference_image_url,
      };

      const result = await adapter.submit(params);

      // Update task with task_id
      await supabase
        .from("generation_tasks")
        .update({ task_id: result.taskId, status: "running" })
        .eq("id", task.id);

      // Deduct credits
      await supabase
        .from("subscriptions")
        .update({
          credits_remaining: sub.credits_remaining - cost.credits,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("status", "active");

      // Record credit transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -cost.credits,
        type: "generation",
        balance_after: sub.credits_remaining - cost.credits,
        reference_id: task.id,
      });

      // Update task with credits consumed
      await supabase
        .from("generation_tasks")
        .update({ credits_consumed: cost.credits })
        .eq("id", task.id);

      return NextResponse.json({
        task_id: task.id,
        adapter_task_id: result.taskId,
        status: "running",
      });
    } catch (error) {
      console.error("Adapter submit failed:", error);
      
      // Mark task as failed
      await supabase
        .from("generation_tasks")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Submit failed",
        })
        .eq("id", task.id);

      return NextResponse.json(
        { error: "Failed to submit generation task" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generation create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
