import { Metadata } from 'next'
import { Suspense } from 'react'
import RentConverter from '@/components/RentConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전세 월세 전환 계산기 - 전월세 전환율 계산 | 툴허브',
  description: '전세 월세 전환 계산기 - 전세 보증금을 월세로, 월세를 전세금으로 변환합니다. 전월세 전환율 기준 계산, 연간 비용 비교.',
  keywords: '전세 월세 전환, 전월세 전환율, 전세 월세 계산기, 전세금 월세 변환, rent converter, 전환율 계산',
  openGraph: { title: '전세 월세 전환 계산기 | 툴허브', description: '전세↔월세 전환율 기준 변환', url: 'https://toolhub.ai.kr/rent-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '전세 월세 전환 계산기 | 툴허브', description: '전세↔월세 전환 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/rent-converter' },
}

export default function RentConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '전세 월세 전환 계산기', description: '전세↔월세 전환율 기준 변환', url: 'https://toolhub.ai.kr/rent-converter', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['전세→월세 변환', '월세→전세 변환', '전환율 계산', '연간 비용 비교'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><RentConverter /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
