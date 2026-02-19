import { Metadata } from 'next'
import { Suspense } from 'react'
import ElectricityCalculator from '@/components/ElectricityCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전기요금 계산기 - 한국 주택용 누진제 전기세 계산 | 툴허브',
  description: '전기요금 계산기 - 월 사용량(kWh)을 입력하면 한국 주택용 전기요금을 누진제 기준으로 계산합니다. 계절별 요금, 부가세, 기금까지 포함한 예상 금액.',
  keywords: '전기요금 계산기, 전기세 계산, 전기요금 누진제, 한전 전기요금, 전기세 계산기, electricity bill calculator',
  openGraph: { title: '전기요금 계산기 | 툴허브', description: '한국 주택용 전기요금 누진제 계산', url: 'https://toolhub.ai.kr/electricity-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '전기요금 계산기 | 툴허브', description: '한국 주택용 전기요금 누진제 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/electricity-calculator' },
}

export default function ElectricityCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '전기요금 계산기', description: '한국 주택용 전기요금 누진제 기준 계산기', url: 'https://toolhub.ai.kr/electricity-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['누진제 전기요금 계산', '계절별 요금 차이', '부가세/기금 포함', '절약 팁'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ElectricityCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
