import { Metadata } from 'next'
import { Suspense } from 'react'
import SnakeGame from '@/components/SnakeGame'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '스네이크 게임 - 클래식 뱀 게임 | 툴허브',
  description: '스네이크 게임 - 클래식 뱀 게임을 플레이하세요! 3가지 모드(클래식, 무한, 장애물), 4단계 난이도, 커스텀 스킨, 모바일 터치 지원.',
  keywords: '스네이크 게임, 뱀 게임, snake game, 온라인 게임, 무료 게임, 브라우저 게임',
  openGraph: {
    title: '스네이크 게임 - 클래식 뱀 게임 | 툴허브',
    description: '클래식 뱀 게임을 브라우저에서 즐기세요! 3가지 모드, 4단계 난이도, 모바일 지원.',
    url: 'https://toolhub.ai.kr/snake-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '스네이크 게임',
    description: '클래식 뱀 게임 - 3가지 모드, 4단계 난이도',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/snake-game',
  },
}

export default function SnakeGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '스네이크 게임',
    description: '클래식 뱀 게임 - 3가지 모드, 4단계 난이도, 커스텀 스킨',
    url: 'https://toolhub.ai.kr/snake-game',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['클래식/무한/장애물 모드', '4단계 난이도', '커스텀 스킨', '모바일 터치 지원', '최고 점수 저장'],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <SnakeGame />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
