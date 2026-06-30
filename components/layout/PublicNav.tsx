"use client";

import Link from "next/link";
import { User } from "lucide-react";
import MobileNav from "@/components/MobileNav";

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav aria-label="主导航" className="flex items-center justify-between max-w-7xl mx-auto px-6 h-16">
        <Link href="/" className="text-xl font-bold">
          <span className="text-brand-gold">Reel</span>Ray
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            工作台
          </Link>
          <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            模板库
          </Link>
          <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
  );
}
