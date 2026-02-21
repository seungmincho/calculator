import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import RealEstateCalculator from '@/components/RealEstateCalculator'

export const metadata: Metadata = {
  title: '부동산 계산기 - 전세자금대출, 주택담보대출, 취득세',
  description: '전세자금대출, 주택담보대출 월 상환금액과 취득세를 정확하게 계산해보세요. LTV 계산 및 한국 부동산 세법 기준 적용.',
  keywords: '부동산계산기, 전세자금대출, 주택담보대출, 취득세계산, LTV계산, 부동산세금, 대출계산기',
  openGraph: {
    title: '부동산 계산기 - 전세자금대출, 주택담보대출, 취득세',
    description: '부동산 관련 모든 계산을 한 곳에서 쉽게 해결하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/real-estate-calculator',
  },
}

export default function RealEstateCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '부동산 계산기',
    description: '전세자금대출, 주택담보대출 월 상환금액과 취득세를 정확하게 계산해보세요',
    url: 'https://toolhub.ai.kr/real-estate-calculator',
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
      '전세자금대출 계산',
      '주택담보대출 계산',
      '취득세 계산',
      'LTV 계산'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '취득세율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주택 취득세율은 주택 가격과 보유 주택 수에 따라 다릅니다. 1주택자 기준 6억원 이하 1%, 6~9억원 1~3%, 9억원 초과 3%입니다. 다주택자는 8~12%의 중과세율이 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'LTV(담보인정비율)란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LTV는 주택 가격 대비 대출 가능한 비율입니다. 규제지역 여부와 주택 가격에 따라 40~70%까지 적용됩니다. 예를 들어 LTV 50%이면 5억 주택에 최대 2.5억 대출이 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전세자금대출 한도는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전세자금대출 한도는 전세보증금의 80% 이내이며, 최대 3억원(수도권)~2억원(비수도권)까지 가능합니다. 소득과 신용도에 따라 실제 한도는 달라질 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '부동산 중개수수료는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '부동산 중개수수료는 거래 금액에 따라 요율이 달라집니다. 매매 기준 5천만원 미만 0.6%, 5천만~2억 0.5%, 2~9억 0.4%, 9~12억 0.5%, 12억 초과 0.9% 이하 협의입니다.',
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
        <RealEstateCalculator />
      </I18nWrapper>
    </>
  )
}