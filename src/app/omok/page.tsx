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
    images: [
      {
        url: 'https://toolhub.ai.kr/og-omok.png',
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
    canonical: 'https://toolhub.ai.kr/omok'
  }
}

export default function OmokPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '오목 (Gomoku)',
    description: '19x19 바둑판에서 5개를 먼저 연결하면 승리! AI 대전 및 온라인 대전',
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <BoardGamePage
          gameKey="omok"
          icon="⚫"
          name="오목"
          description="19x19 바둑판에서 5개를 먼저 연결하면 승리"
        />
      </div>
    </>
  )
}
