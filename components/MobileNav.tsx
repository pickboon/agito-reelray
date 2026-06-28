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
              模板库
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground py-2"
              onClick={() => setIsOpen(false)}
            >
              定价
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground py-2"
              onClick={() => setIsOpen(false)}
            >
              登录
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
