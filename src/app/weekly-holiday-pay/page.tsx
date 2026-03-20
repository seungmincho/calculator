import { Metadata } from 'next'
import { Suspense } from 'react'
import WeeklyHolidayPay from '@/components/WeeklyHolidayPay'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '주휴수당 계산기 - 아르바이트 주휴수당 자동계산 | 툴허브',
  description: '알바 주휴수당을 자동으로 계산합니다. 시급, 근무시간, 근무일수를 입력하면 주휴수당 포함 주급·월급·연봉을 확인할 수 있습니다. 2026년 최저시급 기준.',
  keywords: '주휴수당 계산기, 알바 주휴수당, 주휴수당 계산, 주휴수당 포함 시급, 아르바이트 급여, 주급 계산, 월급 계산',
  openGraph: {
    title: '주휴수당 계산기 | 툴허브',
    description: '알바 주휴수당 포함 주급·월급·연봉을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/weekly-holiday-pay',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '주휴수당 계산기',
    description: '아르바이트 주휴수당 포함 급여 자동계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/weekly-holiday-pay/',
  },
}

export default function WeeklyHolidayPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '주휴수당 계산기',
    description: '알바 주휴수당을 자동으로 계산합니다. 시급, 근무시간, 근무일수 입력으로 주급·월급·연봉을 확인하세요.',
    url: 'https://toolhub.ai.kr/weekly-holiday-pay',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['주휴수당 자동계산', '주급·월급·연봉 환산', '기본급 vs 주휴수당 비율', '15시간 미만 안내']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <WeeklyHolidayPay />
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
            주휴수당 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            주휴수당 계산기는 아르바이트·파트타임 근로자의 주휴수당을 자동으로 계산해 드리는 도구입니다. 시급, 일주일 근무시간, 근무일수를 입력하면 주휴수당 포함 주급, 월급, 연봉 환산금액을 확인할 수 있습니다. 2026년 최저시급(10,030원) 기준으로 계산되며, 주 15시간 이상 근무 시 주휴수당 발생 여부와 금액을 즉시 확인할 수 있어 알바 계약 전 급여 협상에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            주휴수당 핵심 정보
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>발생 조건:</strong> 1주 소정근로시간이 15시간 이상이고, 계약된 근무일을 모두 출근한 경우 주 1회 유급 휴일(주휴일)에 대한 수당이 발생합니다.</li>
            <li><strong>계산 공식:</strong> 주휴수당 = (1주 소정근로시간 ÷ 40시간) × 8시간 × 시급. 예를 들어 주 20시간, 시급 10,030원이면 주휴수당은 40,120원입니다.</li>
            <li><strong>사업주 의무:</strong> 주휴수당은 근로기준법에서 정한 사업주의 법적 의무입니다. 15시간 이상 근무하는 알바생에게 주휴수당을 지급하지 않으면 임금 체불에 해당합니다.</li>
            <li><strong>실수령액 확인:</strong> 주휴수당이 포함된 실제 월급에서 4대 보험(약 9%)이 공제되므로, 실수령액은 계산된 총급여보다 약간 적습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
