import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { safeRedirect } from "@/lib/redirect";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const redirectTo = safeRedirect(searchParams.get("redirectTo"), "/dashboard");

    if (code) {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
      if (!supabaseKey) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");

      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data: { user } } = await supabase.auth.getUser();

        // L-05 修复: 添加 user_id 过滤
        if (user) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!sub) {
            const { error: insertErr } = await supabase.from("subscriptions").insert({
              user_id: user.id,
              plan: "free",
              credits_remaining: 1000,
              credits_total: 1000,
            });
            if (insertErr) {
              console.error("[auth/callback] subscriptions insert error:", insertErr.message);
            }
          }
        }

        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    }

    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  } catch (error) {
    console.error("[auth/callback] Unexpected error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
