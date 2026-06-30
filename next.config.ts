import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 明确 Turbopack 工作区根目录，避免多 lockfile 时推断错误
  turbopack: {
    root: "/Users/mac/Projects/agito-reelray",
  },
  // Cloudflare Pages 兼容
  output: undefined,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // 禁用 x-powered-by
  poweredByHeader: false,
  // 严格模式
  reactStrictMode: true,
};

export default nextConfig;
