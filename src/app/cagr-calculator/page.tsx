import { Metadata } from 'next'
import CagrCalculator from '@/components/CagrCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'CAGR 계산기 - 연평균성장률 계산, 미래가치 예측, 투자 비교 | 툴허브',
  description: 'CAGR(연평균성장률)을 쉽게 계산합니다. 시작/종료 금액으로 수익률 계산, 미래가치 예측, 목표 달성 기간 산출. 예시 수익률 빠른 입력, 연도별 성장 차트 제공.',
  keywords: 'CAGR 계산기, 연평균성장률, 복리 계산기, 투자 수익률, 미래가치 계산, 복리 수익률, 투자 비교, 코스피 수익률, S&P500 수익률, 부동산 수익률',
  openGraph: {
    title: 'CAGR 계산기 - 연평균성장률 계산 | 툴허브',
    description: 'CAGR(연평균성장률) 계산, 미래가치 예측, 투자 비교 분석. 예시 수익률 빠른 입력.',
    url: 'https://toolhub.ai.kr/cagr-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/cagr-calculator.png', width: 1200, height: 630, alt: 'CAGR 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CAGR 계산기 | 툴허브',
    description: '연평균성장률(CAGR) 계산, 미래가치 예측, 투자 비교 분석',
    images: ['https://toolhub.ai.kr/og/cagr-calculator.png'],
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
    description: 'CAGR(연평균성장률) 계산, 미래가치 예측, 투자 비교 분석. 예시 수익률 빠른 입력.',
    url: 'https://toolhub.ai.kr/cagr-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'CAGR(연평균성장률) 계산',
      '미래가치 예측',
      '목표 달성 기간 산출',
      '예시 수익률(연 2~10%) 빠른 입력',
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
        name: '예상 수익률은 몇 %로 넣어야 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '과거 수익률은 기간, 배당 포함 여부, 환율에 따라 크게 달라 한 숫자로 말하기 어렵습니다. 예금은 은행 고시 금리, 펀드·ETF는 운용사 공시 수익률처럼 직접 확인한 값을 넣고, 보수적·중립·낙관 세 가지로 바꿔 가며 비교해 보세요. 계산기의 예시 수익률(연 2~10%)은 빠른 입력용이며 특정 자산의 실적이 아닙니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <CagrCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
