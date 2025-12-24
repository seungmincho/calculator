import { Metadata } from 'next'
import Othello from '@/components/Othello'

export const metadata: Metadata = {
  title: '온라인 오셀로 | 실시간 대전 | 툴허브',
  description: '친구와 실시간으로 오셀로(리버시) 대전을 즐기세요. 방을 만들거나 다른 플레이어의 방에 입장하여 8x8 보드에서 오셀로 게임을 할 수 있습니다. 서버 없이 브라우저만으로 P2P 대전이 가능합니다.',
  keywords: [
    '오셀로',
    '리버시',
    '온라인 오셀로',
    '오셀로 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    'othello',
    'reversi'
  ],
  openGraph: {
    title: '온라인 오셀로 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오셀로(리버시) 대전을 즐기세요. 8x8 보드에서 온라인 오셀로 게임!',
    url: 'https://toolhub.ai.kr/othello',
    type: 'website',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-othello.png',
        width: 1200,
        height: 630,
        alt: '온라인 오셀로 게임'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '온라인 오셀로 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오셀로(리버시) 대전을 즐기세요. 8x8 보드에서 온라인 오셀로 게임!'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/othello'
  }
}

export default function OthelloPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <Othello />
    </div>
  )
}
