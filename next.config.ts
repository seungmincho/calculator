import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 빌드 시 ESLint 무시
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
