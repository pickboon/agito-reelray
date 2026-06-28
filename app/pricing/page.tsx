"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star, Sparkles, Coins, Crown } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "¥149",
    period: "/mo",
    credits: "20,000",
    discount: "25% off standard rate",
    icon: Zap,
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    border: "border-brand-cyan/20",
    features: [
      "~2 集 720p 短剧生成",
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
    price: "¥499",
    period: "/mo",
    credits: "80,000",
    discount: "38% off standard rate",
    icon: Star,
    color: "text-brand-gold",
    bg: "bg-brand-gold/10",
    border: "border-brand-gold/30",
    popular: true,
    features: [
      "~8 集 720p 短剧生成",
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
    price: "¥1,499",
    period: "/mo",
    credits: "300,000",
    discount: "50% off standard rate",
    icon: Crown,
    color: "text-brand-gold",
    bg: "bg-brand-gold/10",
    border: "border-brand-gold/30",
    features: [
      "~30 集 720p 短剧生成",
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
    name: "Small Pack",
    price: "¥500",
    credits: "45,000",
    desc: "适合小规模测试",
    icon: Coins,
    bundleId: "small",
  },
  {
    name: "Medium Pack",
    price: "¥2,000",
    credits: "200,000",
    desc: "适合连续生产",
    icon: Sparkles,
    bundleId: "medium",
  },
  {
    name: "Large Pack",
    price: "¥5,000",
    credits: "600,000",
    desc: "适合工作室批量",
    icon: Zap,
    bundleId: "large",
  },
];

export default function PricingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (type: "subscription" | "bundle", id: string) => {
    setCheckoutLoading(id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "subscription" ? { type, plan: id } : { type, bundle: id }
        ),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Checkout failed");
      }
    } catch {
      alert("Request failed");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-brand-gold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            ReelRay
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Choose Your{" "}
            <span className="text-brand-gold">Plan</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Credits 积分制，按用量计费。套餐锁定折扣，资源包按需购买，超额自动续费。
          </p>
          <p className="text-sm text-muted-foreground/60">
            ¥1 = 100 Credits · 1 集 720p ≈ 10,000 Credits
          </p>
        </div>

        {/* Subscription Plans */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
            Subscription Plans
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.planId}
                className={`relative ${plan.border} ${plan.popular ? "ring-1 ring-brand-gold/50" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-gold text-background">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <div
                    className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${plan.bg}`}
                  >
                    <plan.icon className={`h-6 w-6 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
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
                    onClick={() => handleCheckout("subscription", plan.planId)}
                  >
                    {checkoutLoading === plan.planId
                      ? "Loading..."
                      : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Credit Bundles */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
            Credit Bundles
          </h2>
          <p className="text-center text-sm text-muted-foreground -mt-4 mb-8">
            预付费，无月费，用完结。适合按需采购的工作室。
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {BUNDLES.map((bundle) => (
              <Card key={bundle.bundleId} className="border-border">
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
                    onClick={() => handleCheckout("bundle", bundle.bundleId)}
                  >
                    {checkoutLoading === bundle.bundleId
                      ? "Loading..."
                      : "Purchase"}
                  </Button>
                </CardContent>
              </Card>
            ))}
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
