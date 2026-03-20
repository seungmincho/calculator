import { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import ChessPageContent from '@/components/ChessPageContent'

export const metadata: Metadata = {
  title: '체스 (Chess) | AI 대전 | 툴허브',
  description: '브라우저에서 즐기는 체스 게임! AI와 대전하세요. 쉬움/보통/어려움 난이도 선택, 캐슬링, 앙파상, 프로모션 등 정식 체스 규칙 완벽 지원. 수 기록, 잡은 말 표시, 보드 뒤집기 기능 포함.',
  keywords: [
    '체스',
    'Chess',
    '체스 게임',
    'AI 체스',
    '온라인 체스',
    '체스 AI',
    '보드게임',
    '전략 게임',
    '무료 체스',
    '브라우저 체스',
  ],
  openGraph: {
    title: '체스 (Chess) - AI 대전 게임 | 툴허브',
    description: 'AI와 체스 대전! 캐슬링, 앙파상, 프로모션 등 정식 규칙 완벽 지원',
    url: 'https://toolhub.ai.kr/chess',
    type: 'website',
    siteName: '툴허브',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/chess/',
  },
}

export default function ChessPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '체스 (Chess)',
    description: '체스 - AI 대전을 지원하는 클래식 체스 보드게임. 캐슬링, 앙파상, 프로모션 등 정식 규칙 완벽 지원.',
    url: 'https://toolhub.ai.kr/chess',
    genre: 'Board Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any',
    applicationCategory: 'GameApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    playMode: ['SinglePlayer'],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 1,
    },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '체스의 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '체스는 8x8 보드에서 16개씩의 말(킹, 퀸, 룩 2개, 비숍 2개, 나이트 2개, 폰 8개)로 플레이합니다. 백이 먼저 시작하며, 각 말은 고유한 이동 방식을 가집니다. 상대방의 킹을 체크메이트(피할 수 없는 공격)하면 승리합니다. 캐슬링, 앙파상, 폰 프로모션 등의 특수 규칙이 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '체스에서 캐슬링이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '캐슬링은 킹과 룩을 동시에 이동하는 특수 규칙입니다. 킹사이드 캐슬링(O-O)은 킹이 2칸 오른쪽으로, 룩이 킹 왼쪽으로 이동합니다. 퀸사이드 캐슬링(O-O-O)은 킹이 2칸 왼쪽으로, 룩이 킹 오른쪽으로 이동합니다. 킹과 룩 사이에 말이 없고, 둘 다 이동한 적이 없으며, 킹이 체크 상태가 아니고 이동 경로에 공격받는 칸이 없어야 합니다.',
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        }>
          <I18nWrapper>
            <ChessPageContent />
          </I18nWrapper>
        </Suspense>
      </div>
      {/* SEO Content */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            체스(Chess)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            체스(Chess)는 <strong>8x8 보드에서 두 사람이 각 16개의 말을 전략적으로 이동하며 상대 킹을 체크메이트하는</strong> 세계에서 가장 유명한 전략 보드게임입니다. 1,500년 이상의 역사를 가지며, 논리적 사고력과 전략적 계획 능력을 키울 수 있습니다. 툴허브의 체스는 3단계 AI와의 대전을 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            체스 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>중앙 통제:</strong> 게임 초반에 폰과 나이트로 보드 중앙(d4, d5, e4, e5)을 장악하세요.</li>
            <li><strong>말 전개:</strong> 나이트와 비숍을 빨리 전개하고, 조기 캐슬링으로 킹을 안전하게 보호하세요.</li>
            <li><strong>퀸 조기 출동 금지:</strong> 퀸을 너무 일찍 내보내면 상대 공격의 표적이 됩니다.</li>
            <li><strong>말의 가치:</strong> 폰(1점) &lt; 나이트=비숍(3점) &lt; 룩(5점) &lt; 퀸(9점). 교환 시 참고하세요.</li>
            <li><strong>난이도:</strong> 처음에는 쉬움 난이도로 기본기를 익힌 후 어려움에 도전하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
