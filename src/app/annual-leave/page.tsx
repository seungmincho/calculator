import { Metadata } from 'next'
import { Suspense } from 'react'
import AnnualLeave from '@/components/AnnualLeave'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '연차 계산기 - 입사일 기준 연차 일수 계산 | 툴허브',
  description: '연차 계산기 - 입사일을 기준으로 발생한 연차 일수, 잔여 연차, 연차 발생 내역을 계산합니다. 근로기준법 기반 정확한 연차 계산.',
  keywords: '연차 계산기, 연차 일수 계산, 연차 발생, 잔여 연차, annual leave calculator',
  openGraph: { title: '연차 계산기 | 툴허브', description: '입사일 기준 연차 일수 계산', url: 'https://toolhub.ai.kr/annual-leave', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '연차 계산기 | 툴허브', description: '입사일 기준 연차 일수 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/annual-leave/' },
}

export default function AnnualLeavePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '연차 계산기', description: '입사일 기준 연차 일수 계산', url: 'https://toolhub.ai.kr/annual-leave', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['연차 일수 계산', '잔여 연차', '연차 발생 내역', '근로기준법 기반'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '연차 휴가는 몇 일이 발생하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '입사 1년 미만 근로자는 1개월 개근 시 매월 1일씩 최대 11일이 발생합니다. 1년 이상 근무 시 15일이 발생하며, 3년 이상부터는 2년마다 1일씩 추가되어 최대 25일까지 늘어납니다. 주 15시간 이상 근무하는 모든 근로자가 대상입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '미사용 연차에 대한 연차수당은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연차수당은 미사용 연차일수 × 1일 통상임금으로 계산합니다. 통상임금은 월 기본급을 월 소정근로일수로 나눈 금액입니다. 단, 회사가 연차 사용 촉진 절차를 정당하게 실시한 경우에는 미사용 연차수당을 지급하지 않을 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '연차 사용 촉진제도란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연차 사용 촉진제도는 사용자가 근로자에게 미사용 연차를 사용하도록 촉구하는 제도입니다. 연차 소멸 6개월 전 미사용 연차 일수를 알려주고, 소멸 2개월 전까지 사용 시기를 지정하도록 촉구합니다. 근로자가 이에 응하지 않으면 연차수당 지급 의무가 면제됩니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><AnnualLeave /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            연차 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            연차 계산기는 근로기준법에 따라 입사일 기준으로 발생한 연차 휴가 일수, 잔여 연차, 연차 발생 내역을 자동으로 계산하는 무료 온라인 도구입니다. 신입사원의 월 단위 연차(11일)부터 장기 근속자의 추가 연차(최대 25일)까지 정확하게 산출하며, 연차수당 계산에도 활용할 수 있습니다. 직장인이라면 자신의 연차 권리를 정확히 파악하는 데 꼭 필요한 도구입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            연차 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>입사 1년 미만:</strong> 1개월 개근 시 다음 달 1일의 연차가 생기므로, 입사 1개월 후부터 바로 1일 사용이 가능합니다.</li>
            <li><strong>연차 소멸 기한:</strong> 연차 휴가는 발생일로부터 1년 이내에 사용하지 않으면 소멸되므로 잔여 연차를 주기적으로 확인하세요.</li>
            <li><strong>연차수당 계산:</strong> 미사용 연차에 대해 통상임금 기준으로 연차수당을 청구할 수 있으며, 미사용 연차 일수 × 1일 통상임금으로 계산합니다.</li>
            <li><strong>장기 근속 추가 연차:</strong> 3년 이상 근무 시 매 2년마다 1일씩 추가되어 최대 25일까지 늘어납니다.</li>
            <li><strong>사용 촉진 제도 주의:</strong> 회사가 연차 사용을 촉구했는데도 사용하지 않으면 연차수당 지급 의무가 면제될 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
