import Link from "next/link";
import { Zap, Globe, Brain, Film, User } from "lucide-react";
import MobileNav from "@/components/MobileNav";

export default function Home() {
  return (
    <>
      {/* ── NAV (sticky, blur) ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav aria-label="主导航" className="flex items-center justify-between max-w-7xl mx-auto px-6 h-16">
          <Link href="/" className="text-xl font-bold">
            <span className="text-brand-gold">Reel</span>Ray
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              工作台
            </Link>
            <Link href="/dashboard/templates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              模板库
            </Link>
            <Link href="/dashboard/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              极光社区
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              定价
            </Link>
            <div className="h-4 w-px bg-border" />
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-brand-cyan/30">
              EN / 中
            </button>
            <span className="text-xs text-brand-cyan px-3 py-1 rounded-full border border-brand-cyan/20 bg-brand-cyan/5">
              🎁 1,500 积分
            </span>
            <Link href="/dashboard/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            </Link>
          </div>

          <MobileNav />
        </nav>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
          {/* 全屏赛博朋克背景视频 */}
          <video
            className="absolute inset-0 w-full h-full object-cover"
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
              <span className="glitch-title text-brand-cyan text-glow-cyan" data-text="重塑现实，即刻开机">
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
              ] as const).map((card) => (
                <div
                  key={card.title}
                  className={`frosted-card rounded-xl p-8 flex flex-col items-center text-center ${card.borderHover} transition-all group`}
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
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-8 border-t border-border px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 Agito Technology (Jinan) Co., Ltd.{process.env.NEXT_PUBLIC_ICP_NUMBER ? ` | ${process.env.NEXT_PUBLIC_ICP_NUMBER}` : ""}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/dashboard/templates" className="text-xs text-muted-foreground hover:text-foreground transition-colors">模板库</Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">定价</Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">联系我们</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

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
