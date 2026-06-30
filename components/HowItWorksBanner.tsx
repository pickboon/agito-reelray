import Link from "next/link";
import { Lightbulb, ImageUp, Wand2, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: Lightbulb,
    label: "选择模板",
    desc: "从 8 套精品模板中挑选题材",
    color: "text-brand-purple",
    bg: "bg-brand-purple/10",
    href: "/templates",
  },
  {
    icon: ImageUp,
    label: "上传角色",
    desc: "上传照片，AI 锁定角色一致性",
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    href: "/dashboard/forge",
  },
  {
    icon: Wand2,
    label: "AI 生成",
    desc: "一键生成分镜视频，全自动渲染",
    color: "text-brand-gold",
    bg: "bg-brand-gold/10",
    href: "/dashboard/hub",
  },
  {
    icon: Rocket,
    label: "一键发布",
    desc: "TikTok / YouTube 多平台直出",
    color: "text-brand-green",
    bg: "bg-brand-green/10",
    href: "/dashboard/projects",
  },
];

export default function HowItWorksBanner() {
  return (
    <div className="frosted-card rounded-xl p-6 sm:p-8 mb-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 text-center sm:text-left">
        工作原理
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STEPS.map((step, i) => (
          <Link key={step.label} href={step.href}>
            <div className="flex flex-col items-center text-center group cursor-pointer rounded-xl hover:bg-white/[0.03] transition-colors p-2">
              {/* 图标 */}
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${step.bg} mb-3 glow-circle transition-transform group-hover:scale-110`}>
                <step.icon className={`h-6 w-6 ${step.color}`} />
              </div>
              {/* 步骤编号 */}
              <span className="text-[10px] text-muted-foreground mb-1">STEP {i + 1}</span>
              {/* 标题 */}
              <span className="text-sm font-semibold text-foreground">{step.label}</span>
              {/* 描述 */}
              <span className="text-xs text-muted-foreground mt-1 hidden sm:block">{step.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
