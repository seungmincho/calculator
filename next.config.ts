import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export로 복원
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  distDir: 'out',
};

export default nextConfig;
