import { Metadata } from 'next'
import LoanCalculator from '@/components/LoanCalculator'

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
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/loan-calculator',
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
      '거치식대출 계산',
      '대출방식 비교분석'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LoanCalculator />
    </>
  )
}