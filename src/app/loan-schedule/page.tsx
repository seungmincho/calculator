import { Metadata } from 'next'
import { Suspense } from 'react'
import LoanSchedule from '@/components/LoanSchedule'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '대출 상환 스케줄러 - 원리금균등/원금균등 상환 계획표 | 툴허브',
  description: '대출 상환 스케줄러 - 원리금균등, 원금균등, 만기일시상환 방식별 상세 상환 계획표를 생성하세요. 거치기간, 조기상환 시뮬레이션 지원.',
  keywords: '대출 상환 스케줄, 원리금균등상환, 원금균등상환, 만기일시상환, 상환 계획표, 대출 이자 계산, 조기상환, 거치기간, loan schedule',
  openGraph: {
    title: '대출 상환 스케줄러 | 툴허브',
    description: '원리금균등, 원금균등, 만기일시상환 방식별 상세 상환 계획표 생성',
    url: 'https://toolhub.ai.kr/loan-schedule',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '대출 상환 스케줄러 | 툴허브',
    description: '상환 방식별 상세 상환 계획표 생성 및 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/loan-schedule',
  },
}

export default function LoanSchedulePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '대출 상환 스케줄러',
    description: '원리금균등, 원금균등, 만기일시상환 방식별 상세 상환 계획표를 생성하고 비교합니다. 거치기간, 조기상환 시뮬레이션 지원.',
    url: 'https://toolhub.ai.kr/loan-schedule',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '원리금균등상환 계획표',
      '원금균등상환 계획표',
      '만기일시상환 계획표',
      '거치기간 설정',
      '조기상환 시뮬레이션',
      '대출 조건 비교',
      'CSV 다운로드',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <LoanSchedule />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
