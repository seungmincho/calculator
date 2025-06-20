import type { Metadata } from 'next'
import CarLoanCalculator from '@/components/CarLoanCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '자동차 할부 계산기 - 월 납입금 및 총 이자 계산',
  description: '자동차 할부금, 월 납입금, 총 이자를 쉽게 계산하세요. 차량 가격, 할부 기간, 금리를 입력하면 자동으로 계산됩니다.',
  keywords: '자동차 할부, 차량 할부, 할부 계산기, 자동차 대출, 차량 대출, 월 납입금, 자동차 금융',
  openGraph: {
    title: '자동차 할부 계산기 - 월 납입금 및 총 이자 계산',
    description: '자동차 할부금, 월 납입금, 총 이자를 쉽게 계산하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/car-loan-calculator/',
  },
}

export default function CarLoanCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '자동차 할부 계산기',
    description: '자동차 할부금, 월 납입금, 총 이자를 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/car-loan-calculator/',
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
          <CarLoanCalculator />
        </div>
      </I18nWrapper>
    </>
  )
}