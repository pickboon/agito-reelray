import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="py-8 border-t border-border px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © 2026 Agito Technology (Jinan) Co., Ltd.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/templates" className="text-xs text-muted-foreground hover:text-foreground transition-colors">模板库</Link>
          <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">定价</Link>
          <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">联系我们</Link>
          <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
