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
    description: '8x8 보드에서 상대 돌을 뒤집어 더 많은 돌을 차지하면 승리! AI 대전 및 온라인 대전',
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
