import { Metadata } from 'next'
import { Suspense } from 'react'
import FlexboxGrid from '@/components/FlexboxGrid'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CSS Flexbox & Grid 생성기 - 레이아웃 코드 생성 | 툴허브',
  description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요. 실시간 미리보기, 프리셋, 반응형 테스트 지원.',
  keywords: 'CSS Flexbox, CSS Grid, 레이아웃 생성기, flexbox generator, grid generator, CSS 코드 생성, 반응형 레이아웃',
  openGraph: {
    title: 'CSS Flexbox & Grid 생성기 | 툴허브',
    description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요.',
    url: 'https://toolhub.ai.kr/flexbox-grid',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CSS Flexbox & Grid 생성기 | 툴허브',
    description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/flexbox-grid',
  },
}

export default function FlexboxGridPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CSS Flexbox & Grid 생성기',
    description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요. 실시간 미리보기, 프리셋, 반응형 테스트 지원.',
    url: 'https://toolhub.ai.kr/flexbox-grid',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Flexbox 레이아웃', 'CSS Grid 레이아웃', '실시간 미리보기', '프리셋 레이아웃', '반응형 테스트', 'CSS 코드 복사'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <FlexboxGrid />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
