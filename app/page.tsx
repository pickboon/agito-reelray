import Link from "next/link";
import {
  Film,
  Sparkles,
  Upload,
  Lock,
  Play,
  Check,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

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
              Templates
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-md bg-brand-gold text-background hover:bg-brand-gold/90 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile hamburger */}
          <label
            htmlFor="mobile-nav-toggle"
            className="md:hidden cursor-pointer p-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5 block peer-checked:hidden" />
            <X className="h-5 w-5 hidden peer-checked:block" />
          </label>
          <input
            type="checkbox"
            id="mobile-nav-toggle"
            className="sr-only peer"
          />
        </nav>

        {/* Mobile dropdown */}
        <div className="hidden peer-checked:block md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-40">
          <div className="flex flex-col p-4 gap-3">
            <Link
              href="/dashboard/templates"
              className="text-sm text-muted-foreground hover:text-foreground py-2"
            >
              Templates
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground py-2"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-md bg-brand-gold text-background text-center hover:bg-brand-gold/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
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
              Your Characters.
              <br />
              <span className="text-brand-gold">Consistent.</span> Every
              Episode.
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              AI-powered character consistency engine for short drama creators
              going global.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md bg-brand-gold text-background font-semibold hover:bg-brand-gold/90 transition-colors"
              >
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md border border-brand-gold text-brand-gold font-semibold hover:bg-brand-gold/10 transition-colors"
              >
                Watch Demo
              </a>
            </div>

            <p className="mt-16 text-xs text-muted-foreground/60">
              Powered by HappyHorse 1.1 · 96.9% Generation Success Rate
            </p>
          </div>
        </section>

        {/* ── 屏 2: THE PROBLEM ── */}
        <section id="problem" className="min-h-screen py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Your AI Characters Keep Changing Faces.
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
              Without character locking, AI short drama consistency drops below
              40%.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Episode 1 vs Episode 3",
                  desc: "Same character, two episodes apart — facial features drift beyond recognition.",
                },
                {
                  title: "Lighting Change",
                  desc: "Different scene lighting shifts skin tone and facial structure entirely.",
                },
                {
                  title: "Angle Variation",
                  desc: "A new camera angle makes your lead character nearly unrecognizable.",
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
              How It Works
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {[
                {
                  icon: Upload,
                  step: "01",
                  title: "Upload Reference Photos",
                  desc: "Provide a few clear photos of your character from different angles.",
                },
                {
                  icon: Sparkles,
                  step: "02",
                  title: "AI Generates Character Anchor",
                  desc: "Our model builds a stable identity anchor from your references.",
                },
                {
                  icon: Lock,
                  step: "03",
                  title: "Every Shot Locks to Anchor",
                  desc: "Each generated frame is constrained to match the anchor identity.",
                },
                {
                  icon: Film,
                  step: "04",
                  title: "Export for TikTok / YouTube",
                  desc: "Download platform-ready clips with consistent characters throughout.",
                },
              ].map((item, i) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="text-center flex-1">
                    <div className="mx-auto h-12 w-12 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
                      <item.icon className="h-5 w-5 text-brand-gold" />
                    </div>
                    <p className="text-brand-gold font-mono text-sm mb-1">
                      Step {item.step}
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
              See the Difference
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Revenge", color: "bg-red-500/20 text-red-400" },
                { label: "Romance", color: "bg-pink-500/20 text-pink-400" },
                { label: "Thriller", color: "bg-blue-500/20 text-blue-400" },
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
                      <div className="h-12 w-12 rounded-full bg-brand-gold/80 flex items-center justify-center cursor-pointer hover:bg-brand-gold transition-colors">
                        <Play className="h-5 w-5 text-background ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground p-4 text-center">
                    Sample (Coming Soon)
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Before vs After comparison tool coming soon — real demo clips are
              in production.
            </p>
          </div>
        </section>

        {/* ── 屏 5: PRICING + CTA ── */}
        <section id="pricing" className="py-24 px-6 bg-secondary/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Start with a ¥500 Resource Pack. Or ¥149/Month.
            </h2>
            <p className="text-center text-muted-foreground mb-16">
              Choose a plan that fits your production pace.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Starter",
                  price: "¥149",
                  credits: "20,000 Credits",
                  episodes: "~2 episodes",
                  popular: false,
                  features: [
                    "Character anchor locking",
                    "720p export",
                    "Email support",
                    "TikTok-ready output",
                  ],
                },
                {
                  name: "Pro",
                  price: "¥499",
                  credits: "80,000 Credits",
                  episodes: "~8 episodes",
                  popular: true,
                  features: [
                    "Everything in Starter",
                    "1080p export",
                    "Priority rendering",
                    "Custom character presets",
                    "YouTube Shorts support",
                  ],
                },
                {
                  name: "Studio",
                  price: "¥1,499",
                  credits: "300,000 Credits",
                  episodes: "~30 episodes",
                  popular: false,
                  features: [
                    "Everything in Pro",
                    "4K export",
                    "Dedicated render queue",
                    "Team collaboration",
                    "API access",
                    "Priority support",
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
                      Most Popular
                    </span>
                  )}

                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-4 mb-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
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
                    href="/pricing"
                    className={`w-full text-center py-3 rounded-md font-medium transition-colors ${
                      plan.popular
                        ? "bg-brand-gold text-background hover:bg-brand-gold/90"
                        : "border border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    Subscribe
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
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Resource packs also available on-demand —{" "}
                <Link
                  href="/pricing"
                  className="text-brand-gold hover:underline"
                >
                  view pricing
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
              Templates
            </Link>
            <Link
              href="/pricing"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
