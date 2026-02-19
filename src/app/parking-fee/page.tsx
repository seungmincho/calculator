import { Metadata } from 'next'
import { Suspense } from 'react'
import ParkingFee from '@/components/ParkingFee'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '주차 요금 계산기 - 주차장 요금, 시간별 주차비 | 툴허브',
  description: '주차 요금 계산기 - 주차 시간과 요금 체계를 입력하면 총 주차 요금을 계산합니다. 무료 시간, 일 최대 요금 적용.',
  keywords: '주차 요금 계산기, 주차비 계산, 주차장 요금, parking fee calculator, 주차 시간 계산',
  openGraph: { title: '주차 요금 계산기 | 툴허브', description: '주차 시간별 요금 계산', url: 'https://toolhub.ai.kr/parking-fee', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '주차 요금 계산기 | 툴허브', description: '주차 시간별 요금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/parking-fee' },
}

export default function ParkingFeePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '주차 요금 계산기', description: '주차 시간별 요금 계산', url: 'https://toolhub.ai.kr/parking-fee', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주차 요금 계산', '무료 시간 적용', '일 최대 요금', '시간별 요금표'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ParkingFee /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
