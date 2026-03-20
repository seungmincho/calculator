import type { Metadata } from 'next'
import CarLoanCalculator from '@/components/CarLoanCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '자동차 할부 계산기 - 월 납입금 계산 | 툴허브',
  description: '자동차 할부금, 월 납입금, 총 이자를 쉽게 계산하세요. 차량 가격, 할부 기간, 금리를 입력하면 자동으로 계산됩니다.',
  keywords: '자동차 할부, 차량 할부, 할부 계산기, 자동차 대출, 차량 대출, 월 납입금, 자동차 금융',
  openGraph: {
    title: '자동차 할부 계산기 - 월 납입금 및 총 이자 계산',
    description: '자동차 할부금, 월 납입금, 총 이자를 쉽게 계산하세요.',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/car-loan-calculator/',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/car-loan-calculator/',
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
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            자동차 할부 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            자동차 할부 계산기는 <strong>차량 가격, 할부 기간, 금리를 입력하면 월 납입금과 총 이자 부담을 자동으로 계산</strong>하는 도구입니다. 신차·중고차 구매 전 다양한 할부 시나리오를 비교해 가장 합리적인 금융 조건을 선택하는 데 도움을 줍니다. 캐피털사·은행 대출을 앞두고 있거나 무이자 할부와 일반 할부를 비교하려는 분에게 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            자동차 할부 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>선수금 효과:</strong> 차량가의 20~30%를 선수금으로 납부하면 월 납입금과 총 이자를 크게 줄일 수 있습니다.</li>
            <li><strong>할부 기간 비교:</strong> 36개월 vs 60개월 시뮬레이션으로 월 부담과 총 이자 차이를 확인하세요.</li>
            <li><strong>할부 vs 리스:</strong> 사업자라면 리스가 세금 처리에 유리할 수 있으니 세무사와 상담하세요.</li>
            <li><strong>금리 협상:</strong> 같은 캐피털사도 영업점별로 금리가 다를 수 있으니 2~3곳 견적을 비교하세요.</li>
            <li><strong>중도상환 계획:</strong> 조기 상환 수수료를 확인하고, 여유 자금 생기면 원금을 빠르게 줄이는 전략이 유리합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}