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
    canonical: 'https://toolhub.ai.kr/investment-calculator/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            투자 수익률 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            투자 수익률 계산기는 주식, 펀드, 부동산, 예금 등 다양한 투자의 CAGR(연평균 복리 수익률), 적립식·거치식 투자 결과, 인플레이션 보정 실질 수익률을 계산해주는 도구입니다. 복리의 마법을 시각적으로 확인하고, 투자 전략별 결과를 비교하여 재무 목표에 맞는 투자 계획을 수립하는 데 도움이 됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            투자 수익률 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>복리의 힘:</strong> 연 7% 수익률로 10년 투자 시 원금이 약 2배 되는 복리 효과를 계산기로 직접 확인해보세요.</li>
            <li><strong>적립식 vs 거치식 비교:</strong> 목돈이 있다면 거치식이, 매달 여유 자금이 생긴다면 적립식이 현실적입니다. 두 방식의 결과를 비교해보세요.</li>
            <li><strong>인플레이션 보정 필수:</strong> 명목 수익률만 보지 말고 인플레이션(보통 2~3%)을 차감한 실질 수익률로 자산 증가를 평가하세요.</li>
            <li><strong>72의 법칙:</strong> 원금이 2배 되는 기간 = 72 ÷ 수익률(%). 예: 연 6% 투자 시 약 12년 후 2배.</li>
            <li><strong>현실적 수익률 설정:</strong> 국내 주식 장기 평균 8~10%, 글로벌 인덱스 펀드 7~8%, 예금 3~4%를 참고하여 시뮬레이션하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
