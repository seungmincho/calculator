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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '50/30/20 규칙이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '50/30/20 규칙은 세후 소득을 필수 생활비 50%(주거, 식비, 교통, 보험), 여가/소비 30%(쇼핑, 외식, 취미), 저축/투자 20%로 배분하는 예산 관리법입니다. 예를 들어 월 실수령 300만 원이면 필수비 150만 원, 소비 90만 원, 저축 60만 원이 기준입니다. 한국에서는 주거비 비중이 높아 60/20/20으로 조정하기도 합니다.' } },
      { '@type': 'Question', name: '한국 1인 가구 평균 생활비는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '통계청 기준 2024년 한국 1인 가구 월평균 생활비는 약 180~220만 원입니다. 주요 항목별로 주거비 50~70만 원, 식비 40~50만 원, 교통/통신 15~20만 원, 의류/미용 10~15만 원, 여가/문화 10~15만 원 수준입니다. 서울 거주 시 주거비가 높아 총 생활비가 250만 원 이상일 수 있습니다.' } },
      { '@type': 'Question', name: '생활비를 효과적으로 절약하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '효과적인 절약법: ① 고정비 먼저 줄이기(통신비 알뜰폰, 구독서비스 정리) ② 식비 절약(주 1회 장보기, 도시락) ③ 교통비(자전거, 정기권 활용) ④ 충동구매 방지(24시간 규칙) ⑤ 가계부 작성으로 지출 패턴 파악. 가장 큰 효과는 고정비 절감이며, 월 10~20만 원 절약이 가능합니다.' } },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <BudgetCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
