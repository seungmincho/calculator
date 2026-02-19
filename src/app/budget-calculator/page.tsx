import { Metadata } from 'next'
import { Suspense } from 'react'
import BudgetCalculator from '@/components/BudgetCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '생활비 계산기 - 월간 예산 관리 | 툴허브',
  description: '생활비 계산기 - 카테고리별 월간 지출을 관리하고 예산을 계획하세요. 50/30/20 규칙, 시각적 분석, 절약 추천을 제공합니다.',
  keywords: '생활비 계산기, 예산 관리, 가계부, 월간 지출, 50 30 20 규칙, 가계 예산, 절약, 지출 분석, budget calculator',
  openGraph: {
    title: '생활비 계산기 - 월간 예산 관리 | 툴허브',
    description: '카테고리별 월간 지출을 관리하고 예산을 계획하세요. 50/30/20 규칙, 시각적 분석, 절약 추천 제공.',
    url: 'https://toolhub.ai.kr/budget-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '생활비 계산기 - 월간 예산 관리',
    description: '카테고리별 월간 지출을 관리하고 예산을 계획하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/budget-calculator',
  },
}

export default function BudgetCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '생활비 계산기',
    description: '카테고리별 월간 지출을 관리하고 예산을 계획하는 도구. 50/30/20 규칙, 시각적 분석, 한국 평균 비교, 절약 추천 기능.',
    url: 'https://toolhub.ai.kr/budget-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '월급/부수입/기타수입 입력',
      '12개 한국형 지출 카테고리',
      '도넛 차트 시각화',
      '50/30/20 규칙 분석',
      '한국 평균 지출 비교',
      '예산 프리셋 저장/불러오기',
      '텍스트 공유 기능',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <BudgetCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
