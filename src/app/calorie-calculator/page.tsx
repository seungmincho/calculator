import { Metadata } from 'next'
import CalorieCalculator from '@/components/CalorieCalculator'

export const metadata: Metadata = {
  title: '칼로리 계산기 | 기초대사율, 활동대사율, 다이어트 칼로리 계산 | 툴허브',
  description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량, 유지를 위한 일일 칼로리 목표를 설정하세요. 음식 칼로리와 운동 소모 칼로리도 함께 확인할 수 있습니다.',
  keywords: [
    '칼로리 계산기',
    '기초대사율',
    'BMR',
    'TDEE',
    '활동대사율',
    '다이어트 칼로리',
    '체중 감량',
    '체중 증량',
    '칼로리 목표',
    '음식 칼로리',
    '운동 칼로리',
    '대사량 계산',
    '일일 칼로리',
    '건강 관리',
    '체중 관리'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '칼로리 계산기 | 기초대사율, 활동대사율, 다이어트 칼로리 계산',
    description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량, 유지를 위한 일일 칼로리 목표를 설정하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/calorie-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '칼로리 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '칼로리 계산기 | 기초대사율, 활동대사율, 다이어트 칼로리 계산',
    description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량, 유지를 위한 일일 칼로리 목표를 설정하세요.',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/calorie-calculator',
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

export default function CalorieCalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <CalorieCalculator />
      </div>
    </div>
  )
}