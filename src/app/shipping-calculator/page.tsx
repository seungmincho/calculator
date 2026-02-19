import { Metadata } from 'next'
import { Suspense } from 'react'
import ShippingCalc from '@/components/ShippingCalc'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '배송비 계산기 - 택배 요금 비교, 무게별 배송료 | 툴허브',
  description: '배송비 계산기 - 택배사별 배송 요금을 비교하고 무게, 크기별 배송료를 계산합니다. CJ대한통운, 한진, 로젠 등.',
  keywords: '배송비 계산기, 택배 요금 계산, 택배비 비교, shipping calculator, 배송료 계산',
  openGraph: { title: '배송비 계산기 | 툴허브', description: '택배사별 배송 요금 비교 계산', url: 'https://toolhub.ai.kr/shipping-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '배송비 계산기 | 툴허브', description: '택배사별 배송 요금 비교 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/shipping-calculator' },
}

export default function ShippingCalcPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '배송비 계산기', description: '택배사별 배송 요금 비교 계산', url: 'https://toolhub.ai.kr/shipping-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['택배사별 요금', '무게별 계산', '크기별 계산', '요금 비교'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ShippingCalc /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
