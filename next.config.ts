import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export로 복원
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  distDir: 'out',
  // 정적 페이지 생성 워커 수 제한: 기본(코어 수-1=19개)이면 원격 PC 메모리가 바닥남 (2026-10-04)
  experimental: { cpus: 4 },
};

export default nextConfig;
