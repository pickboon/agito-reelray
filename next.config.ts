import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
