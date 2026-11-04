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
  // 메모리 여유가 적은 로컬 배포에서는 LOW_MEMORY_BUILD=1로 워커를 하나만 사용한다.
  experimental: { cpus: process.env.LOW_MEMORY_BUILD === '1' ? 1 : 4 },
  // 빌드 전에 `npx tsc --noEmit`을 따로 돌렸을 때만 SKIP_BUILD_TYPECHECK=1 — 빌드 중 타입 검사가 메모리 ~5GB를 더 씀
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === '1' },
};

export default nextConfig;
