import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import SavingsCalculator from '@/components/SavingsCalculator'

export const metadata: Metadata = {
  title: '적금 계산기 | 툴허브 - 정기적금, 자유적금, 복리적금 비교',
  description: '정기적금, 자유적금, 목표적금, 복리적금 등 다양한 적금 상품을 비교하고 목표 금액 달성을 위한 최적의 저축 계획을 세워보세요.',
  keywords: '적금계산기, 정기적금, 자유적금, 복리적금, 목표적금, 저축계획, 적금이자계산, 만기수령액계산',
  openGraph: {
    title: '적금 계산기 | 툴허브',
    description: '다양한 적금 상품을 비교하고 목표 금액 달성 계획을 세워보세요',
    url: 'https://toolhub.ai.kr/savings-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/savings-calculator',
  },
}

export default function SavingsCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '적금 계산기',
    description: '정기적금, 자유적금, 목표적금, 복리적금 등 다양한 적금 상품 비교 계산기',
    url: 'https://toolhub.ai.kr/savings-calculator',
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
      '정기적금 계산',
      '자유적금 계산',
      '목표적금 계산',
      '복리적금 계산',
      '적금상품 비교분석'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '단리와 복리의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단리는 원금에만 이자가 붙는 방식이고, 복리는 원금+이자에 다시 이자가 붙는 방식입니다. 같은 금리라면 복리가 더 많은 이자를 받을 수 있으며, 기간이 길수록 차이가 커집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 이자에 세금이 얼마나 붙나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '적금 이자소득에는 15.4%의 이자소득세(소득세 14% + 지방소득세 1.4%)가 원천징수됩니다. 비과세 적금이나 세금우대 적금(9.5%)을 활용하면 세금을 줄일 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 중도해지 시 이자는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중도해지 시 약정금리가 아닌 중도해지 금리(보통 약정금리의 50~70%)가 적용됩니다. 가입기간이 짧을수록 해지 금리가 낮아지므로 만기까지 유지하는 것이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '월 50만원 적금 1년이면 얼마를 받나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연 3.5% 금리 기준, 월 50만원 1년 정기적금 만기 시 약 611만원의 세전 이자가 발생하여 총 약 610만 5천원(세후)을 수령합니다. 실제 금액은 금리와 세금우대 여부에 따라 달라집니다.',
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
        <SavingsCalculator />
      </I18nWrapper>
    </>
  )
}