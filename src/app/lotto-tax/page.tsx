import { Metadata } from 'next'
import { Suspense } from 'react'
import LottoTaxCalculator from '@/components/LottoTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '로또 당첨금 세금 계산기 - 실수령액 확인 | 툴허브',
  description: '로또·복권 당첨금에 부과되는 세금(22%/33%)을 자동으로 계산하고 실수령액을 확인하세요. 3억원 기준 구간별 세율, 등수별 평균 당첨금, 수령 절차 안내.',
  keywords: '로또 세금, 복권 세금, 당첨금 세금, 로또 실수령액, 복권 당첨금 계산, 기타소득세, 로또 1등 세금',
  openGraph: {
    title: '로또 당첨금 세금 계산기 | 툴허브',
    description: '로또·복권 당첨금 세금(22%/33%) 자동 계산, 실수령액 확인',
    url: 'https://toolhub.ai.kr/lotto-tax',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '로또 당첨금 세금 계산기',
    description: '로또·복권 당첨금 세금 자동 계산, 실수령액 확인',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lotto-tax',
  },
}

export default function LottoTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '로또 당첨금 세금 계산기',
    description: '로또·복권 당첨금에 부과되는 세금을 계산하고 실수령액을 확인하는 계산기',
    url: 'https://toolhub.ai.kr/lotto-tax',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '3억원 기준 구간별 세율 (22%/33%) 자동 계산',
      '실수령액 즉시 확인',
      '로또 등수별 평균 당첨금 프리셋',
      '당첨금별 세금 비교표',
      '수령 절차 안내',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <LottoTaxCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
