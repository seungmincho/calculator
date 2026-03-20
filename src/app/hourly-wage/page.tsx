import { Metadata } from 'next'
import { Suspense } from 'react'
import HourlyWage from '@/components/HourlyWage'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '시급 계산기 - 시급, 일급, 월급, 연봉 변환 | 툴허브',
  description: '시급 계산기 - 시급, 일급, 월급, 연봉을 상호 변환합니다. 2024년 최저시급 기준 비교, 근무시간 설정 가능.',
  keywords: '시급 계산기, 시급 계산, 일급 계산, 월급 시급 변환, hourly wage calculator, 최저시급',
  openGraph: { title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/hourly-wage/' },
}

export default function HourlyWagePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '시급 계산기', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['시급 계산', '일급 변환', '월급 변환', '최저시급 비교'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2025년 최저시급은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 최저시급은 시간당 10,030원입니다. 주 40시간 근무 기준 월 환산액은 약 2,096,270원(주휴수당 포함)이며, 연봉으로 환산하면 약 25,155,240원입니다. 최저임금은 정규직, 비정규직, 아르바이트 등 모든 근로자에게 동일하게 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '시급을 월급으로 변환하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '월급 = 시급 × 1일 근로시간 × 월 소정근로일수로 계산합니다. 주 5일, 1일 8시간 근무 기준 월 소정근로시간은 209시간(유급 주휴 포함)입니다. 주 5일 근무 시 월 소정근로일수는 약 21.7일이지만, 주휴시간을 포함하면 209시간을 시급에 곱합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주휴수당은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주휴수당은 1주 15시간 이상 근무하고 소정근로일을 개근한 근로자에게 지급됩니다. 계산법은 (1주 소정근로시간 / 40) × 8 × 시급입니다. 예를 들어 주 40시간 근무 시 8시간분의 시급이 추가되며, 주 20시간 근무 시 4시간분이 추가됩니다.',
        },
      },
    ],
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '시급 계산하는 방법',
    description: '월급 또는 연봉을 입력하면 근무시간 기준으로 시급을 환산합니다.',
    step: [
      { '@type': 'HowToStep', name: '급여 유형 선택', text: '시급, 일급, 월급, 연봉 중 알고 있는 급여 유형을 선택합니다.' },
      { '@type': 'HowToStep', name: '금액과 근무시간 입력', text: '급여 금액과 주간 근무시간, 근무일수를 입력합니다.' },
      { '@type': 'HowToStep', name: '환산 결과 확인', text: '시급·일급·월급·연봉 상호 변환 결과와 최저시급 대비 비교를 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><HourlyWage />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            시급 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            시급 계산기는 시급·일급·월급·연봉을 상호 변환하는 무료 온라인 도구입니다. 2025년 최저시급(10,030원) 기준 비교, 주휴수당 포함 월급 환산, 아르바이트·파트타임·정규직 등 다양한 근무 형태에 맞춰 실수령액을 계산합니다. 취업 협상, 아르바이트 급여 확인, 연봉 협상 등에 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            시급 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>주휴수당 포함 여부 확인:</strong> 주 15시간 이상 근무하면 주휴수당이 발생합니다. 월급 협상 시 주휴수당 포함 여부를 반드시 확인하세요.</li>
            <li><strong>4대보험 공제:</strong> 월 소득이 일정 기준 이상이면 국민연금·건강보험·고용보험·산재보험이 공제됩니다. 실수령액은 세전 금액의 약 88~92% 수준입니다.</li>
            <li><strong>연봉 협상 활용:</strong> 연봉을 시급으로 환산하면 시간당 가치를 구체적으로 파악하여 협상 기준을 세울 수 있습니다.</li>
            <li><strong>최저시급 위반 확인:</strong> 받은 시급이 2025년 최저시급(10,030원) 미만이라면 고용노동부에 신고할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
