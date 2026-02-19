import { Metadata } from 'next'
import { Suspense } from 'react'
import SeverancePay from '@/components/SeverancePay'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '퇴직금 계산기 - 법정 퇴직금, 평균임금 계산 | 툴허브',
  description: '퇴직금 계산기 - 입사일, 퇴사일, 월 기본급을 입력하면 법정 퇴직금을 계산합니다. 평균임금 기반 정확한 퇴직금 산출.',
  keywords: '퇴직금 계산기, 퇴직금 계산, 퇴직금 산출, severance pay calculator, 평균임금 계산',
  openGraph: { title: '퇴직금 계산기 | 툴허브', description: '법정 퇴직금 계산', url: 'https://toolhub.ai.kr/severance-pay', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '퇴직금 계산기 | 툴허브', description: '법정 퇴직금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/severance-pay' },
}

export default function SeverancePayPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '퇴직금 계산기', description: '법정 퇴직금 계산', url: 'https://toolhub.ai.kr/severance-pay', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['퇴직금 계산', '평균임금 산출', '근속연수 계산', '상여금 포함'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><SeverancePay /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
