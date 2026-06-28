import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReelRay — AI Character Consistency for Short Drama Creators",
  description:
    "AI-powered character consistency engine for short drama creators going global. Upload characters once, they stay the same across every episode. TikTok & YouTube ready. Free trial available.",
  keywords: [
    "AI short drama",
    "character consistency",
    "AI video generation",
    "short drama overseas",
    "TikTok short drama",
    "ReelShort",
    "DramaBox",
  ],
  openGraph: {
    title: "ReelRay — AI Character Consistency for Short Drama Creators",
    description:
      "AI-powered character consistency engine for short drama creators going global. Upload characters once, they stay the same across every episode.",
    url: "https://reelray.ai",
    siteName: "ReelRay",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://reelray.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark scroll-smooth`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
