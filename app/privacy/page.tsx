import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          隐私政策 / Privacy Policy
        </h1>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold mb-2">1. 我们收集的信息 / Information We Collect</h2>
            <p>当您注册或使用 ReelRay 时，我们可能从以下渠道收集信息：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>GitHub OAuth:</strong> 用户名、邮箱、头像</li>
              <li><strong>Google OAuth:</strong> 姓名、邮箱、头像</li>
              <li><strong>Apple OAuth:</strong> 姓名、邮箱</li>
              <li><strong>邮箱登录:</strong> 邮箱地址、密码（加密存储）</li>
              <li><strong>使用数据:</strong> 上传的图片、生成的视频、操作日志、Credits 消耗记录</li>
              <li><strong>支付数据:</strong> Stripe 处理支付信息，我们不直接存储信用卡号</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">2. 信息使用方式 / How We Use Your Information</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>提供和改善 AI 视频生成服务</li>
              <li>处理付款和订阅管理</li>
              <li>内容安全审核（通过百度文本审核 API 检测违规内容）</li>
              <li>发送账户相关通知</li>
              <li>我们不会将您的个人数据出售给第三方</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">3. 数据存储 / Data Storage</h2>
            <p>您的数据存储在云端基础设施上：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase:</strong> 用户账户、项目数据、生成记录（PostgreSQL）</li>
              <li><strong>Cloudflare R2:</strong> 上传的图片和生成的视频文件</li>
              <li><strong>百度内容审核 API:</strong> 文本内容会发送至百度进行安全审核</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">4. 数据保留期限 / Data Retention</h2>
            <p>您的数据在订阅有效期内保留。订阅取消后，数据保留 30 天。30 天后，所有数据将被永久删除。</p>
            <p className="mt-1">您可以在保留期内随时请求数据导出或删除。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">5. 您的权利 / Your Rights</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>访问、更正或删除您的个人数据</li>
              <li>导出您生成的所有内容</li>
              <li>在账户设置中请求删除账户</li>
              <li>撤回对数据处理的同意</li>
            </ul>
            <p className="mt-2">如需行使以上权利，请在账户设置页面操作，或联系 <a href="mailto:privacy@agitoai.com" className="text-brand-gold hover:underline">privacy@agitoai.com</a>。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">6. Cookie 使用 / Cookies</h2>
            <p>我们使用以下类型的 Cookie：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>认证 Cookie:</strong> 维持登录会话</li>
              <li><strong>CSRF Cookie:</strong> 防止跨站请求伪造</li>
              <li>我们不使用第三方追踪 Cookie</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">7. 联系我们 / Contact</h2>
            <p>隐私相关问题请联系：<a href="mailto:privacy@agitoai.com" className="text-brand-gold hover:underline">privacy@agitoai.com</a></p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
