import { Metadata } from 'next'
import { Suspense } from 'react'
import PensionCalculator from '@/components/PensionCalculator'
import I18nWrapper from '@/components/I18nWrapper'

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
    canonical: 'https://toolhub.ai.kr/pension-calculator',
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
              <PensionCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
