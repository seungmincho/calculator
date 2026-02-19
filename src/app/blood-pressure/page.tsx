import { Metadata } from 'next'
import { Suspense } from 'react'
import BloodPressure from '@/components/BloodPressure'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '혈압 기록기 - 혈압 측정 기록, 통계 분석 | 툴허브',
  description: '혈압 기록기 - 수축기/이완기 혈압과 맥박을 기록하고 추이를 분석합니다. 혈압 분류, 평균값, 차트 제공.',
  keywords: '혈압 기록기, 혈압 측정, 혈압 관리, blood pressure tracker, 혈압 수첩',
  openGraph: { title: '혈압 기록기 | 툴허브', description: '혈압 측정 기록 및 통계 분석', url: 'https://toolhub.ai.kr/blood-pressure', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '혈압 기록기 | 툴허브', description: '혈압 측정 기록 및 통계 분석' },
  alternates: { canonical: 'https://toolhub.ai.kr/blood-pressure' },
}

export default function BloodPressurePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '혈압 기록기', description: '혈압 측정 기록 및 통계 분석', url: 'https://toolhub.ai.kr/blood-pressure', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['혈압 기록', '맥박 기록', '추이 차트', '혈압 분류'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><BloodPressure /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
