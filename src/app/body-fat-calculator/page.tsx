import { Metadata } from 'next'
import BodyFatCalculator from '@/components/BodyFatCalculator'

export const metadata: Metadata = {
  title: '체지방률 계산기 | Navy, YMCA 공식으로 정확한 체지방 측정 | 툴허브',
  description: 'Navy 공식, YMCA 공식을 사용해 허리, 목, 엉덩이 둘레로 체지방률을 계산하세요. 체성분 분석, 근육량 계산, 이상적인 체지방률 목표 설정까지 한번에!',
  keywords: [
    '체지방률 계산기',
    '체지방률 측정',
    'Navy 공식',
    'YMCA 공식',
    '체성분 분석',
    '허리둘레',
    '목둘레',
    '엉덩이둘레',
    '체지방량',
    '근육량',
    '내장지방',
    '체지방 감량',
    '건강 관리',
    '체성분',
    '몸매 관리'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '체지방률 계산기 | Navy, YMCA 공식으로 정확한 체지방 측정',
    description: 'Navy 공식, YMCA 공식을 사용해 허리, 목, 엉덩이 둘레로 체지방률을 계산하세요. 체성분 분석, 근육량 계산까지!',
    type: 'website',
    url: 'https://toolhub.ai.kr/body-fat-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '체지방률 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '체지방률 계산기 | Navy, YMCA 공식으로 정확한 체지방 측정',
    description: 'Navy 공식, YMCA 공식을 사용해 허리, 목, 엉덩이 둘레로 체지방률을 계산하세요.',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/body-fat-calculator',
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

export default function BodyFatCalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <BodyFatCalculator />
      </div>
    </div>
  )
}