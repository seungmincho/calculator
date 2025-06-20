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
        url: '/og-retirement.png',
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
    images: ['/og-retirement.png'],
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <RetirementCalculator />
      </I18nWrapper>
    </>
  )
}