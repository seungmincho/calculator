import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import LoanCalculator from '@/components/LoanCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '대출 계산기 | 툴허브 - 원리금균등상환, 원금균등상환 비교',
  description: '원리금균등상환, 원금균등상환, 만기일시상환, 거치식대출 등 다양한 대출 방식을 비교하고 월 상환금액을 계산해보세요.',
  keywords: '대출계산기, 월상환금계산, 원리금균등상환, 원금균등상환, 만기일시상환, 거치식대출, 주택대출계산기, 대출이자계산',
  openGraph: {
    title: '대출 계산기 | 툴허브',
    description: '다양한 대출 방식을 비교하고 최적의 상환 방법을 찾아보세요',
    url: 'https://toolhub.ai.kr/loan-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/loan-calculator.png', width: 1200, height: 630, alt: '대출 계산기' }],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/loan-calculator/',
  },
}

export default function LoanCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '대출 계산기',
    description: '원리금균등상환, 원금균등상환, 만기일시상환, 거치식대출 등 다양한 대출 방식 비교 계산기',
    url: 'https://toolhub.ai.kr/loan-calculator',
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
      '원리금균등상환 계산',
      '원금균등상환 계산', 
      '만기일시상환 계산',
      '거치기간 반영 계산',
      '월 상환 가능액으로 대출 한도 역산',
      'DSR 간편 확인',
      '금리 변화 시뮬레이션',
      '대출방식 비교분석'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '원리금균등상환과 원금균등상환의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '원리금균등상환은 매달 같은 금액(원금+이자)을 갚는 방식이고, 원금균등상환은 매달 같은 원금에 남은 잔액 이자를 더해 갚는 방식입니다. 원금균등상환이 총 이자가 적지만 초기 상환 부담이 큽니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주택담보대출 이자율은 보통 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 기준 주택담보대출 금리는 은행별로 다르지만, 일반적으로 연 3.5%~5.5% 수준입니다. 고정금리와 변동금리, 대출 기간, LTV 비율에 따라 달라집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '대출 중도상환 수수료는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중도상환 수수료는 보통 대출 후 3년 이내에 갚을 때 부과되며, 일반적으로 상환금액 × 수수료율 × (남은 기간 ÷ 3년)으로 계산합니다. 2025년 1월부터 금융사가 실제 드는 비용만 반영하도록 개편돼 요율이 대체로 낮아졌고, 상품·금융사마다 다르므로 대출 약정서에서 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '거치기간이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '거치기간은 원금 상환 없이 이자만 납부하는 기간입니다. 거치기간이 끝나면 원금과 이자를 함께 상환합니다. 초기 부담은 줄지만 총 이자 부담은 늘어납니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '대출 이자 계산하는 방법',
    description: '대출 금액, 이자율, 상환 방식을 입력하면 월 상환금과 총 이자를 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '대출 조건 입력', text: '대출 금액, 연 이자율, 대출 기간을 입력합니다.' },
      { '@type': 'HowToStep', name: '상환 방식 선택', text: '원리금균등·원금균등·만기일시 중 상환 방식을 고르고, 필요하면 거치 기간을 입력합니다. 세 방식 비교표에서 이자가 가장 적은 방식을 바로 확인할 수 있습니다.' },
      { '@type': 'HowToStep', name: '결과 확인', text: '월 상환액과 총 이자, 금리 변화에 따른 상환액 변화, DSR을 확인합니다. 월별 상세 스케줄은 대출 상환 스케줄 계산기로 이어서 볼 수 있습니다.' },
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
        <LoanCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-line pt-8">
            <h2 className="text-xl font-bold text-fg mb-4">
              대출 계산기란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              대출 계산기는 원리금균등상환, 원금균등상환, 만기일시상환, 거치식대출 등 다양한 상환 방식에 따른 월 상환금액과 총 이자 부담을 미리 계산해주는 도구입니다. 주택담보대출, 신용대출, 전세대출, 자동차 할부금융 등 모든 대출에 활용할 수 있으며, 대출 조건을 비교해 가장 유리한 방식을 선택하는 데 도움을 드립니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              대출 계산기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>상환 방식 비교:</strong> 원리금균등은 매달 동일 금액, 원금균등은 총 이자가 적어 장기 대출에서 수백만 원 차이가 납니다.</li>
              <li><strong>금리 시뮬레이션:</strong> 금리가 0.5%만 달라져도 30년 장기 대출에서는 총 이자 차이가 수천만 원에 달할 수 있습니다.</li>
              <li><strong>거치기간 주의:</strong> 거치기간 중 이자만 내면 초기 부담은 줄지만 총 이자가 증가하므로 신중하게 선택하세요.</li>
              <li><strong>중도상환 계획:</strong> 여윳돈이 생기면 중도상환으로 이자 절감 효과를 미리 계산해보세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}