import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorPalette from '@/components/ColorPalette'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '색상 팔레트 생성기 - 조화로운 색상 조합 | 툴허브',
  description: '색상 팔레트 생성기 - 기준 색상에서 보색, 유사색, 삼색 등 조화로운 색상 조합을 자동 생성합니다. CSS/JSON/Tailwind 내보내기.',
  keywords: '색상 팔레트, color palette generator, 보색, 유사색, 색상 조합, 컬러 팔레트',
  openGraph: { title: '색상 팔레트 생성기 | 툴허브', description: '조화로운 색상 조합 생성', url: 'https://toolhub.ai.kr/color-palette', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '색상 팔레트 생성기 | 툴허브', description: '조화로운 색상 조합 생성' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-palette' },
}

export default function ColorPalettePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '색상 팔레트 생성기', description: '조화로운 색상 조합 생성', url: 'https://toolhub.ai.kr/color-palette', applicationCategory: 'DesignApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['보색/유사색/삼색', 'CSS 변수 내보내기', 'Tailwind 설정', '팔레트 저장'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ColorPalette /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
