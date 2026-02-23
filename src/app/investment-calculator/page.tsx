import { Metadata } from 'next'
import { Suspense } from 'react'
import InvestmentCalculator from '@/components/InvestmentCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '투자 수익률 계산기 - CAGR, 적립식·거치식 비교 | 툴허브',
  description: '무료 온라인 투자 수익률 계산기. CAGR(연평균 복리 수익률), 적립식·거치식 투자 비교, 인플레이션 보정 실질 수익률을 계산하세요.',
  keywords: '투자 수익률 계산기, CAGR 계산, 적립식 투자, 거치식 투자, 복리 계산기, 인플레이션 보정, 투자 시뮬레이션',
  openGraph: {
    title: '투자 수익률 계산기 | 툴허브',
    description: '무료 온라인 투자 수익률 계산기. CAGR, 적립식·거치식 비교, 인플레이션 보정.',
    url: 'https://toolhub.ai.kr/investment-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '투자 수익률 계산기 | 툴허브',
    description: 'CAGR, 적립식·거치식 투자 비교 계산기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/investment-calculator',
  },
}

export default function InvestmentCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '투자 수익률 계산기',
    description: 'CAGR, 적립식·거치식 투자 비교, 인플레이션 보정 실질 수익률 계산',
    url: 'https://toolhub.ai.kr/investment-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'CAGR 계산',
      '적립식 투자 시뮬레이션',
      '거치식 투자 시뮬레이션',
      '인플레이션 보정',
      '투자 비교',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CAGR(연평균 복리 수익률)이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CAGR(Compound Annual Growth Rate)은 투자 기간 동안의 연평균 복리 성장률입니다. 투자 시작과 끝의 가치만으로 매년 일정하게 성장했다고 가정한 수익률을 계산합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '거치식 투자와 적립식 투자의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '거치식 투자는 초기에 목돈을 한 번에 투자하는 방식이고, 적립식 투자(DCA)는 매월 일정 금액을 꾸준히 투자하는 방식입니다. 상승장에서는 거치식이, 변동장에서는 적립식이 유리할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '인플레이션 보정 실질 수익률은 왜 중요한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '명목 수익률이 높아도 인플레이션을 고려하면 실질 구매력이 다를 수 있습니다. 예를 들어 연 7% 수익이라도 인플레이션이 3%이면 실질 수익률은 약 3.9%입니다.',
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
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <InvestmentCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
