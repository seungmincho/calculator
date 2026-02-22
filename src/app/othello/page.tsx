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
    canonical: 'https://toolhub.ai.kr/othello'
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
    </>
  )
}
