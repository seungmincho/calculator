import { Metadata } from 'next'
import { Suspense } from 'react'
import CagrCalculator from '@/components/CagrCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'CAGR 계산기 - 연평균성장률 계산, 미래가치 예측, 투자 비교 | 툴허브',
  description: 'CAGR(연평균성장률)을 쉽게 계산합니다. 시작/종료 금액으로 수익률 계산, 미래가치 예측, 목표 달성 기간 산출. 코스피·S&P500·부동산 프리셋 비교, 연도별 성장 차트 제공.',
  keywords: 'CAGR 계산기, 연평균성장률, 복리 계산기, 투자 수익률, 미래가치 계산, 복리 수익률, 투자 비교, 코스피 수익률, S&P500 수익률, 부동산 수익률',
  openGraph: {
    title: 'CAGR 계산기 - 연평균성장률 계산 | 툴허브',
    description: 'CAGR(연평균성장률) 계산, 미래가치 예측, 투자 비교 분석. 코스피·S&P500·부동산 프리셋 제공.',
    url: 'https://toolhub.ai.kr/cagr-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CAGR 계산기 | 툴허브',
    description: '연평균성장률(CAGR) 계산, 미래가치 예측, 투자 비교 분석',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cagr-calculator/',
  },
}

export default function CagrCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CAGR 계산기',
    description: 'CAGR(연평균성장률) 계산, 미래가치 예측, 투자 비교 분석. 코스피·S&P500·부동산 프리셋 제공.',
    url: 'https://toolhub.ai.kr/cagr-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'CAGR(연평균성장률) 계산',
      '미래가치 예측',
      '목표 달성 기간 산출',
      '한국 자산 프리셋 (코스피, 서울아파트, S&P500)',
      '두 투자 비교 모드',
      '연도별 성장 차트 (Recharts)',
      '복리 주기 선택 (연/월/일)',
      'URL 공유 지원',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CAGR(연평균성장률)이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CAGR(Compound Annual Growth Rate)은 투자의 시작 가치에서 종료 가치까지의 연평균 복리 성장률입니다. 단순 평균과 달리 복리 효과를 반영하여 실제 투자 성과를 정확하게 측정할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'CAGR은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CAGR = (종료금액/시작금액)^(1/투자기간) - 1 로 계산합니다. 예를 들어 1,000만원이 10년 후 2,000만원이 되었다면 CAGR = (2000/1000)^(1/10) - 1 = 약 7.18%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'CAGR과 단순 수익률의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단순 수익률은 총 수익을 기간으로 나눈 것이고, CAGR은 복리 효과를 반영한 연평균 성장률입니다. 예를 들어 10년간 100% 수익이면 단순 수익률은 연 10%이지만, CAGR은 약 7.18%입니다. CAGR이 실제 투자 성과를 더 정확하게 나타냅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '한국 주요 자산의 CAGR은 어느 정도인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '최근 10년 기준 코스피는 약 3.5%, 서울 아파트는 약 5.2%, S&P500은 약 10.5%, 미국 국채는 약 2.8%, 한국 정기예금은 약 2.0% 수준입니다. 다만 이는 과거 실적이며 미래 수익률을 보장하지 않습니다.',
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
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <CagrCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
