import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '체커(서양 장기) | AI 대전 · 온라인 대전 | 툴허브',
  description: '8x8 보드에서 상대 말을 모두 잡거나 움직이지 못하게 하면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '체커',
    'Checkers',
    '서양 장기',
    'Draughts',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임'
  ],
  openGraph: {
    title: '온라인 체커 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 체커 대전! 상대 말을 모두 잡으세요!',
    url: 'https://toolhub.ai.kr/checkers',
    type: 'website'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/checkers'
  }
}

export default function CheckersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '체커 (Checkers)',
    description: '체커 - AI 대전을 지원하는 클래식 체커 보드게임',
    url: 'https://toolhub.ai.kr/checkers',
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
          gameKey="checkers"
          icon="🏁"
          name="체커 (서양 장기)"
          description="8x8 보드에서 상대 말을 모두 잡거나 움직이지 못하게 하면 승리"
        />
      </div>
    </>
  )
}
