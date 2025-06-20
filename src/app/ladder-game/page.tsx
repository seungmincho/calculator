import { Metadata } from 'next'
import LadderGame from '@/components/LadderGame'

export const metadata: Metadata = {
  title: '사다리 타기 게임 | 온라인 사다리 게임, 순서 정하기 | 툴허브',
  description: '친구들과 함께 즐기는 온라인 사다리 타기 게임! 순서 정하기, 벌칙 정하기, 팀 나누기 등 다양한 상황에서 공정하게 결정하세요.',
  keywords: [
    '사다리 타기',
    '사다리 게임',
    '온라인 사다리',
    '순서 정하기',
    '벌칙 정하기',
    '팀 나누기',
    '랜덤 선택',
    '공정한 선택',
    '사다리타기 온라인',
    '사다리게임 만들기',
    '결정 도구',
    '선택 게임',
    '그룹 게임',
    '파티 게임',
    '모임 게임'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '사다리 타기 게임 | 온라인 사다리 게임, 순서 정하기',
    description: '친구들과 함께 즐기는 온라인 사다리 타기 게임! 순서 정하기, 벌칙 정하기, 팀 나누기 등 다양한 상황에서 공정하게 결정하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/ladder-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '사다리 타기 게임 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사다리 타기 게임 | 온라인 사다리 게임, 순서 정하기',
    description: '친구들과 함께 즐기는 온라인 사다리 타기 게임! 순서 정하기, 벌칙 정하기, 팀 나누기.',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ladder-game',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LadderGamePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <LadderGame />
      </div>
    </div>
  )
}