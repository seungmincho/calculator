import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 빌드 시 ESLint 무시
    ignoreDuringBuilds: true,
  },
  // Static export 비활성화하여 i18n 라우팅 활성화
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // distDir: 'out',
};

export default withNextIntl(nextConfig);
