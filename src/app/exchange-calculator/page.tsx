import type { Metadata } from 'next'
import ExchangeRateCalculator from '@/components/ExchangeRateCalculator'

export const metadata: Metadata = {
  title: '환율 계산기 - 실시간 환전 계산',
  description: '실시간 환율을 기반으로 정확한 환전 금액을 계산하세요. 원화, 달러, 유로, 엔화 등 주요 통화의 환율 계산기입니다.',
  keywords: '환율계산기, 환전계산기, 실시간환율, 달러환율, 엔화환율, 유로환율, 원화환전, 환율변환, 통화계산기',
  openGraph: {
    title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
    description: '실시간 환율을 기반으로 정확한 환전 금액을 계산하세요',
    url: 'https://toolhub.ai.kr/exchange-calculator',
    images: [
      {
        url: '/og-exchange.png',
        width: 1200,
        height: 630,
        alt: '환율 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
    description: '실시간 환율을 기반으로 정확한 환전 금액을 계산하세요',
    images: ['/og-exchange.png'],
  },
}

export default function ExchangeCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '환율 계산기',
    description: '실시간 환율 데이터를 사용하여 정확한 환전 금액을 계산하는 도구',
    url: 'https://toolhub.ai.kr/exchange-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '실시간 환율 계산',
      '12개 주요 통화 지원',
      '환율 히스토리',
      '통화 변환',
      '환전 수수료 안내'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ExchangeRateCalculator />
    </>
  )
}