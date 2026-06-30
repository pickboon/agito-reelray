import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-orbitron",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ReelRay — 多模型 AI 短剧创作平台 · 出海利器",
  description:
    "ReelRay 是面向出海短剧工作室的 AI 创作平台。接入 Seedance / Kling / HappyHorse 等多模型，角色全程锁定，精品模板一键套用，支持 TikTok / YouTube 一键发布。免费试用。",
  keywords: [
    "AI 短剧",
    "角色一致性",
    "AI 视频生成",
    "短剧出海",
    "TikTok 短剧",
    "ReelShort",
    "DramaBox",
    "多模型",
    "Seedance",
    "Kling",
    "模板市场",
  ],
  openGraph: {
    title: "ReelRay — 多模型 AI 短剧创作平台 · 出海利器",
    description:
      "多模型 AI 短剧创作平台。接入全球顶级模型，角色锁定 + 精品模板，出海短剧一站创作。",
    url: "https://reelray.ai",
    siteName: "ReelRay",
    locale: "zh_CN",
    type: "website",
  },
  alternates: {
    canonical: "https://reelray.ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`dark scroll-smooth ${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable}`}>

      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: { background: "#1f1f23", border: "1px solid #333" },
          }}
        />
      </body>
    </html>
  );
}
