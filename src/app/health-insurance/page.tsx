import { Metadata } from 'next'
import { Suspense } from 'react'
import HealthInsuranceCalculator from '@/components/HealthInsuranceCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '건강보험료 계산기 2025 - 직장/지역가입자 보험료 계산 | 툴허브',
  description: '2025년 건강보험료를 정확하게 계산합니다. 직장가입자 4대보험료, 지역가입자 소득·재산 보험료, 피부양자 자격 판정, 직장 vs 지역가입자 비교까지 한번에 확인하세요.',
  keywords: '건강보험료 계산기, 건강보험료, 직장가입자 보험료, 지역가입자 보험료, 4대보험, 건강보험 요율, 장기요양보험, 피부양자 자격, 국민건강보험, 2025 보험료율',
  openGraph: {
    title: '건강보험료 계산기 2025 - 직장/지역가입자 | 툴허브',
    description: '2025년 직장·지역가입자 건강보험료 계산, 피부양자 판정, 직장 vs 지역 비교',
    url: 'https://toolhub.ai.kr/health-insurance',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '건강보험료 계산기 2025 | 툴허브',
    description: '직장/지역가입자 건강보험료 계산, 피부양자 판정',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/health-insurance/',
  },
}

export default function HealthInsurancePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '건강보험료 계산기',
    description: '2025년 직장·지역가입자 건강보험료 계산, 피부양자 판정, 직장 vs 지역 비교',
    url: 'https://toolhub.ai.kr/health-insurance/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2025년 건강보험료율 7.09% 반영',
      '직장가입자 4대보험 전체 계산',
      '지역가입자 소득·재산 보험료 계산',
      '피부양자 자격 판정',
      '직장 vs 지역가입자 비교 분석',
      '장기요양보험료 자동 계산',
      '국민연금 상한액 반영',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2025년 건강보험료율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 건강보험료율은 7.09%입니다. 직장가입자는 근로자와 사업주가 각각 3.545%씩 부담하며, 지역가입자는 전액 본인이 부담합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '피부양자 자격 조건은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '피부양자 자격 조건은 연소득 2,000만원 미만, 사업자등록이 없어야 하며(사업소득 0원), 재산세 과세표준 합계 5.4억원 이하여야 합니다. 5.4억~9억 사이인 경우 연소득 1,000만원 이하여야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '지역가입자 건강보험료는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '지역가입자 건강보험료는 소득보험료와 재산보험료를 합산합니다. 소득보험료는 소득월액에 7.09%를 곱하고, 재산보험료는 재산 과세표준에서 기본공제 1억을 뺀 후 등급별 점수에 208.4원을 곱합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <HealthInsuranceCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
