import { Metadata } from 'next'
import Battleship from '@/components/Battleship'

export const metadata: Metadata = {
  title: '온라인 배틀십 | 해전 게임 | 툴허브',
  description: '친구와 실시간으로 배틀십(해전) 대전을 즐기세요. 10x10 그리드에 함선을 배치하고 상대방의 함선을 먼저 모두 침몰시키면 승리! 서버 없이 P2P 대전.',
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
  }
}

export default function BattleshipPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <Battleship />
    </div>
  )
}
