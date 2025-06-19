import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 빌드 시 ESLint 무시
    ignoreDuringBuilds: true,
  },
  // Cloudflare Workers 설정 - static export
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  distDir: 'out',
};

export default nextConfig;
