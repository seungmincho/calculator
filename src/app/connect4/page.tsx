import { Metadata } from 'next'
import Connect4 from '@/components/Connect4'

export const metadata: Metadata = {
  title: '온라인 커넥트4 | 사목 게임 | 툴허브',
  description: '친구와 실시간으로 커넥트4(사목) 대전을 즐기세요. 7x6 보드에서 같은 색 디스크 4개를 가로, 세로, 대각선으로 연결하면 승리! 서버 없이 P2P 대전.',
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
  }
}

export default function Connect4Page() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <Connect4 />
    </div>
  )
}
