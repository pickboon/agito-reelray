"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Film, Github, Loader2, LogIn } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setFormError("登录失败，请重试");
        return;
      }

      router.push(redirectTo);
    } catch {
      setFormError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }

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
            锁定你的角色
          </CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            用 AI 锚定角色一致性，出海短剧每一集都精准
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error ?? formError) && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              登录失败，请重试
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              size="lg"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {loading ? "加载中…" : "登录"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或</span>
            </div>
          </div>

          <Button
            onClick={handleGitHubLogin}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Github className="mr-2 h-4 w-4" />
            使用 GitHub 登录
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            登录即表示同意我们的{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              服务条款
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          加载中…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}