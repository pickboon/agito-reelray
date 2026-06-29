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
import { Suspense, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { safeRedirect } from "@/lib/redirect";
import { toast } from "sonner";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = safeRedirect(searchParams.get("redirectTo"), "/dashboard");
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleEmailLogin = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      toast.error("登录失败次数过多，请稍后重试");
      return;
    }
    setFormError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        if (newCount >= MAX_FAILED_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION_MS;
          setLockoutUntil(until);
          setFormError("登录失败次数过多，请 60 秒后重试");
          setTimeout(() => {
            setLockoutUntil(null);
            setFailedAttempts(0);
            setFormError(null);
          }, LOCKOUT_DURATION_MS);
        } else {
          setFormError(`登录失败，请重试 (${newCount}/${MAX_FAILED_ATTEMPTS})`);
        }
        return;
      }

      setFailedAttempts(0);
      router.push(redirectTo);
    } catch {
      setFormError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [email, password, redirectTo, router, failedAttempts, isLockedOut]);

  const buildOAuthRedirect = useCallback(() => {
    return `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [redirectTo]);

  const handleOAuth = useCallback(async (provider: "github" | "google" | "apple") => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: buildOAuthRedirect() },
      });
      if (error) {
        toast.error("该登录方式暂未启用，请使用邮箱登录");
      }
    } catch {
      toast.error("该登录方式暂未启用，请使用邮箱登录");
    }
  }, [buildOAuthRedirect]);

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
              {formError ?? "登录失败，请重试"}
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
                disabled={loading || isLockedOut}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isLockedOut}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              size="lg"
              disabled={loading || !email || !password || isLockedOut}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {loading ? "加载中…" : isLockedOut ? "请稍后重试" : "登录"}
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

          <div className="grid grid-cols-2 gap-2">
            {/* F-01: 微信登录暂不支持 */}
            <Button
              variant="outline"
              size="sm"
              className="col-span-2 opacity-50 cursor-not-allowed"
              disabled
              title="微信登录即将上线"
            >
              <Film className="mr-2 h-4 w-4" />
              微信登录（即将上线）
            </Button>
            <Button
              onClick={() => handleOAuth("google")}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button
              onClick={() => handleOAuth("apple")}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </Button>
            <Button
              onClick={() => handleOAuth("github")}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            登录即表示同意我们的{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              服务条款
            </Link>{" "}
            和{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              隐私政策
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
