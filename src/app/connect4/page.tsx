import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '커넥트4(사목) | AI 대전 · 온라인 대전 | 툴허브',
  description: '7x6 보드에서 같은 색 디스크 4개를 먼저 연결하면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '커넥트4',
    '사목',
    'Connect Four',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임'
  ],
  openGraph: {
    title: '온라인 커넥트4 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 커넥트4 대전! 4개를 연결하세요!',
    url: 'https://toolhub.ai.kr/connect4',
    type: 'website'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/connect4'
  }
}

export default function Connect4Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '커넥트4 (Connect Four)',
    description: '7x6 보드에서 같은 색 디스크 4개를 먼저 연결하면 승리! AI 대전 및 온라인 대전',
    url: 'https://toolhub.ai.kr/connect4',
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
          gameKey="connect4"
          icon="🔴"
          name="커넥트4 (사목)"
          description="7x6 보드에서 같은 색 디스크 4개를 먼저 연결하면 승리"
        />
      </div>
    </>
  )
}
