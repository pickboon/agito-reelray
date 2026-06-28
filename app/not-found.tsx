import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-5xl font-bold text-brand-gold mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          页面未找到
        </h2>
        <p className="text-muted-foreground mb-8">
          你访问的页面不存在或已被移除。
        </p>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            请检查链接是否正确，或返回首页浏览。
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-md btn-primary text-sm font-medium"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
