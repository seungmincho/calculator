import { Metadata } from 'next'
import { Suspense } from 'react'
import AnnualLeave from '@/components/AnnualLeave'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '연차 계산기 - 입사일 기준 연차 일수 계산 | 툴허브',
  description: '연차 계산기 - 입사일을 기준으로 발생한 연차 일수, 잔여 연차, 연차 발생 내역을 계산합니다. 근로기준법 기반 정확한 연차 계산.',
  keywords: '연차 계산기, 연차 일수 계산, 연차 발생, 잔여 연차, annual leave calculator',
  openGraph: { title: '연차 계산기 | 툴허브', description: '입사일 기준 연차 일수 계산', url: 'https://toolhub.ai.kr/annual-leave', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '연차 계산기 | 툴허브', description: '입사일 기준 연차 일수 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/annual-leave' },
}

export default function AnnualLeavePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '연차 계산기', description: '입사일 기준 연차 일수 계산', url: 'https://toolhub.ai.kr/annual-leave', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['연차 일수 계산', '잔여 연차', '연차 발생 내역', '근로기준법 기반'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><AnnualLeave /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
