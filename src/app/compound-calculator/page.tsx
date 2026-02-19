import { Metadata } from 'next'
import { Suspense } from 'react'
import CompoundCalculator from '@/components/CompoundCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '복리 계산기 - 복리 이자, 투자 수익률 계산 | 툴허브',
  description: '복리 계산기 - 원금, 이율, 기간을 입력하여 복리 이자와 투자 수익을 계산하세요. 월 적립식 투자, 단리 vs 복리 비교, 연도별 성장 그래프를 제공합니다.',
  keywords: '복리 계산기, 복리 이자 계산, 투자 수익률, 적립식 투자, compound interest calculator, 72법칙',
  openGraph: { title: '복리 계산기 | 툴허브', description: '복리 이자 계산, 투자 수익률 시뮬레이션', url: 'https://toolhub.ai.kr/compound-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '복리 계산기 | 툴허브', description: '복리 이자 계산, 투자 수익률 시뮬레이션' },
  alternates: { canonical: 'https://toolhub.ai.kr/compound-calculator' },
}

export default function CompoundCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '복리 계산기', description: '복리 이자 계산, 투자 수익률 시뮬레이션, 단리 vs 복리 비교', url: 'https://toolhub.ai.kr/compound-calculator', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['복리 이자 계산', '월 적립식 투자', '단리 vs 복리 비교', '연도별 성장 그래프'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><CompoundCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
