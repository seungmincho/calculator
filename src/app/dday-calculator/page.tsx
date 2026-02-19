import { Metadata } from 'next'
import { Suspense } from 'react'
import DdayCalculator from '@/components/DdayCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '디데이 계산기 - D-Day 카운터, 날짜 차이 계산 | 툴허브',
  description: 'D-Day 카운트다운, 두 날짜 사이 차이 계산, 날짜 더하기/빼기를 한 곳에서. 한국 공휴일과 영업일 계산을 지원합니다.',
  keywords: '디데이 계산기, D-Day, 날짜 계산, 날짜 차이, 영업일 계산, 공휴일, 수능 디데이, 디데이 카운터',
  openGraph: {
    title: '디데이 계산기 | 툴허브',
    description: 'D-Day 카운트다운, 날짜 차이 계산, 영업일 계산 도구',
    url: 'https://toolhub.ai.kr/dday-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '디데이 계산기 - D-Day 카운터 & 날짜 계산',
    description: 'D-Day 카운트다운, 날짜 차이, 영업일 계산을 한 곳에서.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dday-calculator',
  },
}

export default function DdayCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '디데이 계산기',
    description: 'D-Day 카운트다운, 날짜 차이 계산, 날짜 더하기/빼기 도구',
    url: 'https://toolhub.ai.kr/dday-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'D-Day 카운트다운',
      '날짜 차이 계산',
      '날짜 더하기/빼기',
      '영업일 계산',
      '한국 공휴일 반영',
      '인기 D-Day 프리셋',
      'URL 공유'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <DdayCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
