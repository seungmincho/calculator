import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '배틀십(해전) | AI 대전 · 온라인 대전 | 툴허브',
  description: '10x10 그리드에 함선을 배치하고 상대 함선을 먼저 침몰시키면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '배틀십',
    'Battleship',
    '해전 게임',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    '전략 게임'
  ],
  openGraph: {
    title: '온라인 배틀십 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 배틀십 대전! 상대 함선을 침몰시키세요!',
    url: 'https://toolhub.ai.kr/battleship',
    type: 'website'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/battleship'
  }
}

export default function BattleshipPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '배틀쉽 (Battleship)',
    description: '10x10 바다에서 상대 함선을 모두 격침시키면 승리! AI 대전 및 온라인 대전',
    url: 'https://toolhub.ai.kr/battleship',
    genre: 'Strategy Game',
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
          gameKey="battleship"
          icon="🚢"
          name="배틀십 (해전)"
          description="함선을 배치하고 상대 함선을 먼저 모두 침몰시키면 승리"
        />
      </div>
    </>
  )
}
