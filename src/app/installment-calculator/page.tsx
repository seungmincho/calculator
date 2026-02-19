import { Metadata } from 'next'
import { Suspense } from 'react'
import InstallmentCalc from '@/components/InstallmentCalc'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '카드 할부 계산기 - 할부 수수료, 월 납부금 계산 | 툴허브',
  description: '카드 할부 계산기 - 신용카드 할부 결제 시 월 납부금액과 수수료를 계산합니다. 무이자 할부, 납부 스케줄 제공.',
  keywords: '카드 할부 계산기, 할부 수수료 계산, 할부 이자 계산, installment calculator, 월 납부금',
  openGraph: { title: '카드 할부 계산기 | 툴허브', description: '할부 수수료 및 월 납부금 계산', url: 'https://toolhub.ai.kr/installment-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '카드 할부 계산기 | 툴허브', description: '할부 수수료 및 월 납부금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/installment-calculator' },
}

export default function InstallmentCalcPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '카드 할부 계산기', description: '할부 수수료 및 월 납부금 계산', url: 'https://toolhub.ai.kr/installment-calculator', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['할부 수수료', '월 납부금', '납부 스케줄', '무이자 계산'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><InstallmentCalc /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
