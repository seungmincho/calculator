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
    canonical: 'https://toolhub.ai.kr/unemployment-benefit/',
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

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            실업급여(구직급여) 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            실업급여 계산기는 2026년 고용보험 기준으로 구직급여 수급액과 수급일수를 자동 산정해 드리는 도구입니다. 평균임금, 고용보험 가입기간, 나이(이직일 기준)를 입력하면 1일 구직급여액과 총 수급 예상금액을 계산합니다. 비자발적 이직(해고, 권고사직, 계약만료 등)으로 실직한 근로자라면 고용보험 가입 기간에 따라 최소 120일에서 최대 270일까지 수급할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            실업급여 신청 전 꼭 알아야 할 사항
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>수급 자격 조건:</strong> 이직일 이전 18개월 내 고용보험 피보험 단위기간이 180일 이상이어야 하며, 비자발적 이직이어야 합니다.</li>
            <li><strong>1일 구직급여액:</strong> 이직 전 평균임금의 60%이며, 상한액(2026년 기준 66,000원/일)과 하한액(최저임금의 80%)이 적용됩니다.</li>
            <li><strong>신청 시기:</strong> 이직 다음 날부터 12개월 이내에 신청해야 하며, 수급기간이 남아도 12개월이 경과하면 소멸됩니다.</li>
            <li><strong>구직 활동 의무:</strong> 수급 중 매주 구직 활동(입사지원, 취업특강 수강 등)을 하고 고용센터에 실업 인정을 받아야 급여가 지급됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
