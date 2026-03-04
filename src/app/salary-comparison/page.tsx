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
    canonical: 'https://toolhub.ai.kr/salary-comparison/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            연봉 비교 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            연봉 비교 계산기는 최대 4개의 연봉 시나리오를 나란히 비교하여 4대보험, 소득세, 실수령액 차이를 한눈에 확인할 수 있는 이직·연봉 협상 전용 도구입니다. 현재 직장과 이직 제안을 동시에 입력하면 표면적인 연봉 차이뿐 아니라 세후 실제 수령 금액의 차이를 정확히 파악할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            연봉 비교 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>비과세 수당 포함 비교:</strong> 회사마다 식대, 차량유지비 등 비과세 수당이 다릅니다. 이를 포함해 비교하면 동일 연봉이라도 실수령액 차이가 수십만 원 발생할 수 있습니다.</li>
            <li><strong>실효세율 확인:</strong> 연봉이 높을수록 누진세율이 적용돼 세금 비율이 높아집니다. 각 연봉의 실효세율을 비교하면 인상분에서 세금이 얼마나 빠져나가는지 파악할 수 있습니다.</li>
            <li><strong>이직 손익 분기점 계산:</strong> 이직 시 발생하는 퇴직금 정산, 복리후생 변화 등을 감안하면 실질 이익이 달라집니다. 연봉 차이와 함께 종합적으로 검토하세요.</li>
            <li><strong>부양가족 수 동일 조건 설정:</strong> 공정한 비교를 위해 모든 시나리오에서 부양가족 수와 비과세 항목을 동일하게 설정하면 순수한 연봉 차이의 세후 영향을 확인할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
