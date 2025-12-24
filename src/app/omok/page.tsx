import { Metadata } from 'next'
import Omok from '@/components/Omok'

export const metadata: Metadata = {
  title: '온라인 오목 | 실시간 대전 | 툴허브',
  description: '친구와 실시간으로 오목 대전을 즐기세요. 방을 만들거나 다른 플레이어의 방에 입장하여 19x19 바둑판에서 오목 게임을 할 수 있습니다. 서버 없이 브라우저만으로 P2P 대전이 가능합니다.',
  keywords: [
    '오목',
    '온라인 오목',
    '오목 게임',
    '실시간 대전',
    'P2P 게임',
    '바둑판 오목',
    '2인용 게임',
    '보드게임',
    'gomoku',
    'five in a row'
  ],
  openGraph: {
    title: '온라인 오목 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오목 대전을 즐기세요. 19x19 바둑판에서 온라인 오목 게임!',
    url: 'https://toolhub.ai.kr/omok',
    type: 'website',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-omok.png',
        width: 1200,
        height: 630,
        alt: '온라인 오목 게임'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '온라인 오목 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오목 대전을 즐기세요. 19x19 바둑판에서 온라인 오목 게임!'
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
    canonical: 'https://toolhub.ai.kr/omok'
  }
}

export default function OmokPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <Omok />
    </div>
  )
}
