import { Metadata } from 'next'
import StockCalculator from '@/components/StockCalculator'

export const metadata: Metadata = {
  title: '주식 수익률 계산기 | 툴허브 - 매수가 대비 수익률 및 손익 계산',
  description: '주식 매수가격과 현재가격을 입력하여 수익률, 총 수익금, 세금·수수료 포함 실수익을 계산하세요. 목표가 역산도 지원합니다.',
  keywords: '주식수익률계산기, 주식손익계산, 매수가계산, 주식투자수익률, 주가수익률, 투자손익계산기',
  openGraph: {
    title: '주식 수익률 계산기 | 툴허브',
    description: '주식 매수가·현재가 입력으로 수익률, 실수익, 목표가 역산까지 계산하세요',
    url: 'https://toolhub.ai.kr/stock-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/stock-calculator/',
  },
}

export default function StockCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '주식 수익률 계산기',
    description: '주식 매수가격과 현재가격을 입력하여 수익률, 총 수익금, 손익률을 정확히 계산',
    url: 'https://toolhub.ai.kr/stock-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    author: {
      '@type': 'Organization',
      name: '툴허브'
    },
    featureList: [
      '주식 수익률 계산',
      '손익금액 계산', 
      '투자 성과 분석',
      '실시간 계산',
      '계산 이력 저장'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '주식 수익률은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주식 수익률은 (현재가 - 매수가) ÷ 매수가 × 100으로 계산합니다. 예를 들어 50,000원에 매수한 주식이 65,000원이 되면 수익률은 30%입니다. 수수료와 세금을 포함하면 실수익률은 이보다 낮아집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주식 거래 수수료는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '온라인 주식 거래 수수료는 증권사별로 다르지만, 일반적으로 매매 금액의 0.01~0.15% 수준입니다. 이 외에 매도 시 증권거래세 0.18%(코스피), 0.18%(코스닥)가 부과됩니다. 비대면 계좌 개설 시 수수료 우대 혜택이 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주식 양도소득세는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '국내 주식은 대주주(종목당 10억원 이상)에게만 양도소득세가 부과됩니다. 세율은 3억원 이하 20%, 3억원 초과 25%입니다. 해외 주식은 연간 250만원 초과 수익에 대해 22%(지방세 포함)가 부과됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '배당수익률이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '배당수익률은 주가 대비 연간 배당금의 비율입니다. 예를 들어 주가 50,000원인 주식이 연 2,000원 배당하면 배당수익률은 4%입니다. 배당소득에는 15.4%의 세금이 원천징수됩니다.',
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
      <StockCalculator />
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            주식 수익률 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            주식 수익률 계산기는 매수 가격과 현재 가격, 수량을 입력하면 수익률(%), 총 손익 금액, 세금 및 수수료 차감 후 실수익을 즉시 계산해 주는 주식 투자 도구입니다. 국내 주식의 증권거래세와 증권사 수수료까지 반영하여 실제 투자 성과를 정확히 분석하고 수익 실현 시점을 판단하는 데 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            주식 수익률 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>수수료·세금 포함 계산:</strong> 매도 시 코스피·코스닥 증권거래세 0.18%와 증권사 수수료(0.01~0.15%)를 반드시 포함해야 정확한 실수익을 파악할 수 있습니다.</li>
            <li><strong>손익분기점 계산:</strong> 매수 금액에 수수료를 더한 금액이 손익분기점(BEP)입니다. 이 가격 이상에서 매도해야 수익이 발생합니다.</li>
            <li><strong>분할 매수 평균 단가:</strong> 여러 번에 나눠 매수했다면 총 투자 금액을 총 수량으로 나눠 평균 매수 단가를 계산한 뒤 수익률을 산출하세요.</li>
            <li><strong>해외 주식 세금:</strong> 해외 주식은 연간 250만원 초과 수익에 대해 양도소득세 22%(지방세 포함)가 부과되므로 세후 수익률도 함께 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}