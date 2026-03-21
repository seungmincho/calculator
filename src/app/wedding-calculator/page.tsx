import { Metadata } from 'next'
import { Suspense } from 'react'
import WeddingCalculator from '@/components/WeddingCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '결혼비용 계산기 2025 - 예식비용, 축의금, 양가분담 계산 | 툴허브',
  description: '결혼 총 비용을 항목별로 계획하고 축의금 예상, 양가 분담까지 한번에 계산하세요. 예식장, 스드메, 예물, 예단, 신혼여행, 신혼집 비용을 서울/지방 기준으로 자동 추정합니다.',
  keywords: '결혼비용 계산기, 결혼 예산, 웨딩 비용, 축의금 계산, 양가 분담, 예식장 비용, 스드메 비용, 예물 예단, 신혼여행 비용, 신혼집 비용, 결혼 준비 체크리스트',
  openGraph: {
    title: '결혼비용 계산기 - 예산 계획부터 양가 분담까지 | 툴허브',
    description: '결혼 총 비용 항목별 계획, 축의금 예상, 양가 분담 비율 계산. 서울/지방 평균 비용 자동 추정.',
    url: 'https://toolhub.ai.kr/wedding-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '결혼비용 계산기 | 툴허브',
    description: '결혼 총 비용 계획, 축의금 예상, 양가 분담 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/wedding-calculator/',
  },
}

export default function WeddingCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '결혼비용 계산기',
    description: '결혼 총 비용 항목별 계획, 축의금 예상, 양가 분담 계산. 서울/수도권·지방 평균 비용 자동 추정.',
    url: 'https://toolhub.ai.kr/wedding-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '8개 카테고리 30+ 항목별 비용 관리',
      '서울/수도권 vs 지방 기준 자동 추정',
      '예산 vs 실제 비용 비교',
      '축의금 예상 및 커버율 계산',
      '양가 분담 (항목별/비율/금액)',
      '종합 대시보드 및 차트',
      'PDF 저장 및 결과 복사',
      'localStorage 자동 저장',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '결혼 비용은 평균 얼마나 드나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 기준 서울/수도권 평균 결혼 비용은 신혼집 제외 3,500~5,000만원이며, 지방은 2,000~3,000만원입니다. 신혼집 포함 시 1억~3억원 이상이 소요됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '축의금으로 결혼 비용을 얼마나 충당할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '일반적으로 축의금은 신혼집 비용을 제외한 결혼 비용의 50~80%를 커버합니다. 하객 수, 관계별 축의금 금액에 따라 달라지며, 직장동료·친구는 5만원, 가족·친척은 10만원이 평균입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '양가 분담은 보통 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전통적으로 예식장·신혼집은 신랑측, 스드메는 신부측이 부담했으나, 최근에는 공동 분담이 증가하고 있습니다. 양가 합의에 따라 항목별, 비율별, 금액별로 자유롭게 결정할 수 있습니다.',
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
        <Breadcrumb />
              <WeddingCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
