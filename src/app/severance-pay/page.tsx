import { Metadata } from 'next'
import { Suspense } from 'react'
import SeverancePay from '@/components/SeverancePay'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '퇴직금 계산기 - 법정 퇴직금, 평균임금 계산 | 툴허브',
  description: '퇴직금 계산기 - 입사일, 퇴사일, 월 기본급을 입력하면 법정 퇴직금을 계산합니다. 평균임금 기반 정확한 퇴직금 산출.',
  keywords: '퇴직금 계산기, 퇴직금 계산, 퇴직금 산출, severance pay calculator, 평균임금 계산',
  openGraph: { title: '퇴직금 계산기 | 툴허브', description: '법정 퇴직금 계산', url: 'https://toolhub.ai.kr/severance-pay', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '퇴직금 계산기 | 툴허브', description: '법정 퇴직금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/severance-pay/' },
}

export default function SeverancePayPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '퇴직금 계산기', description: '법정 퇴직금 계산', url: 'https://toolhub.ai.kr/severance-pay', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['퇴직금 계산', '평균임금 산출', '근속연수 계산', '상여금 포함'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퇴직금은 언제부터 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '근로기준법에 따라 1년 이상 계속 근로하고 퇴직하는 경우 퇴직금을 받을 수 있습니다. 4주간 평균 주 15시간 이상 근무한 근로자가 대상이며, 정규직·계약직·아르바이트 모두 해당됩니다. 퇴직일로부터 14일 이내에 지급해야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직금은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '퇴직금 = 1일 평균임금 × 30일 × (총 재직일수 / 365)로 계산합니다. 평균임금은 퇴직 전 3개월간 지급된 임금 총액을 해당 기간의 총 일수로 나눈 금액입니다. 상여금, 연차수당 등 정기적으로 지급되는 금액도 평균임금에 포함됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직금에 세금이 얼마나 부과되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '퇴직소득세는 퇴직금 전체가 아닌 퇴직소득공제 후 금액에 부과됩니다. 근속연수공제(근속기간에 따라 공제), 환산급여공제가 적용되며, 장기 근속자일수록 세금 부담이 적습니다. IRP(개인형퇴직연금)로 이체하면 퇴직소득세를 30~40% 절감할 수 있습니다.',
        },
      },
    ],
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '퇴직금 계산하는 방법',
    description: '근무기간과 평균임금을 입력하면 법정 퇴직금과 세금 공제 후 수령액을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '근무기간 입력', text: '입사일과 퇴사일을 입력하여 총 재직일수를 산정합니다.' },
      { '@type': 'HowToStep', name: '임금 정보 입력', text: '월 기본급을 입력합니다. 상여금, 연차수당이 있다면 함께 입력하세요.' },
      { '@type': 'HowToStep', name: '퇴직금 확인', text: '평균임금 기반 법정 퇴직금과 퇴직소득세 공제 후 실수령액을 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><SeverancePay />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            퇴직금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            퇴직금 계산기는 입사일, 퇴사일, 월 기본급을 입력하면 근로기준법에 따른 법정 퇴직금을 자동으로 산출해 주는 도구입니다. 평균임금 계산, 상여금 및 연차수당 반영, 근속연수별 퇴직금 산출까지 지원하며, 정규직·계약직·아르바이트 모두 1년 이상 근무하고 주 15시간 이상 일했다면 퇴직금 수급 자격이 주어집니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            퇴직금 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>정확한 퇴사일 입력:</strong> 퇴직금은 총 재직일수를 365로 나누어 계산합니다. 퇴사일을 하루 늦추면 근속 기간이 늘어 퇴직금이 증가할 수 있습니다. 특히 365일 미만 직전에는 날짜를 꼼꼼히 확인하세요.</li>
            <li><strong>상여금·연차수당 포함:</strong> 퇴직 전 1년간 지급된 상여금의 3/12, 미사용 연차수당을 평균임금에 포함해야 정확한 퇴직금이 계산됩니다. 급여 명세서로 금액을 확인하세요.</li>
            <li><strong>IRP 계좌로 세금 절감:</strong> 퇴직금을 IRP(개인형 퇴직연금) 계좌로 이체하면 퇴직소득세의 30~40%를 절감할 수 있습니다. 55세 이후 연금 형태로 수령하면 연금소득세(3.3~5.5%)가 적용되어 더 유리합니다.</li>
            <li><strong>미지급 시 구제 방법:</strong> 퇴직 후 14일 이내에 퇴직금이 지급되지 않으면 고용노동부 임금체불 신고 또는 노동청 진정을 통해 권리를 행사할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
