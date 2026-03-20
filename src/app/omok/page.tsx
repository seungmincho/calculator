import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '오목 | AI 대전 · 온라인 대전 | 툴허브',
  description: '19x19 바둑판에서 5개를 먼저 연결하면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전을 즐기세요. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '오목',
    '온라인 오목',
    '오목 게임',
    '실시간 대전',
    'P2P 게임',
    '바둑판 오목',
    '2인용 게임',
    '보드게임',
    'gomoku',
    'five in a row'
  ],
  openGraph: {
    title: '온라인 오목 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오목 대전을 즐기세요. 19x19 바둑판에서 온라인 오목 게임!',
    url: 'https://toolhub.ai.kr/omok',
    type: 'website',
    siteName: '툴허브',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '온라인 오목 게임'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '온라인 오목 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오목 대전을 즐기세요. 19x19 바둑판에서 온라인 오목 게임!'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/omok/'
  }
}

export default function OmokPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '오목 (Gomoku)',
    description: '오목 - AI 대전 및 온라인 대전을 지원하는 오목 게임',
    url: 'https://toolhub.ai.kr/omok',
    genre: 'Board Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any',
    applicationCategory: 'GameApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    playMode: ['SinglePlayer', 'MultiPlayer'],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 2
    }
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '오목의 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '오목은 15×15 바둑판에서 흑돌과 백돌을 번갈아 놓아 가로, 세로, 대각선으로 5개를 먼저 연속으로 놓는 사람이 이기는 게임입니다. 프로 규칙(렌주룰)에서는 흑이 선공 이점이 크므로 흑에게 삼삼(3-3), 사사(4-4), 장목(6목 이상) 금수를 적용합니다. 백에게는 금수가 없습니다. 캐주얼 게임에서는 금수 없이 플레이하기도 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '오목 AI는 어떻게 작동하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '오목 AI는 미니맥스(Minimax) 알고리즘과 알파-베타 가지치기(Alpha-Beta Pruning)를 사용합니다. 미니맥스는 상대가 최선의 수를 둔다고 가정하고 여러 수 앞을 탐색합니다. 알파-베타 가지치기는 불필요한 탐색을 줄여 효율을 높입니다. 난이도에 따라 탐색 깊이를 조절하며, 패턴 인식으로 위협적인 수(열린 4, 열린 3 등)를 우선 평가합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '오목에서 이기는 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 열린 3(양쪽이 막히지 않은 3연속)을 만들어 상대를 방어에 몰아넣기 ② 동시에 두 방향으로 위협하는 쌍삼(4-3) 만들기 ③ 중앙 근처에서 시작하여 영향력 확보 ④ 상대의 열린 3을 즉시 차단하기 ⑤ L자, T자 형태의 복합 위협 구축. 가장 중요한 것은 공격과 방어의 균형이며, 한 수로 공격과 방어를 동시에 하는 수가 좋은 수입니다.',
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
        <BoardGamePage
          gameKey="omok"
          icon="⚫"
          name="오목"
          description="19x19 바둑판에서 5개를 먼저 연결하면 승리"
        />
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            온라인 오목 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            오목은 19×19 바둑판에서 흑돌과 백돌을 번갈아 놓아 가로·세로·대각선 방향으로 5개를 먼저 연속으로 놓으면 이기는 전통 보드게임입니다. 본 도구에서는 쉬움·보통·어려움 세 가지 난이도의 AI와 1인 대전을 즐기거나, 친구와 실시간 P2P 온라인 대전을 할 수 있습니다. 미니맥스 알고리즘 기반 AI가 강력한 수를 구사하여 실력 향상에도 도움이 됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            오목 게임 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>열린 3 만들기:</strong> 양쪽이 막히지 않은 3연속(열린 3)을 만들면 상대가 한 방향만 막을 수 있어 주도권을 잡을 수 있습니다.</li>
            <li><strong>쌍삼(4-3) 전략:</strong> 동시에 두 방향에서 위협(4-3 포크)을 만들면 상대가 한 곳만 막을 수 있으므로 반드시 이길 수 있습니다.</li>
            <li><strong>중앙 선점:</strong> 초반에 바둑판 중앙 근처에 돌을 놓아 사방으로 뻗을 수 있는 영향력을 확보하세요.</li>
            <li><strong>공수 균형:</strong> 공격에만 집중하다 상대의 열린 4를 방치하면 역전패하기 쉽습니다. 한 수로 공격과 방어를 동시에 해결하는 수를 찾는 것이 핵심입니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
