import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReelRay — AI 短剧角色一致性引擎",
  description:
    "面向出海短剧创作者的 AI 角色一致性引擎。一次上传角色，每集保持一致。支持 TikTok 与 YouTube 导出，提供免费试用。",
  keywords: [
    "AI 短剧",
    "角色一致性",
    "AI 视频生成",
    "短剧出海",
    "TikTok 短剧",
    "ReelShort",
    "DramaBox",
  ],
  openGraph: {
    title: "ReelRay — AI 短剧角色一致性引擎",
    description:
      "面向出海短剧创作者的 AI 角色一致性引擎。一次上传角色，每集保持一致。",
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
  other: {
    robots: "noai, noimageai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${jetbrainsMono.variable} dark scroll-smooth`}>
      <head>
        <meta name="robots" content="noai, noimageai" />
      </head>
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
