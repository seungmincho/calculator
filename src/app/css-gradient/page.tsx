import { Metadata } from 'next'
import { Suspense } from 'react'
import CssGradient from '@/components/CssGradient'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CSS 그라디언트 생성기 - 그라데이션 코드 생성 | 툴허브',
  description: 'CSS 그라디언트 생성기 - 선형, 방사형, 원뿔형 그라데이션 CSS 코드를 생성하세요. 색상, 방향, 위치 조절, 프리셋 제공.',
  keywords: 'CSS 그라디언트, CSS 그라데이션, gradient generator, CSS 배경, linear-gradient, 그라디언트 생성기',
  openGraph: { title: 'CSS 그라디언트 생성기 | 툴허브', description: 'CSS 그라데이션 코드 생성', url: 'https://toolhub.ai.kr/css-gradient', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'CSS 그라디언트 생성기 | 툴허브', description: 'CSS 그라데이션 코드 생성' },
  alternates: { canonical: 'https://toolhub.ai.kr/css-gradient' },
}

export default function CssGradientPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'CSS 그라디언트 생성기', description: 'CSS 그라데이션 코드 생성', url: 'https://toolhub.ai.kr/css-gradient', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['선형/방사형/원뿔형', '색상 조절', '프리셋', 'CSS 복사'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><CssGradient /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
