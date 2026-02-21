import type { Metadata } from 'next'
import CarTaxCalculator from '@/components/CarTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '자동차 취등록세 계산기 - 취득세, 등록세, 공채매수 계산',
  description: '자동차 구매 시 필요한 취등록세를 정확하게 계산하세요. 차량가격, 배기량, 차종에 따른 취득세, 등록세, 공채매수비를 자동 계산합니다.',
  keywords: '자동차 취등록세, 취득세, 등록세, 공채매수, 자동차세, 차량 취득세, 신차 등록비용',
  openGraph: {
    title: '자동차 취등록세 계산기 - 취득세, 등록세, 공채매수 계산',
    description: '자동차 구매 시 필요한 취등록세를 정확하게 계산하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/car-tax-calculator/',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/car-tax-calculator',
  },
}

export default function CarTaxCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '자동차 취등록세 계산기',
    description: '자동차 취득세, 등록세, 공채매수비를 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/car-tax-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    permissions: 'browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    }
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '자동차 취득세율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '승용차 취득세율은 차량 가격의 7%입니다. 경차(1000cc 이하)는 4%, 화물차·승합차는 5%가 적용됩니다. 영업용 차량은 4%이며, 전기차·하이브리드차는 취득세 감면 혜택(최대 140만원)이 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '공채매입 비용이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '자동차 등록 시 지역개발공채 또는 도시철도채권을 의무 매입해야 합니다. 공채 매입률은 지역과 차량 종류에 따라 차량가의 4~12%이며, 즉시 할인 매도하면 공채 금액의 3~5%를 부담하게 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '중고차 취득세는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중고차 취득세는 실거래가가 아닌 국세청 과세표준액(시가표준액)을 기준으로 계산합니다. 시가표준액은 차량 연식에 따라 감가되며, 신차가의 약 10~70% 수준입니다. 실거래가가 시가표준액보다 높으면 실거래가 기준으로 부과됩니다.',
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
        <div className="container mx-auto px-4 py-8">
          <CarTaxCalculator />
        </div>
      </I18nWrapper>
    </>
  )
}