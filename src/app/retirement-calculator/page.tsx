import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import RetirementCalculator from '@/components/RetirementCalculator'

export const metadata: Metadata = {
  title: '퇴직금 계산기',
  description: '퇴직금과 퇴직소득세를 정확하게 계산하세요. 평균임금과 근무기간을 입력하면 실수령 퇴직금을 알 수 있습니다.',
  keywords: '퇴직금계산기, 퇴직금, 퇴직소득세, 근로기준법, 평균임금, 근무기간, 퇴직금계산, 세후퇴직금',
  openGraph: {
    title: '퇴직금 계산기 | 툴허브',
    description: '퇴직금과 퇴직소득세를 정확하게 계산하세요',
    url: 'https://toolhub.ai.kr/retirement-calculator',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '퇴직금 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '퇴직금 계산기 | 툴허브',
    description: '퇴직금과 퇴직소득세를 정확하게 계산하세요',
    images: ['/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/retirement-calculator',
  },
}

export default function RetirementCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퇴직금 계산기',
    description: '평균임금과 근무기간을 기반으로 퇴직금과 퇴직소득세를 계산하는 도구',
    url: 'https://toolhub.ai.kr/retirement-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '퇴직금 계산',
      '퇴직소득세 계산',
      '실수령 퇴직금 계산',
      '근무기간별 계산'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퇴직금은 언제부터 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '근로기준법에 따라 1년 이상 계속 근무하고 주 15시간 이상 일한 근로자는 퇴직금을 받을 수 있습니다. 퇴직 후 14일 이내에 지급받아야 하며, 근속 1년에 30일분의 평균임금을 받습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직소득세는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '퇴직소득세는 퇴직금에서 근속연수공제를 뺀 후 환산급여를 구하고, 환산급여에 세율을 적용하여 계산합니다. 근속연수가 길수록 공제가 커져 세금이 줄어듭니다. 2026년 기준 5년 이하 30만원×근속연수, 10년 이하 150만원+50만원×(근속연수-5년) 등으로 공제합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'DC형과 DB형 퇴직연금의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DB형(확정급여형)은 퇴직 시 평균임금×근속연수로 퇴직금이 확정됩니다. DC형(확정기여형)은 매년 임금의 1/12 이상을 적립하고, 운용 수익에 따라 수령액이 달라집니다. 임금 인상이 큰 경우 DB형이, 투자 수익이 높으면 DC형이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직금 중간정산은 가능한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2012년 이후 퇴직금 중간정산은 원칙적으로 금지되었지만, 무주택자 주택 구입, 6개월 이상 요양, 천재지변, 임금피크제 등 법정 사유에 해당하면 중간정산이 가능합니다.',
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
        <RetirementCalculator />
      </I18nWrapper>
    </>
  )
}