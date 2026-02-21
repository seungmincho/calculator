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
  alternates: {
    canonical: 'https://toolhub.ai.kr/car-loan-calculator',
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '자동차 할부 이자율은 보통 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 기준 자동차 할부 금리는 캐피털사 기준 연 5~9%, 은행 자동차 대출은 연 4~7% 수준입니다. 신차가 중고차보다 금리가 낮고, 신용등급이 높을수록 유리한 금리를 받을 수 있습니다. 제조사 금융 프로모션 시 무이자 할부도 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '자동차 할부와 리스의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '할부는 분할 결제 후 차량 소유권이 본인에게 이전되고, 리스는 임대 형태로 사용 후 반납하거나 잔존가치를 지불하고 인수합니다. 할부는 취득세를 본인이 납부하고, 리스는 리스사가 납부합니다. 사업자는 리스가 세금 처리에 유리할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '자동차 할부 조기상환 시 수수료가 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '대부분의 자동차 할부에는 중도상환 수수료가 있으며, 잔여 원금의 1~2% 수준입니다. 다만 대출 후 3년 이상 경과하면 면제되는 경우가 많고, 일부 캐피탈사는 중도상환 수수료가 없는 상품도 있으니 계약 시 확인이 필요합니다.',
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
          <CarLoanCalculator />
        </div>
      </I18nWrapper>
    </>
  )
}