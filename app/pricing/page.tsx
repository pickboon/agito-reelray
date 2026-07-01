"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Zap,
  Star,
  Sparkles,
  Coins,
  Crown,
} from "lucide-react";
import { getCsrfHeader } from "@/lib/csrf";
import { apiFetch } from "@/lib/api-fetch";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* ── 常量 ──────────────────────────────────────────────── */

const PLANS = [
  {
    name: "Starter",
    emoji: "🟢",
    price: "¥149",
    priceNum: 149,
    period: "/月",
    credits: "20,000",
    discount: "75折 标准价",
    icon: Zap,
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    border: "border-brand-cyan/20",
    features: [
      "约 2 集 720p 短剧生成",
      "角色参考图锚定 (r2v)",
      "4 套出海模板",
      "TikTok 9:16 / YT 16:9",
      "智能助手基础建议",
      "Email 支持",
    ],
    planId: "starter",
  },
  {
    name: "Pro",
    emoji: "🟣",
    price: "¥499",
    priceNum: 499,
    period: "/月",
    credits: "80,000",
    discount: "62折 标准价",
    icon: Star,
    color: "text-brand-gold",
    bg: "bg-brand-gold/10",
    border: "border-brand-gold/30",
    popular: true,
    features: [
      "约 8 集 720p 短剧生成",
      "角色参考图锚定 (r2v)",
      "4 套出海模板 + 自定义",
      "TikTok/YT 双格式",
      "智能助手完整功能",
      "多语种配音支持",
      "优先队列",
      "Chat 支持",
    ],
    planId: "pro",
  },
  {
    name: "Studio",
    emoji: "🔵",
    price: "¥1,499",
    priceNum: 1499,
    period: "/月",
    credits: "300,000",
    discount: "5折 标准价",
    icon: Crown,
    color: "text-brand-gold",
    bg: "bg-brand-gold/10",
    border: "border-brand-gold/30",
    features: [
      "约 30 集 720p 短剧生成",
      "全部 Pro 功能",
      "1080p 优先输出",
      "批量生成",
      "团队共享额度 (3 seats)",
      "API 访问",
      "优先支持",
      "SLA 保证",
    ],
    planId: "studio",
  },
];

const BUNDLES = [
  {
    name: "小包",
    price: "¥500",
    credits: "45,000",
    desc: "适合小规模测试",
    icon: Coins,
    bundleId: "small",
  },
  {
    name: "中包",
    price: "¥2,000",
    credits: "200,000",
    desc: "适合连续生产",
    icon: Sparkles,
    bundleId: "medium",
  },
  {
    name: "大包",
    price: "¥5,000",
    credits: "600,000",
    desc: "适合工作室批量",
    icon: Zap,
    bundleId: "large",
  },
];

/* ── 页面 ──────────────────────────────────────────────── */

export default function PricingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [episodesCount, setEpisodesCount] = useState<number>(10);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const router = useRouter();

  const handleCheckout = async (
    type: "subscription" | "bundle",
    id: string,
  ) => {
    // 未登录用户引导至登录页
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent("/pricing")}`);
      return;
    }

    setCheckoutLoading(id);
    setCheckoutError(null);
    try {
      const res = await apiFetch("/api/stripe/checkout", {
        method: "POST",
        json: type === "subscription" ? { type, plan: id } : { type, bundle: id },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? "结算失败");
        setTimeout(() => setCheckoutError(null), 3000);
      }
    } catch {
      setCheckoutError("请求失败，请重试");
      setTimeout(() => setCheckoutError(null), 3000);
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold text-brand-gold flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            ReelRay
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            登录
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-3">
          <p className="text-xs tracking-[0.3em] text-brand-cyan/70 italic">
            POWER UP YOUR UNIVERSE
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            注入能量，<span className="text-brand-gold">解锁你的宇宙</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Credits 积分制，按用量计费。套餐锁定折扣，资源包按需购买，超额自动续费。
          </p>
          <p className="text-sm text-muted-foreground/60">
            1 集 720p 短片 约消耗 10,000 Credits
          </p>
        </div>

        {/* 月度 / 年度 切换 */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-brand-cyan text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              月度订阅
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-brand-cyan text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              年度订阅
              <span className="rounded-full bg-brand-green/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-green">
                省20%
              </span>
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {checkoutError && (
          <div className="max-w-md mx-auto rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
            {checkoutError}
          </div>
        )}

        {/* 订阅套餐 */}
        <section>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const yearlyMonthly = Math.round(plan.priceNum * 0.8);
              const yearlyTotal = yearlyMonthly * 12;

              return (
                <Card
                  key={plan.planId}
                  className={`relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-brand-gold/30 hover:shadow-[0_0_40px_-8px_rgba(250,204,21,0.15)] transition-all duration-300 ${
                    plan.popular
                      ? "ring-1 ring-brand-gold/40"
                      : ""
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-gold text-background shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                      🔥 最受欢迎
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-4">
                    <span className="text-3xl mb-2 block">{plan.emoji}</span>
                    <CardTitle className="font-heading text-xl uppercase tracking-wider">
                      {plan.name}
                    </CardTitle>
                    <div className="mt-3">
                      {billingCycle === "monthly" ? (
                        <>
                          <span className="text-4xl font-bold text-foreground">
                            {plan.price}
                          </span>
                          <span className="text-muted-foreground">
                            {plan.period}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-foreground">
                            ¥{yearlyMonthly}
                          </span>
                          <span className="text-muted-foreground">
                            {plan.period}
                          </span>
                          <p className="mt-1 text-xs text-muted-foreground/60">
                            ×12 = ¥{yearlyTotal.toLocaleString()}/年
                          </p>
                        </>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {plan.credits} Credits · {plan.discount}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-cyan" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full gap-1.5"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={checkoutLoading === plan.planId}
                      onClick={() =>
                        handleCheckout("subscription", plan.planId)
                      }
                    >
                      {checkoutLoading === plan.planId
                        ? "处理中..."
                        : "订阅"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 充值包 */}
        <section className="mt-8">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
            充值包
          </h2>
          <p className="text-center text-sm text-muted-foreground -mt-4 mb-8">
            预付费，无月费，用完结。适合按需采购的工作室。
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {BUNDLES.map((bundle) => (
              <Card key={bundle.bundleId} className="frosted-card card-hover-lift">
                <CardHeader className="text-center pb-2">
                  <bundle.icon className="mx-auto h-8 w-8 text-brand-gold mb-2" />
                  <CardTitle className="text-base">{bundle.name}</CardTitle>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {bundle.price}
                    </span>
                  </div>
                  <CardDescription>{bundle.credits} Credits</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground text-center mb-4">
                    {bundle.desc}
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={checkoutLoading === bundle.bundleId}
                    onClick={() =>
                      handleCheckout("bundle", bundle.bundleId)
                    }
                  >
                    {checkoutLoading === bundle.bundleId
                      ? "处理中..."
                      : "购买"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* C-08: Credits 计算器 */}
        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-2">
            Credits 预估计算器
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8">
            基于 720p、每镜头 5 秒、约 10 镜头/集估算
          </p>
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-foreground whitespace-nowrap">
                计划集数
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={episodesCount}
                onChange={(e) => setEpisodesCount(parseInt(e.target.value))}
                className="flex-1 accent-brand-gold"
              />
              <span className="text-lg font-bold text-foreground w-12 text-right">
                {episodesCount}
              </span>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预估 Credits</span>
                <span className="font-semibold text-foreground">
                  {(episodesCount * 10000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">推荐套餐</span>
                <span className="font-semibold text-brand-gold">
                  {episodesCount <= 4
                    ? "Starter (149)"
                    : episodesCount <= 16
                      ? "Pro (499)"
                      : "Studio (1,499)"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预估费用</span>
                <span className="font-semibold text-foreground">
                  {episodesCount <= 4
                    ? "149"
                    : episodesCount <= 16
                      ? "499"
                      : "1,499"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Link */}
        <div className="text-center border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            有疑问？{" "}
            <Link href="/" className="text-brand-gold hover:underline">
              查看完整功能对比
            </Link>{" "}
            ·{" "}
            <span className="text-muted-foreground/60">
              企业定制方案请联系
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
