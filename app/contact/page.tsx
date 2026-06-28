import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          联系我们
        </h1>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          {/* 公司名称 */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">公司</p>
            <p className="text-foreground font-medium">
              亚极陀（济南）科技有限公司
            </p>
          </div>

          {/* 联系邮箱 */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">邮箱</p>
            <a
              href="mailto:contact@agitoai.com"
              className="text-brand-gold hover:underline font-medium"
            >
              contact@agitoai.com
            </a>
          </div>
        </div>

        {/* 返回首页 */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
