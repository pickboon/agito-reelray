"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Zap, Globe, Brain, Film } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import DemoShowcase from "@/components/DemoShowcase";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // 部分浏览器需用户交互后才允许播放，静默失败
      });
    }
  }, []);

  return (
    <>
      {/* ── NAV (reusable) ── */}
      <PublicNav />

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
          {/* 全屏赛博朋克背景视频 */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover hero-bg-video-parallax"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src="/demos/warlord_return.mp4" type="video/mp4" />
          </video>
          {/* 深色遮罩 + 微粒光尘 */}
          <div className="hero-bg-video" />
          {/* 粒子 */}
          <div className="particles-bg">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="particle-dot" style={{
                left: `${Math.random() * 100}%`,
                bottom: "-5%",
                animationDuration: `${6 + Math.random() * 10}s`,
                animationDelay: `${Math.random() * 8}s`,
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
              }} />
            ))}
          </div>
          {/* 微光尘 */}
          <div className="light-dust" />

          <div className="relative z-10 max-w-5xl">
            {/* 标签 */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/20 bg-brand-cyan/5 text-xs text-brand-cyan mb-8">
              <Zap className="h-3 w-3" />
              AI-Powered Sci-Fi Series Generator
            </div>

            {/* 故障风标题 */}
            <h1 className="relative text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
              <span className="glitch-title text-brand-cyan text-glow-cyan" data-text="重塑现实，即刻开机" style={{ fontFamily: "var(--font-glitch)" }}>
                重塑现实，即刻开机
              </span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl text-muted-foreground font-normal tracking-[0.3em] uppercase">
                REDEFINE REALITY
              </span>
            </h1>

            <p className="mt-8 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              全球首个 AI 驱动的科幻短剧生成平台。<br className="sm:hidden" />
              一键输入灵感，一分钟输出大片。
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md bg-brand-cyan text-background font-semibold text-lg animate-hero-btn hover:bg-brand-cyan/90 transition-all"
              >
                <Zap className="h-5 w-5" />
                立即生成短剧
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md border border-brand-cyan text-brand-cyan font-semibold text-lg hover:bg-brand-cyan/10 hover:shadow-[0_0_20px_rgba(102,252,241,0.2)] transition-all"
              >
                <Film className="h-5 w-5" />
                观看演示
              </Link>
            </div>

            <div className="gradient-divider h-px w-32 mx-auto mt-12 mb-6" />
            <p className="text-xs text-brand-cyan/70">
              Seedance · Kling · HappyHorse 多模型驱动 · 生成成功率 96.9%
            </p>
          </div>

          {/* 向下滚动指示 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40">
            <span className="text-[10px] uppercase tracking-widest">探索功能</span>
            <div className="w-4 h-6 rounded-full border border-muted-foreground/30 flex justify-center pt-1">
              <div className="w-1 h-1.5 rounded-full bg-brand-cyan/60 animate-bounce" />
            </div>
          </div>
        </section>

        {/* ── BENTO BOX: 核心功能特性 ── */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                <span className="text-brand-cyan">AI</span> 短剧全链路解决方案
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                从剧本到分发，一站式覆盖短剧创作全流程
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {([
                {
                  icon: Brain,
                  iconClass: "text-brand-purple",
                  bgClass: "bg-brand-purple/10",
                  dotClass: "bg-brand-purple/60",
                  borderHover: "hover:border-brand-purple/30",
                  dividerClass: "via-brand-purple/15",
                  title: "剧本智核矩阵",
                  subtitle: "AI 自动扩写、分镜拆解",
                  bullets: ["智能剧本扩写引擎", "一键分镜拆解", "角色关系图谱生成"],
                },
                {
                  icon: Film,
                  iconClass: "text-brand-cyan",
                  bgClass: "bg-brand-cyan/10",
                  dotClass: "bg-brand-cyan/60",
                  borderHover: "hover:border-brand-cyan/30",
                  dividerClass: "via-brand-cyan/15",
                  title: "全模态资产生成",
                  subtitle: "场景、角色、配音一键生成",
                  bullets: ["场景概念图生成", "角色锚点锁定", "多语言配音合成"],
                },
                {
                  icon: Globe,
                  iconClass: "text-brand-green",
                  bgClass: "bg-brand-green/10",
                  dotClass: "bg-brand-green/60",
                  borderHover: "hover:border-brand-green/30",
                  dividerClass: "via-brand-green/15",
                  title: "全球无缝分发",
                  subtitle: "一键多语种翻译与格式适配",
                  bullets: ["TikTok / YouTube 直出", "15+ 语种自动翻译", "多平台格式自动适配"],
                },
              ] as const).map((card, index) => (
                <div
                  key={card.title}
                  className={`frosted-card rounded-xl p-8 flex flex-col items-center text-center ${card.borderHover} transition-all group animate-fade-in-up ${index === 0 ? "delay-0" : index === 1 ? "delay-200" : "delay-400"}`}
                >
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl glow-circle ${card.bgClass} mb-6`}>
                    <card.icon className={`h-8 w-8 ${card.iconClass}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{card.subtitle}</p>
                  <ul className="space-y-2 text-left w-full">
                    {card.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${card.dotClass} shrink-0`} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-auto pt-6 w-full h-px bg-gradient-to-r from-transparent ${card.dividerClass} to-transparent`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── B7 样片展示 ── */}
        <DemoShowcase />

      </main>

      {/* ── FOOTER (reusable) ── */}
      <PublicFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "ReelRay",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Web",
            "description": "全球首个 AI 驱动的科幻短剧生成平台。一键输入灵感，一分钟输出大片。Seedance / Kling / HappyHorse 多模型驱动。",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "100",
              "bestRating": "5",
              "worstRating": "1",
            },
            "offers": [
              { "@type": "Offer", "name": "Starter", "price": "149", "priceCurrency": "CNY" },
              { "@type": "Offer", "name": "Pro", "price": "499", "priceCurrency": "CNY" },
              { "@type": "Offer", "name": "Studio", "price": "1499", "priceCurrency": "CNY" },
            ],
          }),
        }}
      />
    </>
  );
}
