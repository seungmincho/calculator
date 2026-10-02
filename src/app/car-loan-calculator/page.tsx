import type { Metadata } from 'next'
import CarLoanCalculator from '@/components/CarLoanCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '자동차 할부 계산기 - 월 납입금 계산 | 툴허브',
  description: '자동차 할부 월 납입금과 총 이자, 취득세까지 더한 총 지출을 계산하세요. 유예(잔가) 할부, 기간·선수금별 비교표, 상환 스케줄을 제공합니다.',
  keywords: '자동차 할부, 차량 할부, 할부 계산기, 자동차 대출, 차량 대출, 월 납입금, 자동차 금융',
  openGraph: {
    title: '자동차 할부 계산기 - 월 납입금 및 총 이자 계산',
    description: '월 납입금·총 이자·취득세 포함 총 지출, 유예 할부까지',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/car-loan-calculator/',
    images: [{ url: 'https://toolhub.ai.kr/og/car-loan-calculator.png', width: 1200, height: 630, alt: '자동차 할부 계산기' }],
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
    description: '자동차 할부 월 납입금·총 이자·취득세 포함 총 지출, 유예 할부 계산',
    url: 'https://toolhub.ai.kr/car-loan-calculator/',
    featureList: ['유예(잔가) 할부와 만기 일시 상환액', '취득세(경차·전기차 감면) 포함 총 지출과 출고 시 필요 현금', '기간 36/48/60개월 × 선수금 0/20/30% 비교표', '일반 할부 vs 유예 할부 비교', '접이식 상환 스케줄', '월 소득 대비 차량 비용 체크', '할부·리스·장기렌트 개념 비교', '링크·이미지 공유'],
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    permissions: 'browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    }
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '자동차 할부 계산기 사용 방법',
    description: '차량 가격과 할부 조건을 입력해 월 납입금과 총 이자를 계산하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '차량 가격 입력',
        text: '구매할 신차 또는 중고차의 실제 차량 가격(출고가 또는 계약 금액)을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '선수금(다운페이먼트) 설정',
        text: '계약금 또는 선납금 금액을 입력합니다. 선수금이 높을수록 월 납입금과 총 이자가 줄어듭니다.',
      },
      {
        '@type': 'HowToStep',
        name: '할부 기간과 금리 입력',
        text: '할부 기간(12/24/36/48/60개월 등)과 견적서의 연 금리를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '월 상환금과 총 이자 확인',
        text: '계산 결과에서 월 납입금, 총 납입액, 총 이자 부담액을 확인하고 여러 시나리오를 비교합니다.',
      },
    ],
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
          text: '자동차 할부 금리는 신용도·차종·신차/중고차·제조사 프로모션에 따라 차이가 크고, 법정 최고금리는 연 20%입니다. 받은 견적서의 금리를 넣어 기간·선수금별 총 이자를 비교해 보세요. 제조사 금융 프로모션 시 무이자 할부도 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '자동차 할부와 리스의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '할부는 분할 결제 후 차량 소유권이 본인에게 이전되고, 리스는 임대 형태로 사용 후 반납하거나 잔존가치를 지불하고 인수합니다. 할부는 취득세를 본인이 납부하고, 리스는 리스사가 납부합니다. 사업자는 운용리스가 비용 처리에 유리할 수 있으니 세무사와 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '자동차 할부 조기상환 시 수수료가 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중도상환 수수료 요율은 계약서에 정해진 대로 적용되며, 금융소비자보호법에 따라 계약일로부터 3년이 지나면 부과할 수 없습니다. 수수료가 없는 상품도 있으니 계약 전에 확인하세요.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
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
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            자동차 할부 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            자동차 할부 계산기는 <strong>차량 가격, 할부 기간, 금리를 입력하면 월 납입금과 총 이자 부담을 자동으로 계산</strong>하는 도구입니다. 신차·중고차 구매 전 다양한 할부 시나리오를 비교해 가장 합리적인 금융 조건을 선택하는 데 도움을 줍니다. 캐피털사·은행 대출을 앞두고 있거나 무이자 할부와 일반 할부를 비교하려는 분에게 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            자동차 할부 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>선수금 효과:</strong> 차량가의 20~30%를 선수금으로 납부하면 월 납입금과 총 이자를 크게 줄일 수 있습니다.</li>
            <li><strong>할부 기간 비교:</strong> 36개월 vs 60개월 시뮬레이션으로 월 부담과 총 이자 차이를 확인하세요.</li>
            <li><strong>할부 vs 리스:</strong> 사업자라면 운용리스가 비용 처리에 유리할 수 있으니 세무사와 상담하세요.</li>
            <li><strong>금리 협상:</strong> 같은 캐피털사도 영업점별로 금리가 다를 수 있으니 2~3곳 견적을 비교하세요.</li>
            <li><strong>중도상환 계획:</strong> 조기 상환 수수료를 확인하고, 여유 자금 생기면 원금을 빠르게 줄이는 전략이 유리합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}