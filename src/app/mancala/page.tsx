import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '만칼라 | AI 대전 · 온라인 대전 | 툴허브',
  description: '6개의 구덩이에서 돌을 뿌려 더 많은 돌을 모으면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '만칼라',
    'Mancala',
    '칼라',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    '전략 게임'
  ],
  openGraph: {
    title: '온라인 만칼라 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 만칼라 대전! 더 많은 돌을 모으세요!',
    url: 'https://toolhub.ai.kr/mancala',
    type: 'website'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/mancala'
  }
}

export default function MancalaPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '만칼라 (Mancala)',
    description: '고대 보드게임 만칼라! 돌을 전략적으로 움직여 더 많이 모으면 승리! AI 대전 및 온라인 대전',
    url: 'https://toolhub.ai.kr/mancala',
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
          gameKey="mancala"
          icon="🥜"
          name="만칼라"
          description="구덩이의 돌을 뿌려 더 많이 모으면 승리하는 전략 게임"
        />
      </div>
    </>
  )
}
