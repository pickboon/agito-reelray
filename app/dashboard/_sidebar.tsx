"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  CreditCard,
  Settings,
  Clapperboard,
  Wand2,
  FolderOpen,
  LayoutTemplate,
  Users,
} from "lucide-react";
import { GlobalStatusBar } from "@/components/layout/GlobalStatusBar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/generate", label: "创作", icon: Wand2 },
  { href: "/dashboard/assets", label: "资产", icon: FolderOpen },
  { href: "/dashboard/projects", label: "Projects", icon: Film },
  { href: "/templates", label: "模板", icon: LayoutTemplate },
  { href: "/community", label: "社区", icon: Users },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <Clapperboard className="h-5 w-5 text-brand-gold" />
        <Link href="/" className="text-sm font-semibold text-sidebar-foreground tracking-wide hover:text-brand-gold transition-colors">
          ReelRay
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      {/* C5 全局状态栏 */}
      <GlobalStatusBar />
    </aside>
  );
}
