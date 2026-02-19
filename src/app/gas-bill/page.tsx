import { Metadata } from 'next'
import { Suspense } from 'react'
import GasBill from '@/components/GasBill'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '가스 요금 계산기 - 도시가스 사용량별 요금 계산 | 툴허브',
  description: '가스 요금 계산기 - 도시가스 사용량(MJ)을 입력하면 지역별, 계절별 가스 요금을 계산합니다. 기본요금, 사용요금, 부가세 포함.',
  keywords: '가스 요금 계산기, 도시가스 요금, 가스비 계산, 가스 사용량, gas bill calculator',
  openGraph: { title: '가스 요금 계산기 | 툴허브', description: '도시가스 사용량별 요금 계산', url: 'https://toolhub.ai.kr/gas-bill', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '가스 요금 계산기 | 툴허브', description: '도시가스 사용량별 요금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/gas-bill' },
}

export default function GasBillPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '가스 요금 계산기', description: '도시가스 사용량별 요금 계산', url: 'https://toolhub.ai.kr/gas-bill', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['도시가스 요금', '지역별 단가', '계절별 요금', '부가세 포함'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><GasBill /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
