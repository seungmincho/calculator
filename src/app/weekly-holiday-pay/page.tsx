import { Metadata } from 'next'
import { Suspense } from 'react'
import WeeklyHolidayPay from '@/components/WeeklyHolidayPay'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '주휴수당 계산기 - 아르바이트 주휴수당 자동계산 | 툴허브',
  description: '알바 주휴수당을 자동으로 계산합니다. 시급, 근무시간, 근무일수를 입력하면 주휴수당 포함 주급·월급·연봉을 확인할 수 있습니다. 2026년 최저시급 기준.',
  keywords: '주휴수당 계산기, 알바 주휴수당, 주휴수당 계산, 주휴수당 포함 시급, 아르바이트 급여, 주급 계산, 월급 계산',
  openGraph: {
    title: '주휴수당 계산기 | 툴허브',
    description: '알바 주휴수당 포함 주급·월급·연봉을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/weekly-holiday-pay',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '주휴수당 계산기',
    description: '아르바이트 주휴수당 포함 급여 자동계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/weekly-holiday-pay',
  },
}

export default function WeeklyHolidayPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '주휴수당 계산기',
    description: '알바 주휴수당을 자동으로 계산합니다. 시급, 근무시간, 근무일수 입력으로 주급·월급·연봉을 확인하세요.',
    url: 'https://toolhub.ai.kr/weekly-holiday-pay',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['주휴수당 자동계산', '주급·월급·연봉 환산', '기본급 vs 주휴수당 비율', '15시간 미만 안내']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <WeeklyHolidayPay />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
