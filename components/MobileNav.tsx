"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        className="md:hidden cursor-pointer p-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "关闭菜单" : "打开菜单"}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Mobile dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-40">
          <div className="flex flex-col p-4 gap-3">
            <Link
              href="/dashboard/templates"
              className="text-sm text-muted-foreground hover:text-foreground py-2"
              onClick={() => setIsOpen(false)}
            >
              Templates
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground py-2"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-md bg-brand-gold text-background text-center hover:bg-brand-gold/90 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
