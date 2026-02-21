import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
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
        url: '/og-image-1200x630.png',
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
    images: ['/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/exchange-calculator',
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '환전할 때 매매기준율과 현찰매도율의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '매매기준율은 은행 간 거래 기준 환율이고, 현찰매도율은 고객에게 외화를 팔 때 적용하는 환율입니다. 현찰매도율에는 1.5~2% 수준의 환전 수수료(스프레드)가 포함되어 있어 매매기준율보다 높습니다. 송금 시에는 전신환매도율이 적용되어 수수료가 더 낮습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '환전 수수료를 줄이는 방법이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '인터넷뱅킹/모바일뱅킹으로 환전하면 50~90% 환율 우대를 받을 수 있습니다. 또한 환율 우대쿠폰 사용, 거래실적에 따른 우대, 대량 환전 시 협상 등의 방법이 있습니다. 시중은행보다 공항 환전소가 수수료가 높으므로 미리 환전하는 것이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '환율이 높으면 해외여행이 불리한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 원화 약세(환율 상승)일 때는 같은 달러를 사려면 더 많은 원화가 필요하므로 해외여행 비용이 증가합니다. 반대로 수출 기업이나 해외에서 돈을 버는 경우에는 유리합니다. 환율 변동이 크면 분할 환전으로 위험을 줄일 수 있습니다.',
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
      <I18nWrapper>
        <ExchangeRateCalculator />
      </I18nWrapper>
    </>
  )
}