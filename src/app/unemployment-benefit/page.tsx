import { Metadata } from 'next'
import { Suspense } from 'react'
import UnemploymentBenefit from '@/components/UnemploymentBenefit'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '실업급여 계산기 - 구직급여 수급액 자동계산 | 툴허브',
  description: '2026년 고용보험 기준 실업급여(구직급여) 수급액을 자동으로 계산합니다. 평균임금, 고용보험 가입기간, 나이에 따른 수급일수와 월 예상 수급액을 확인하세요.',
  keywords: '실업급여 계산기, 구직급여 계산, 실업급여 수급액, 고용보험, 실업급여 기간, 실업급여 금액, 실직 수당',
  openGraph: {
    title: '실업급여 계산기 | 툴허브',
    description: '2026년 기준 실업급여(구직급여) 수급액을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/unemployment-benefit',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '실업급여 계산기',
    description: '고용보험 기준 실업급여 수급액 자동계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/unemployment-benefit',
  },
}

export default function UnemploymentBenefitPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '실업급여 계산기',
    description: '2026년 고용보험 기준 실업급여(구직급여) 수급액을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/unemployment-benefit',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['구직급여 수급액 계산', '수급일수 자동산정', '월 예상 수급액', '연장급여 안내']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <UnemploymentBenefit />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
