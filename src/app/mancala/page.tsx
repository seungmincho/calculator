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
    description: '만칼라 - AI 대전을 지원하는 전략 보드게임',
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '만칼라 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '만칼라는 세계에서 가장 오래된 보드게임 중 하나로, 아프리카에서 기원했습니다. 6개의 구멍(pit)과 1개의 저장소(store)가 각 플레이어에게 있습니다. 자기 쪽 구멍 하나를 선택해 돌을 집어 반시계 방향으로 하나씩 놓습니다. 마지막 돌이 자기 저장소에 들어가면 한 번 더 플레이합니다. 마지막 돌이 자기 쪽 빈 구멍에 들어가면 그 맞은편 상대 구멍의 돌까지 가져옵니다. 한쪽의 구멍이 모두 비면 게임이 끝나고 돌이 많은 쪽이 승리합니다.'
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
          gameKey="mancala"
          icon="🥜"
          name="만칼라"
          description="구덩이의 돌을 뿌려 더 많이 모으면 승리하는 전략 게임"
        />
      </div>
    </>
  )
}
