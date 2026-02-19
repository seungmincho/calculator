import { Metadata } from 'next'
import { Suspense } from 'react'
import WaterBillCalculator from '@/components/WaterBillCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '수도요금 계산기 - 수도 사용량별 요금 계산 | 툴허브',
  description: '수도요금 계산기 - 월 수도 사용량(m³)을 입력하면 누진제 기준으로 수도요금을 계산합니다. 하수도요금, 물이용부담금, 부가세 포함.',
  keywords: '수도요금 계산기, 수도요금 계산, 수도세 계산, 물값 계산, water bill calculator',
  openGraph: { title: '수도요금 계산기 | 툴허브', description: '수도 사용량별 요금 계산', url: 'https://toolhub.ai.kr/water-bill', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '수도요금 계산기 | 툴허브', description: '수도요금 누진제 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/water-bill' },
}

export default function WaterBillPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '수도요금 계산기', description: '수도 사용량별 요금 누진제 계산', url: 'https://toolhub.ai.kr/water-bill', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['누진제 수도요금', '하수도요금', '물이용부담금', '절약 팁'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><WaterBillCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
