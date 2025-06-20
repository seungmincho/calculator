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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <div className="container mx-auto px-4 py-8">
          <CarTaxCalculator />
        </div>
      </I18nWrapper>
    </>
  )
}