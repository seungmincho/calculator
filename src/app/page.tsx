import { Metadata } from 'next'
import SalaryCalculator from '@/components/SalaryCalculator'

export const metadata: Metadata = {
  title: '연봉 실수령액 계산기 | 툴허브 - 2025년 기준 정확한 계산',
  description: '2025년 기준 4대보험, 소득세를 제외한 실제 받을 수 있는 연봉을 계산해보세요. 무료 온라인 연봉 계산기로 월급 실수령액을 확인하세요.',
  keywords: '연봉계산기, 실수령액계산, 월급계산기, 세후연봉, 4대보험계산, 소득세계산, 2025년연봉',
  openGraph: {
    title: '연봉 실수령액 계산기 | 툴허브',
    description: '2025년 기준 정확한 연봉 실수령액을 계산해보세요',
    url: 'https://toolhub.ai.kr',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr',
  },
}

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연봉 실수령액 계산기',
    description: '2025년 기준 4대보험, 소득세를 제외한 실제 받을 수 있는 연봉을 계산해보세요',
    url: 'https://toolhub.ai.kr',
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
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SalaryCalculator />
    </>
  )
}