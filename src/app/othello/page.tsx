import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '오셀로(리버시) | AI 대전 · 온라인 대전 | 툴허브',
  description: '8x8 보드에서 상대 돌을 뒤집어 더 많이 차지하면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '오셀로',
    '리버시',
    '온라인 오셀로',
    '오셀로 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    'othello',
    'reversi'
  ],
  openGraph: {
    title: '온라인 오셀로 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오셀로(리버시) 대전을 즐기세요. 8x8 보드에서 온라인 오셀로 게임!',
    url: 'https://toolhub.ai.kr/othello',
    type: 'website',
    siteName: '툴허브',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '온라인 오셀로 게임'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '온라인 오셀로 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오셀로(리버시) 대전을 즐기세요. 8x8 보드에서 온라인 오셀로 게임!'
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
    canonical: 'https://toolhub.ai.kr/othello/'
  }
}

export default function OthelloPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '오셀로 (Reversi)',
    description: '오셀로 - AI 대전을 지원하는 리버시 보드게임',
    url: 'https://toolhub.ai.kr/othello',
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
        name: '오셀로(리버시) 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '오셀로는 8×8 보드에서 흑돌과 백돌로 플레이합니다. 상대 돌을 자신의 돌 사이에 끼우면 뒤집을 수 있으며, 뒤집을 수 있는 위치에만 돌을 놓을 수 있습니다. 가로, 세로, 대각선 모든 방향으로 뒤집기가 가능합니다. 더 이상 놓을 곳이 없으면 패스하며, 양측 모두 놓을 수 없으면 게임이 끝납니다. 돌이 더 많은 쪽이 승리합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '오셀로에서 이기는 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 코너 확보: 4개 코너는 절대 뒤집히지 않는 최강의 위치 ② 코너 인접 칸(X칸, C칸) 피하기: 상대에게 코너를 헌납하게 됨 ③ 변(edge) 확보: 변을 따라 안정적인 돌 라인 만들기 ④ 이동성 유지: 놓을 수 있는 위치를 많이 확보 ⑤ 초반에 적게 뒤집기: 상대의 선택지를 제한하는 전략. 돌의 \'수\'보다 \'위치\'가 중요합니다.'
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <BoardGamePage
          gameKey="othello"
          icon="🟢"
          name="오셀로 (리버시)"
          description="8x8 보드에서 상대 돌을 뒤집어 더 많이 차지하면 승리"
        />
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            온라인 오셀로(리버시) 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            오셀로(리버시)는 8×8 보드에서 흑돌과 백돌을 번갈아 놓으며 상대 돌을 자신의 돌 사이에 끼워 뒤집고, 게임이 끝났을 때 돌이 더 많은 쪽이 이기는 보드게임입니다. 단순한 규칙에 비해 전략 깊이가 매우 높아 '배우기 쉽고 마스터하기 어렵다'는 평가를 받습니다. AI 대전(쉬움·보통·어려움)과 친구와의 실시간 온라인 대전을 모두 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            오셀로 게임 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>코너 우선 확보:</strong> 4개 모서리(코너)는 절대 뒤집히지 않는 최강의 위치입니다. 코너를 차지하면 안정적인 돌 라인을 구축할 수 있습니다.</li>
            <li><strong>X칸·C칸 피하기:</strong> 코너 바로 대각선(X칸)과 코너 옆(C칸)은 상대에게 코너를 헌납하는 위험한 자리이므로 초반에는 피하세요.</li>
            <li><strong>초반 적게 뒤집기:</strong> 초반에 많이 뒤집는 것이 유리해 보이지만, 오히려 상대의 선택지를 넓혀줄 수 있습니다. 이동성을 제한하는 전략이 효과적입니다.</li>
            <li><strong>변 라인 장악:</strong> 보드 가장자리(변)를 따라 안정적인 돌 라인을 만들면 상대가 뒤집기 어려운 구조를 만들 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
