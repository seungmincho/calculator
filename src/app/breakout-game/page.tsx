import { Metadata } from 'next'
import { Suspense } from 'react'
import BreakoutGame from '@/components/BreakoutGame'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '벽돌깨기 - 클래식 아케이드 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 벽돌깨기(Breakout) 게임. 다양한 레벨, 파워업 아이템, 모바일 터치 지원. 공으로 벽돌을 깨는 클래식 아케이드 게임을 지금 바로 플레이하세요!',
  keywords: '벽돌깨기, breakout, 아케이드 게임, 온라인 게임, 무료 게임, 브라우저 게임, 블록 깨기',
  openGraph: {
    title: '벽돌깨기 - 클래식 아케이드 게임 | 툴허브',
    description: '공으로 벽돌을 깨는 클래식 아케이드 게임. 다양한 레벨과 파워업!',
    url: 'https://toolhub.ai.kr/breakout-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '벽돌깨기',
    description: '클래식 아케이드 벽돌깨기 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/breakout-game',
  },
}

export default function BreakoutGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '벽돌깨기',
    description: '공으로 벽돌을 깨는 클래식 아케이드 게임',
    url: 'https://toolhub.ai.kr/breakout-game',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['다양한 레벨', '파워업 아이템', '키보드/마우스/터치 조작', '최고 점수 저장'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '벽돌깨기 게임 규칙과 조작법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '벽돌깨기(Breakout)는 화면 하단의 패들을 좌우로 움직여 공을 튕기고, 상단의 벽돌을 모두 깨면 다음 레벨로 진행하는 아케이드 게임입니다. 키보드 좌우 방향키, 마우스, 또는 터치로 패들을 조작합니다. 공을 놓치면 목숨이 줄어들며 3개의 목숨이 모두 소진되면 게임 오버입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '벽돌깨기 파워업 아이템에는 어떤 것이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '벽돌을 깨면 가끔 파워업 아이템이 떨어집니다. ① 패들 확장: 패들이 넓어져 공을 받기 쉬워집니다 ② 멀티볼: 공이 3개로 늘어나 빠르게 벽돌을 깰 수 있습니다 ③ 추가 목숨: 목숨이 1개 추가됩니다. 파워업은 패들로 받아야 효과가 적용됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <BreakoutGame />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
