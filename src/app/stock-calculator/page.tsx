import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import StockCalculator from '@/components/StockCalculator'

export const metadata: Metadata = {
  title: '주식 수익률 계산기 | 툴허브 - 매수가 대비 수익률 및 손익 계산',
  description: '주식 매수가격과 현재가격을 입력하여 수익률, 총 수익금, 손익률을 정확히 계산해보세요.',
  keywords: '주식수익률계산기, 주식손익계산, 매수가계산, 주식투자수익률, 주가수익률, 투자손익계산기',
  openGraph: {
    title: '주식 수익률 계산기 | 툴허브',
    description: '주식 투자 수익률과 손익을 정확히 계산하여 투자 성과를 분석해보세요',
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
    canonical: 'https://toolhub.ai.kr/stock-calculator',
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <StockCalculator />
      </I18nWrapper>
    </>
  )
}