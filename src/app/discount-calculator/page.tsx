import { Metadata } from 'next'
import { Suspense } from 'react'
import DiscountCalculator from '@/components/DiscountCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '할인 계산기 - 할인율, 할인가, 원가 계산 | 툴허브',
  description: '할인 계산기 - 할인율로 최종 가격 계산, 원가에서 할인 금액 확인, 중복 할인 계산. 쇼핑, 세일 시 유용한 할인 계산기.',
  keywords: '할인 계산기, 할인율 계산, 할인가 계산, 세일 계산, discount calculator, 퍼센트 할인',
  openGraph: { title: '할인 계산기 | 툴허브', description: '할인율, 할인가, 원가 간편 계산', url: 'https://toolhub.ai.kr/discount-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '할인 계산기 | 툴허브', description: '할인율, 할인가 간편 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/discount-calculator' },
}

export default function DiscountCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '할인 계산기', description: '할인율, 할인가, 원가 계산기', url: 'https://toolhub.ai.kr/discount-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['할인율 계산', '할인가 계산', '중복 할인', '빠른 할인율'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><DiscountCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
