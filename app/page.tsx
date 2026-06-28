import Link from "next/link";
import {
  Film,
  Sparkles,
  Upload,
  Lock,
  Play,
  Check,
  ArrowRight,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";

export default function Home() {
  return (
    <>
      {/* ── NAV (sticky, blur) ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 h-16">
          <Link href="/" className="text-xl font-bold">
            <span className="text-brand-gold">Reel</span>Ray
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/dashboard/templates"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              模板库
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              定价
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              登录
            </Link>
          </div>

          {/* Mobile hamburger */}
          <MobileNav />
        </nav>
      </header>

      <main>
        {/* ── 屏 1: HERO ── */}
        <section
          id="hero"
          className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          <div className="relative z-10 max-w-4xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              你的角色。
              <br />
              <span className="text-brand-gold">始终如一。</span>每一集
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              面向出海短剧创作者的 AI 角色一致性引擎。
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md bg-brand-gold text-background font-semibold hover:bg-brand-gold/90 transition-colors"
              >
                免费开始
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md border border-brand-gold text-brand-gold font-semibold hover:bg-brand-gold/10 transition-colors"
              >
                观看演示
              </a>
            </div>

            <p className="mt-16 text-xs text-muted-foreground/80">
              基于 HappyHorse 1.1 · 生成成功率 96.9%
            </p>
          </div>
        </section>

        {/* ── 屏 2: THE PROBLEM ── */}
        <section id="problem" className="min-h-screen py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              角色&ldquo;换脸&rdquo;，是 AI 短剧最大的硬伤。
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
              没有角色锁定，AI 短剧跨集一致性跌破 40%。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "第 1 集 vs 第 3 集",
                  desc: "同一角色，仅隔两集——面部特征偏移至无法辨认。",
                },
                {
                  title: "光照变化",
                  desc: "不同场景光照彻底改变肤色与面部结构。",
                },
                {
                  title: "角度切换",
                  desc: "一个新机位，主角形象面目全非。",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {item.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Without */}
                    <div className="text-center">
                      <span className="text-xs text-red-400 font-medium">
                        Without ReelRay
                      </span>
                      <div className="mt-2 h-24 rounded-md bg-red-500/10 border border-red-500/30 flex flex-col items-center justify-center">
                        <div className="h-8 w-8 rounded-full bg-red-400/40 mb-1" />
                        <span className="text-[10px] text-red-400/80">
                          Face drift
                        </span>
                      </div>
                    </div>
                    {/* With */}
                    <div className="text-center">
                      <span className="text-xs text-green-400 font-medium">
                        With ReelRay
                      </span>
                      <div className="mt-2 h-24 rounded-md bg-green-500/10 border border-green-500/30 flex flex-col items-center justify-center">
                        <div className="h-8 w-8 rounded-full bg-green-400/40 mb-1" />
                        <span className="text-[10px] text-green-400/80">
                          Locked ✓
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 屏 3: HOW IT WORKS ── */}
        <section
          id="how-it-works"
          className="py-24 px-6 bg-secondary/30"
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">
              工作原理
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {[
                {
                  icon: Upload,
                  step: "01",
                  title: "上传参考照片",
                  desc: "提供数张角色清晰照片，涵盖不同角度。",
                },
                {
                  icon: Sparkles,
                  step: "02",
                  title: "AI 生成角色锚点",
                  desc: "模型基于参考构建稳定的身份锚点。",
                },
                {
                  icon: Lock,
                  step: "03",
                  title: "逐帧锁定锚点",
                  desc: "每一帧画面均受锚点身份约束。",
                },
                {
                  icon: Film,
                  step: "04",
                  title: "导出至 TikTok / YouTube",
                  desc: "下载角色全程一致的成片，直接发布。",
                },
              ].map((item, i) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="text-center flex-1">
                    <div className="mx-auto h-12 w-12 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
                      <item.icon className="h-5 w-5 text-brand-gold" />
                    </div>
                    <p className="text-brand-gold font-mono text-sm mb-1">
                      步骤 {item.step}
                    </p>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  {/* Desktop arrow between steps */}
                  {i < 3 && (
                    <div className="hidden lg:flex items-center pt-5 text-muted-foreground/40">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 屏 4: SEE IT IN ACTION ── */}
        <section id="demo" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">
              效果对比
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "复仇", color: "bg-red-500/20 text-red-400" },
                { label: "甜宠", color: "bg-pink-500/20 text-pink-400" },
                { label: "悬疑", color: "bg-blue-500/20 text-blue-400" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="p-4">
                    <span
                      className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${item.color}`}
                    >
                      {item.label}
                    </span>
                  </div>

                  <div className="px-4">
                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative">
                      <button type="button" aria-label="播放演示视频" className="h-12 w-12 rounded-full bg-brand-gold/80 flex items-center justify-center hover:bg-brand-gold transition-colors">
                        <Play className="h-5 w-5 text-background ml-0.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground p-4 text-center">
                    演示视频制作中，敬请期待
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              前后对比工具即将上线——真实演示片段正在制作中。
            </p>
          </div>
        </section>

        {/* ── 屏 5: PRICING + CTA ── */}
        <section id="pricing" className="py-24 px-6 bg-secondary/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              选择适合你的方案
            </h2>
            <p className="text-center text-muted-foreground mb-16">
              选择匹配你产能的方案。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Starter",
                  price: "¥149",
                  credits: "20,000 额度",
                  episodes: "约 2 集",
                  popular: false,
                  features: [
                    "角色锚点锁定",
                    "720p 导出",
                    "邮件支持",
                    "TikTok 格式输出",
                  ],
                },
                {
                  name: "Pro",
                  price: "¥499",
                  credits: "80,000 额度",
                  episodes: "约 8 集",
                  popular: true,
                  features: [
                    "包含 Starter 全部功能",
                    "1080p 导出",
                    "优先渲染",
                    "自定义角色预设",
                    "YouTube Shorts 支持",
                  ],
                },
                {
                  name: "Studio",
                  price: "¥1,499",
                  credits: "300,000 额度",
                  episodes: "约 30 集",
                  popular: false,
                  features: [
                    "包含 Pro 全部功能",
                    "4K 导出",
                    "专属渲染队列",
                    "团队协作",
                    "API 访问",
                    "优先支持",
                  ],
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-lg p-6 flex flex-col ${
                    plan.popular
                      ? "bg-card border-2 border-brand-gold/50 relative"
                      : "bg-card border border-border"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gold text-background text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      最受欢迎
                    </span>
                  )}

                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-4 mb-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/月</span>
                  </div>
                  <p className="text-brand-cyan text-sm font-medium">
                    {plan.credits}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    {plan.episodes}
                  </p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="h-4 w-4 text-brand-gold shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/login"
                    className={`w-full text-center py-3 rounded-md font-medium transition-colors ${
                      plan.popular
                        ? "bg-brand-gold text-background hover:bg-brand-gold/90"
                        : "border border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    订阅
                  </Link>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-16">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md bg-brand-gold text-background font-semibold text-lg hover:bg-brand-gold/90 transition-colors"
              >
                免费开始
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                按量购买资源包？{" "}
                <Link
                  href="/pricing"
                  className="text-brand-gold hover:underline"
                >
                  查看定价详情
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-8 border-t border-border px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 Agito Technology (Jinan) Co., Ltd.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/templates"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              模板库
            </Link>
            <Link
              href="/pricing"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              定价
            </Link>
            <Link
              href="/contact"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              联系我们
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
