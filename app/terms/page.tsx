import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">
          服务条款 / Terms of Service
        </h1>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold mb-2">1. 服务描述 / Service Description</h2>
            <p>ReelRay 是一款 AI 驱动的角色一致性引擎，用于短剧视频制作。我们提供 AI 视频生成、角色锚定、多集一致性维护等工具。</p>
            <p className="mt-1">请注意：AI 生成的内容可能不完全符合预期，我们不保证生成结果的准确性和完整性。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">2. 用户行为规范 / User Conduct</h2>
            <p>您同意仅将本服务用于合法目的。您不得利用本服务：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>生成、传播色情、暴力、恐怖、歧视性内容</li>
              <li>侵犯他人知识产权（包括肖像权、著作权、商标权）</li>
              <li>生成虚假身份或冒充他人</li>
              <li>发布广告、垃圾信息或恶意内容</li>
              <li>干扰或破坏本服务的正常运行</li>
              <li>规避或尝试规避本服务的安全措施</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">3. 用户生成内容 (UGC) / User-Generated Content</h2>
            <p>您可以将生成的视频作品发布到 ReelRay 社区。发布即表示您承诺：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>内容不包含色情、暴力、歧视、广告或违法信息</li>
              <li>内容不侵犯任何第三方的知识产权或隐私权</li>
              <li>您有权发布该内容</li>
            </ul>
            <p className="mt-2">我们保留对违规内容进行删除、下架或对违规账号进行警告、暂停、永久封禁的权利。累计三次违规将导致账号永久封禁。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">4. 知识产权 / Intellectual Property</h2>
            <p>您保留上传内容的所有权。AI 生成的内容在遵守本条款的前提下授权您商业使用。</p>
            <p className="mt-1">ReelRay 平台、技术和底层算法的所有权利归 Agito Technology (Jinan) Co., Ltd. 所有。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">5. 版权投诉 / DMCA & Copyright</h2>
            <p>如果您认为 ReelRay 上的内容侵犯了您的版权，请向以下邮箱发送通知：</p>
            <p className="mt-1"><a href="mailto:copyright@agitoai.com" className="text-brand-gold hover:underline">copyright@agitoai.com</a></p>
            <p className="mt-1">通知应包含：您的联系方式、被侵权作品的描述、侵权内容的链接、您的签名声明。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">6. 付费与退款 / Payment & Refund</h2>
            <p>我们提供订阅套餐和一次性充值包。Credits 按使用量扣除，未使用的 Credits 在订阅期内有效。</p>
            <p className="mt-1">订阅可在续费日前取消。已消耗的 Credits 不予退款。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">7. 免责声明 / Disclaimer</h2>
            <p>本服务按&ldquo;现状&rdquo;提供，不提供任何形式的保证。我们不保证服务不中断或无错误。</p>
            <p className="mt-1">AI 生成的内容应经人工审核后再发布或商用。我们不对 AI 生成内容的准确性、合法性或适用性承担责任。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">8. 适用法律 / Governing Law</h2>
            <p>本条款受中华人民共和国法律管辖。因本条款产生的争议，应提交济南仲裁委员会仲裁解决。</p>
          </section>

          <section>
            <h2 className="text-foreground font-semibold mb-2">9. 联系我们 / Contact</h2>
            <p>如有任何问题，请联系：<a href="mailto:contact@agitoai.com" className="text-brand-gold hover:underline">contact@agitoai.com</a></p>
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
