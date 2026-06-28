"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, LogIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const error = searchParams.get("error");

  async function handleGitHubLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-gold/10">
            <Film className="h-6 w-6 text-brand-gold" />
          </div>
          <CardTitle className="text-2xl text-foreground">ReelRay</CardTitle>
          <CardDescription className="text-muted-foreground">
            Lock Your Characters. Go Global.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Authentication failed. Please try again.
            </div>
          )}
          <Button
            onClick={handleGitHubLogin}
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Continue with GitHub
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
