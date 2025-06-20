import { Metadata } from 'next'
import WorkHoursCalculator from '@/components/WorkHoursCalculator'

export const metadata: Metadata = {
  title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산 | 툴허브',
  description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당, 연장근로수당을 자동으로 계산하여 실제 받을 급여를 확인하세요.',
  keywords: [
    '근무시간 계산기',
    '알바비 계산기',
    '야근수당 계산',
    '주휴수당 계산',
    '연장근로수당',
    '시급 계산기',
    '근로기준법',
    '아르바이트 급여',
    '파트타임 급여',
    '최저임금',
    '급여 계산',
    '근로시간',
    '휴게시간',
    '야간근로수당',
    '휴일근로수당'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산',
    description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당, 연장근로수당을 자동으로 계산하여 실제 받을 급여를 확인하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/work-hours-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '근무시간 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산',
    description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당 자동 계산.',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/work-hours-calculator',
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

export default function WorkHoursCalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <WorkHoursCalculator />
      </div>
    </div>
  )
}