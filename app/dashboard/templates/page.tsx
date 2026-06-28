export default function TemplatesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        模板商店
      </h1>
      <p className="text-muted-foreground mb-8">
        精选短剧模板，一键套用
      </p>
      <div className="bg-card border border-border rounded-lg p-8 max-w-md">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
            <span className="text-brand-gold text-xl">🎬</span>
          </div>
          <p className="text-muted-foreground">
            模板即将上线，敬请期待
          </p>
        </div>
      </div>
    </div>
  );
}
