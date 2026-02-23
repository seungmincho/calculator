import { Metadata } from 'next'
import { Suspense } from 'react'
import SalaryComparison from '@/components/SalaryComparison'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '연봉 실수령액 비교기 - 이직 연봉 비교, 4대보험 차이 계산 | 툴허브',
  description: '두 개 이상의 연봉을 나란히 비교하세요. 4대보험, 소득세, 실수령액 차이를 한눈에 확인할 수 있는 연봉 비교 계산기입니다. 이직, 연봉 협상 시 실제 수령액 차이를 정확하게 비교해보세요.',
  keywords: '연봉 비교, 실수령액 비교, 이직 연봉 계산, 연봉 차이, 4대보험 비교, 소득세 비교, 연봉 협상, 연봉 실수령액 비교기',
  openGraph: {
    title: '연봉 실수령액 비교기 | 툴허브',
    description: '연봉 2~4개를 나란히 비교! 4대보험, 소득세, 월 실수령액 차이를 한눈에 확인하세요.',
    url: 'https://toolhub.ai.kr/salary-comparison',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '연봉 실수령액 비교기 | 툴허브',
    description: '연봉 2~4개를 나란히 비교! 4대보험, 소득세, 월 실수령액 차이를 한눈에 확인하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/salary-comparison',
  },
}

const faqData = [
  {
    question: '연봉이 1000만원 오르면 실수령액은 얼마나 늘어나나요?',
    answer: '연봉 인상분에 대해 4대보험(약 9%)과 소득세(세율 구간에 따라 다름)가 추가로 공제됩니다. 예를 들어 연봉 4000만원에서 5000만원으로 인상 시, 월 실수령액은 약 65~70만원 증가합니다. 정확한 금액은 비과세액, 부양가족 수에 따라 달라지므로 비교기로 확인해보세요.',
  },
  {
    question: '이직 시 연봉 비교에서 꼭 확인해야 할 것은?',
    answer: '비과세 수당(식대, 차량유지비 등)이 회사마다 다르므로 반드시 포함하여 비교하세요. 동일한 연봉이라도 비과세 항목이 많은 회사가 실수령액이 더 높을 수 있습니다. 또한 부양가족 수 변동이 예상되면 함께 반영하여 비교하는 것이 좋습니다.',
  },
  {
    question: '최대 몇 개까지 비교할 수 있나요?',
    answer: '최대 4개의 연봉 시나리오를 동시에 비교할 수 있습니다. 현재 직장, 이직 제안 A, 이직 제안 B 등 여러 옵션을 한눈에 비교해보세요.',
  },
]

export default function SalaryComparisonPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연봉 실수령액 비교기',
    description: '연봉 2~4개를 나란히 비교하여 4대보험, 소득세, 실수령액 차이를 확인하는 계산기',
    url: 'https://toolhub.ai.kr/salary-comparison',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2~4개 연봉 동시 비교',
      '4대보험 상세 비교',
      '소득세/지방소득세 비교',
      '실효세율 비교',
      '시각적 차트 비교',
      '비교 결과 복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <SalaryComparison />
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
