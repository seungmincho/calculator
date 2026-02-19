import { Metadata } from 'next'
import { Suspense } from 'react'
import BoxShadow from '@/components/BoxShadow'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CSS 박스 그림자 생성기 - Box Shadow 코드 생성 | 툴허브',
  description: 'CSS box-shadow 생성기 - 다중 레이어 그림자, Material Design, Neumorphism 프리셋, 실시간 미리보기로 완벽한 CSS 그림자 코드를 생성하세요.',
  keywords: 'CSS box-shadow, 박스 그림자, box shadow generator, CSS 그림자 생성기, Material Design shadow, neumorphism',
  openGraph: {
    title: 'CSS 박스 그림자 생성기 | 툴허브',
    description: 'CSS box-shadow 코드를 시각적으로 생성하세요',
    url: 'https://toolhub.ai.kr/box-shadow',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CSS 박스 그림자 생성기 | 툴허브',
    description: 'CSS box-shadow 코드를 시각적으로 생성',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/box-shadow',
  },
}

export default function BoxShadowPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CSS 박스 그림자 생성기',
    description: 'CSS box-shadow 코드를 시각적으로 생성',
    url: 'https://toolhub.ai.kr/box-shadow',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['다중 레이어 그림자', 'Material Design 프리셋', 'Neumorphism', '실시간 미리보기', 'CSS 코드 복사', 'PNG 내보내기'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <BoxShadow />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
