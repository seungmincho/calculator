import { Metadata } from 'next'
import { Suspense } from 'react'
import HourlyWage from '@/components/HourlyWage'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '시급 계산기 - 시급, 일급, 월급, 연봉 변환 | 툴허브',
  description: '시급 계산기 - 시급, 일급, 월급, 연봉을 상호 변환합니다. 2024년 최저시급 기준 비교, 근무시간 설정 가능.',
  keywords: '시급 계산기, 시급 계산, 일급 계산, 월급 시급 변환, hourly wage calculator, 최저시급',
  openGraph: { title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/hourly-wage' },
}

export default function HourlyWagePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '시급 계산기', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['시급 계산', '일급 변환', '월급 변환', '최저시급 비교'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><HourlyWage /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
