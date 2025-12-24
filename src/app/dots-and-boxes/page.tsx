import { Metadata } from 'next'
import DotsAndBoxes from '@/components/DotsAndBoxes'

export const metadata: Metadata = {
  title: '온라인 도트앤박스 | 점과 상자 게임 | 툴허브',
  description: '친구와 실시간으로 도트앤박스 대전을 즐기세요. 점을 연결해 상자를 완성하면 점수 획득! 더 많은 상자를 차지하면 승리. 서버 없이 P2P 대전.',
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
  }
}

export default function DotsAndBoxesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <DotsAndBoxes />
    </div>
  )
}
