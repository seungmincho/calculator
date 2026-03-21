import { Metadata } from 'next'
import { Suspense } from 'react'
import PensionCalculator from '@/components/PensionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '국민연금 수령액 계산기 - 예상 연금액, 납부액 | 툴허브',
  description: '국민연금 예상 수령액, 납부액, 소득대체율을 간편하게 계산하세요. 2024년 기준 국민연금 계산 공식 적용, 가입 기간별 수령액 비교.',
  keywords: '국민연금 계산기, 국민연금 수령액, 국민연금 납부액, 국민연금 예상액, 연금 계산, 노후 준비, 국민연금공단, 소득대체율',
  openGraph: {
    title: '국민연금 수령액 계산기 | 툴허브',
    description: '국민연금 예상 수령액, 납부액, 소득대체율을 간편하게 계산하세요. 2024년 기준 국민연금 계산 공식 적용.',
    url: 'https://toolhub.ai.kr/pension-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '국민연금 수령액 계산기 | 툴허브',
    description: '국민연금 예상 수령액, 납부액, 소득대체율을 간편하게 계산하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/pension-calculator/',
  },
}

export default function PensionCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '국민연금 수령액 계산기',
    description: '국민연금 예상 수령액, 납부액, 소득대체율을 계산하는 무료 온라인 계산기',
    url: 'https://toolhub.ai.kr/pension-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국민연금 예상 수령액 계산',
      '총 납부액 및 본인 부담금 계산',
      '소득대체율 분석',
      '연금/납부 비율 계산',
      '은퇴 나이별 수령액 비교',
    ],
    inLanguage: 'ko',
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '국민연금 수령액은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '국민연금 기본연금액은 1.2 × (A값 + B값) × (가입월수/480)으로 계산합니다. A값은 연금 수급 전 3년간 전체 가입자 평균 소득(2024년 약 286만원)이며, B값은 본인의 가입기간 중 평균 기준소득월액입니다. 가입기간이 20년을 초과할 경우 초과 12개월마다 5%가 추가 지급됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '국민연금 보험료는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '국민연금 보험료율은 소득의 9%입니다. 직장가입자는 근로자와 사용자(회사)가 각각 4.5%씩 부담합니다. 자영업자(지역가입자)는 9% 전액을 본인이 납부합니다. 2024년 기준 상한 기준소득월액은 617만원으로, 이를 초과하는 소득에 대해서는 보험료가 부과되지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '국민연금 수령 나이는 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '출생연도에 따라 국민연금 수령 개시 연령이 다릅니다. 1969년 이후 출생자는 65세부터 노령연금을 수령할 수 있습니다. 최소 가입 기간은 10년(120개월)이며, 가입 기간이 길수록 수령액이 증가합니다. 조기노령연금 신청 시 60세부터 수령 가능하나 수령액이 감액됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <PensionCalculator />
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
            국민연금 수령액 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            국민연금 수령액 계산기는 현재 소득과 가입 기간을 입력하면 예상 국민연금 월 수령액, 총 납부액, 소득대체율을 자동으로 계산해주는 무료 노후 준비 도구입니다. 2024년 기준 국민연금공단 공식 계산 공식(A값·B값)을 적용하며, 은퇴 나이별 수령액 비교와 연금/납부 수익률도 확인할 수 있어 장기적인 노후 재무 계획 수립에 도움이 됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            국민연금 수령액 늘리는 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>가입 기간 연장:</strong> 국민연금은 가입 기간이 길수록 수령액이 비례해서 증가합니다. 직장 이직 공백기에 임의계속가입을 신청하면 수령액을 높일 수 있습니다.</li>
            <li><strong>임의가입 활용:</strong> 전업주부나 소득이 없는 기간에도 임의가입(월 최소 9만 원대)으로 국민연금에 납부하면 수령액과 가입 기간을 늘릴 수 있습니다.</li>
            <li><strong>연금 수령 시기 조절:</strong> 65세 이후로 수령을 연기하면 매 1년마다 7.2%씩 연금액이 증가합니다. 5년 연기 시 36% 증가 효과가 있습니다.</li>
            <li><strong>추납 제도 활용:</strong> 과거 미납 기간이 있다면 추후납부(추납) 제도를 통해 납부하고 가입 기간을 채워 수령액을 높일 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
