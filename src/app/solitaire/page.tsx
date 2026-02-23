import { Metadata } from 'next'
import { Suspense } from 'react'
import Solitaire from '@/components/Solitaire'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '카드 솔리테어 - 클래식 카드 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 클론다이크 솔리테어. 드래그 앤 드롭, 되돌리기, 힌트, 자동완성 기능을 지원합니다. 전 세계에서 가장 많이 플레이되는 1인 카드 게임!',
  keywords: '솔리테어, 카드 게임, 클론다이크, solitaire, 온라인 카드 게임, 무료 게임, 브라우저 게임',
  openGraph: {
    title: '카드 솔리테어 - 클래식 카드 게임 | 툴허브',
    description: '클래식 클론다이크 솔리테어를 브라우저에서 무료로 즐기세요!',
    url: 'https://toolhub.ai.kr/solitaire',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '카드 솔리테어',
    description: '클래식 클론다이크 솔리테어 카드 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/solitaire',
  },
}

export default function SolitairePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '카드 솔리테어',
    description: '클래식 클론다이크 솔리테어 카드 게임',
    url: 'https://toolhub.ai.kr/solitaire',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['드래그 앤 드롭', '되돌리기', '힌트 시스템', '자동완성', '최고 점수 저장'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '솔리테어(클론다이크) 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '클론다이크 솔리테어는 52장의 카드로 플레이하는 1인 카드 게임입니다. 7개의 태블로 열에 카드가 배치되며, 각 열의 맨 위 카드만 앞면입니다. 목표는 4개의 파운데이션에 각 문양별로 A부터 K까지 순서대로 카드를 쌓는 것입니다. 태블로에서는 번갈아가는 색상(빨강-검정)으로 내림차순으로 카드를 쌓을 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '솔리테어 게임에서 승리하는 팁은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 뒤집힌 카드가 많은 열을 먼저 공략 ② A와 2는 즉시 파운데이션으로 이동 ③ K가 나올 때까지 빈 열을 만들지 않기 ④ 스톡 카드를 너무 빨리 소진하지 않기 ⑤ 두 가지 같은 수의 카드 중 더 많은 카드를 풀 수 있는 쪽을 선택. 통계적으로 약 80%의 게임이 이론상 승리 가능합니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <Solitaire />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
