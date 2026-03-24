import { Metadata } from 'next'
import { Suspense } from 'react'
import LadderGameTabs from './LadderGameTabs'

export const metadata: Metadata = {
  title: '사다리 타기 · 돌림판 · 순서뽑기 - 결정 도구 모음 | 툴허브',
  description: '사다리 타기, 돌림판 룰렛, 순서 뽑기까지! 순서 정하기, 벌칙 정하기, 팀 나누기 등 모든 결정을 한 곳에서 공정하게.',
  keywords: [
    '사다리 타기',
    '사다리 게임',
    '온라인 사다리',
    '순서 정하기',
    '벌칙 정하기',
    '팀 나누기',
    '랜덤 선택',
    '공정한 선택',
    '사다리타기 온라인',
    '사다리게임 만들기',
    '결정 도구',
    '선택 게임',
    '돌림판',
    '룰렛 돌리기',
    '순서 뽑기',
    '랜덤 순서',
    '파티 게임',
    '모임 게임'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '사다리 타기 · 돌림판 · 순서뽑기 | 결정 도구 모음',
    description: '사다리 타기, 돌림판 룰렛, 순서 뽑기까지! 순서 정하기, 벌칙 정하기, 팀 나누기 등 모든 결정을 한 곳에서.',
    type: 'website',
    url: 'https://toolhub.ai.kr/ladder-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '사다리 타기 · 돌림판 · 순서뽑기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사다리 타기 · 돌림판 · 순서뽑기 | 결정 도구 모음',
    description: '사다리 타기, 돌림판 룰렛, 순서 뽑기까지! 모든 결정을 한 곳에서.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ladder-game/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LadderGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '사다리타기 · 돌림판 · 순서뽑기',
    description: '사다리타기, 돌림판 룰렛, 순서 뽑기 — 온라인 결정 도구 모음',
    url: 'https://toolhub.ai.kr/ladder-game',
    genre: 'Party Game',
    gamePlatform: 'Web Browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 12 },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사다리타기의 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사다리타기는 수직선과 수평 가로선으로 구성됩니다. 위에서 출발하여 아래로 내려가다가 가로선을 만나면 반드시 옆으로 이동해야 합니다. 수학적으로 사다리타기는 순열(permutation)을 표현하며, 가로선의 배치에 따라 1:1 대응이 보장됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '돌림판과 사다리타기의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사다리타기는 참가자와 결과를 1:1로 매칭하는 반면, 돌림판(룰렛)은 여러 항목 중 하나를 무작위로 선택합니다. 점심 메뉴 고르기, 벌칙 정하기 등 단일 결과를 뽑을 때는 돌림판이, 전체 순서를 정할 때는 사다리타기나 순서뽑기가 적합합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '순서뽑기는 어떻게 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '참가자 이름을 입력하고 "순서 뽑기" 버튼을 누르면 무작위로 섞인 순서가 하나씩 공개됩니다. 발표 순서, 청소 당번, 게임 순서 등을 공정하게 정할 수 있습니다.'
        }
      }
    ]
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
            <LadderGameTabs />
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            온라인 결정 도구 모음
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            툴허브의 결정 도구 모음은 사다리 타기, 돌림판(룰렛), 순서 뽑기 세 가지 방식을 제공합니다.
            순서 정하기, 벌칙 정하기, 팀 나누기, 메뉴 고르기 등 다양한 상황에서 공정하고 재미있게 결정할 수 있습니다.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🪜 사다리 타기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">참가자와 결과를 1:1 매칭. 블라인드 모드, 시드 공유, 이미지 저장까지.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎯 돌림판</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">회전하는 룰렛으로 하나를 선택. 점심 메뉴, 벌칙 등에 최적.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔢 순서뽑기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">전체 참가자의 순서를 한 번에 결정. 카드 한 장씩 공개하는 재미.</p>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>순서 정하기:</strong> 발표 순서, 청소 당번, 주문 순서 등 공정한 배정이 필요할 때 사용하세요.</li>
            <li><strong>벌칙 정하기:</strong> 게임 패자 벌칙, 회식 계산 담당 등을 투명하게 결정할 수 있습니다.</li>
            <li><strong>메뉴 고르기:</strong> 돌림판으로 오늘의 점심 메뉴를 빠르게 결정하세요.</li>
            <li><strong>팀 나누기:</strong> 스포츠 팀, 모둠 구성 등 균형 잡힌 팀 배정에 활용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
