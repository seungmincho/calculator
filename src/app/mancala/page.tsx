import { Metadata } from 'next'
import Mancala from '@/components/Mancala'

export const metadata: Metadata = {
  title: '온라인 만칼라 | 실시간 대전 | 툴허브',
  description: '친구와 실시간으로 만칼라 대전을 즐기세요. 6개의 구덩이와 스토어로 이루어진 보드에서 돌을 뿌려 더 많은 돌을 모으면 승리! 서버 없이 P2P 대전.',
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
  }
}

export default function MancalaPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <Mancala />
    </div>
  )
}
