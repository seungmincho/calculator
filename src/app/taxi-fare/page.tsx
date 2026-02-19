import { Metadata } from 'next'
import { Suspense } from 'react'
import TaxiFare from '@/components/TaxiFare'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '택시 요금 계산기 - 거리별 예상 요금, 심야 할증 | 툴허브',
  description: '택시 요금 계산기 - 이동 거리와 시간을 입력하면 예상 택시 요금을 계산합니다. 일반/모범/대형 택시, 심야 할증 포함.',
  keywords: '택시 요금 계산기, 택시비 계산, 택시 요금, taxi fare calculator, 심야 택시 요금',
  openGraph: { title: '택시 요금 계산기 | 툴허브', description: '예상 택시 요금 계산', url: 'https://toolhub.ai.kr/taxi-fare', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '택시 요금 계산기 | 툴허브', description: '예상 택시 요금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/taxi-fare' },
}

export default function TaxiFarePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '택시 요금 계산기', description: '예상 택시 요금 계산', url: 'https://toolhub.ai.kr/taxi-fare', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['택시 요금 계산', '일반/모범 택시', '심야 할증', '지역별 요금'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><TaxiFare /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
