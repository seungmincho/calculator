import type { Metadata } from 'next'
import TaxCalculator from '@/components/TaxCalculator'

export const metadata: Metadata = {
  title: '세금 계산기 - 소득세, 부가세, 양도소득세',
  description: '한국 기준 소득세, 부가가치세, 양도소득세를 정확하게 계산하세요. 2024년 세법 기준으로 세후 금액을 알 수 있습니다.',
  keywords: '세금계산기, 소득세계산기, 부가세계산기, 양도소득세계산기, 세금계산, 소득세, 부가가치세, 양도소득세, 세법',
  openGraph: {
    title: '세금 계산기 - 소득세, 부가세, 양도소득세 | 툴허브',
    description: '한국 기준 소득세, 부가가치세, 양도소득세를 정확하게 계산하세요',
    url: 'https://toolhub.ai.kr/tax-calculator',
    images: [
      {
        url: '/og-tax.png',
        width: 1200,
        height: 630,
        alt: '세금 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '세금 계산기 - 소득세, 부가세, 양도소득세 | 툴허브',
    description: '한국 기준 소득세, 부가가치세, 양도소득세를 정확하게 계산하세요',
    images: ['/og-tax.png'],
  },
}

export default function TaxCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '세금 계산기',
    description: '소득세, 부가가치세, 양도소득세를 계산하는 한국 기준 세금 계산 도구',
    url: 'https://toolhub.ai.kr/tax-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '소득세 계산',
      '부가가치세 계산',
      '양도소득세 계산',
      '세후 금액 계산',
      '공제항목 반영'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TaxCalculator />
    </>
  )
}