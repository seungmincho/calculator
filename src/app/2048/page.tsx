import { Metadata } from 'next'
import { Suspense } from 'react'
import Game2048 from '@/components/Game2048'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '2048 게임 - 숫자 퍼즐 게임 | 툴허브',
  description: '클래식 2048 숫자 퍼즐 게임을 온라인에서 무료로 즐기세요. 같은 숫자 타일을 합쳐 2048을 만들어보세요! 키보드와 터치 모두 지원합니다.',
  keywords: '2048, 2048 게임, 숫자 퍼즐, 퍼즐 게임, 무료 게임, 온라인 게임, 브라우저 게임',
  openGraph: {
    title: '2048 게임 - 숫자 퍼즐 | 툴허브',
    description: '같은 숫자를 합쳐 2048을 만들어보세요! 무료 온라인 퍼즐 게임.',
    url: 'https://toolhub.ai.kr/2048',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2048 게임 | 툴허브',
    description: '같은 숫자를 합쳐 2048을 만들어보세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/2048' },
}

export default function Game2048Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '2048 게임',
    description: '같은 숫자 타일을 합쳐 2048을 만드는 퍼즐 게임',
    url: 'https://toolhub.ai.kr/2048',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4x4 그리드 퍼즐', '키보드/터치 지원', '점수 기록', '되돌리기 기능'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><Game2048 /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
