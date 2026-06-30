"use client";

import { useState, useRef, useEffect } from "react";
import { Play } from "lucide-react";

const CATEGORIES = ["全部", "复仇", "甜宠", "悬疑", "穿越", "仙侠", "战神", "总裁", "重生"] as const;

const DEMOS = [
  { src: "/demos/revenge_boardroom.mp4", title: "董事会复仇", template: "revenge", category: "复仇" },
  { src: "/demos/revenge_gala.mp4", title: "宴会复仇", template: "revenge", category: "复仇" },
  { src: "/demos/romance_cafe.mp4", title: "咖啡厅邂逅", template: "romance", category: "甜宠" },
  { src: "/demos/thriller_room.mp4", title: "暗室危机", template: "thriller", category: "悬疑" },
  { src: "/demos/crossworld_court.mp4", title: "宫廷穿越", template: "crossworld", category: "穿越" },
  { src: "/demos/crossworld_portal.mp4", title: "时空之门", template: "crossworld", category: "穿越" },
  { src: "/demos/fantasy_cave.mp4", title: "秘境洞穴", template: "fantasy", category: "仙侠" },
  { src: "/demos/fantasy_trial.mp4", title: "修仙试炼", template: "fantasy", category: "仙侠" },
  { src: "/demos/warlord_return.mp4", title: "战神归来", template: "warlord", category: "战神" },
  { src: "/demos/warlord_throne.mp4", title: "王座加冕", template: "warlord", category: "战神" },
  { src: "/demos/ceo_office.mp4", title: "总裁办公室", template: "ceo", category: "总裁" },
  { src: "/demos/comeback_villa.mp4", title: "王者归来", template: "comeback", category: "重生" },
];

function VideoCard({ demo, index }: { demo: typeof DEMOS[number]; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hovered]);

  return (
    <div
      className={`frosted-card overflow-hidden rounded-xl group transition-all animate-fade-in-up ${
        index === 0 ? "delay-0" : index <= 2 ? "delay-100" : index <= 5 ? "delay-200" : "delay-300"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 视频区域 */}
      <div className="relative aspect-[9/16] bg-black/60 overflow-hidden">
        <video
          ref={videoRef}
          src={demo.src}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* hover 播放指示 */}
        {!hovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center group-hover:opacity-0 transition-opacity">
              <Play className="h-4 w-4 text-white/80 ml-0.5" />
            </div>
          </div>
        )}
      </div>
      {/* 信息条 */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs text-foreground font-medium truncate">{demo.title}</span>
        <span className="text-[10px] text-brand-green/80 uppercase tracking-wider shrink-0 ml-2">
          {demo.category}
        </span>
      </div>
    </div>
  );
}

export default function DemoShowcase() {
  const [active, setActive] = useState<string>("全部");

  const filtered = active === "全部" ? DEMOS : DEMOS.filter((d) => d.category === active);

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            <span className="text-brand-cyan">AI</span> 样片展示
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            八大模板 · 十二支样片 · 1080p 竖屏直出
          </p>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                active === cat
                  ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30"
                  : "text-muted-foreground border border-transparent hover:text-foreground hover:border-muted-foreground/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 视频网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((demo, i) => (
            <VideoCard key={demo.src} demo={demo} index={i} />
          ))}
        </div>

        {/* 空态 */}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">暂无该分类样片</p>
        )}
      </div>
    </section>
  );
}
