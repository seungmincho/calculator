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
    description: '사목 - AI 대전을 지원하는 4목 연결 보드게임',
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사목(Connect Four) 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사목은 7열 6행 수직 보드에서 두 명이 번갈아 말을 떨어뜨리는 게임입니다. 가로, 세로, 대각선으로 4개를 먼저 연결하면 승리합니다. 말은 중력에 의해 해당 열의 가장 아래 빈 칸으로 떨어집니다. 1988년 수학적으로 완전 분석되어, 선공이 최적 전략을 사용하면 반드시 승리할 수 있음이 증명되었습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '사목에서 이기는 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 중앙 열 선점: 중앙 열은 가로, 대각선 연결에 모두 유리 ② 이중 위협 만들기: 두 방향으로 동시에 3개를 만들면 상대가 막을 수 없음 ③ 높이 관리: 짝수/홀수 행의 위협 위치를 계산하여 턴 타이밍 조절 ④ 상대 4연결 차단 우선 ⑤ 수직 연결 주의: 같은 열에 쌓아가면 상대가 쉽게 차단. 선공의 최적 전략은 항상 중앙 열(4번째)에서 시작합니다.'
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
          gameKey="connect4"
          icon="🔴"
          name="커넥트4 (사목)"
          description="7x6 보드에서 같은 색 디스크 4개를 먼저 연결하면 승리"
        />
      </div>
    </>
  )
}
