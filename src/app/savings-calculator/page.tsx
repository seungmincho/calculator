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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <SavingsCalculator />
      </I18nWrapper>
    </>
  )
}