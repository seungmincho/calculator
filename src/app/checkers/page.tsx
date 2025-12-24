import { Metadata } from 'next'
import Checkers from '@/components/Checkers'

export const metadata: Metadata = {
  title: '온라인 체커 | 서양 장기 | 툴허브',
  description: '친구와 실시간으로 체커(서양 장기) 대전을 즐기세요. 8x8 보드에서 상대방의 말을 모두 잡거나 움직이지 못하게 하면 승리! 서버 없이 P2P 대전.',
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
  }
}

export default function CheckersPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <Checkers />
    </div>
  )
}
