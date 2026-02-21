import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '도트앤박스(점과 상자) | AI 대전 · 온라인 대전 | 툴허브',
  description: '점을 연결해 상자를 완성하면 점수 획득! 더 많은 상자를 차지하면 승리. AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '도트앤박스',
    'Dots and Boxes',
    '점과 상자',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    '전략 게임'
  ],
  openGraph: {
    title: '온라인 도트앤박스 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 도트앤박스 대전! 더 많은 상자를 차지하세요!',
    url: 'https://toolhub.ai.kr/dots-and-boxes',
    type: 'website'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dots-and-boxes'
  }
}

export default function DotsAndBoxesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '점과선 (Dots and Boxes)',
    description: '점과선 - AI 대전을 지원하는 점잇기 전략 게임',
    url: 'https://toolhub.ai.kr/dots-and-boxes',
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
          gameKey="dotsandboxes"
          icon="📦"
          name="도트앤박스 (점과 상자)"
          description="점을 연결해 더 많은 상자를 완성하면 승리"
        />
      </div>
    </>
  )
}
