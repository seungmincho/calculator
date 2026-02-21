import { Metadata } from 'next'
import { Suspense } from 'react'
import HourlyWage from '@/components/HourlyWage'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '시급 계산기 - 시급, 일급, 월급, 연봉 변환 | 툴허브',
  description: '시급 계산기 - 시급, 일급, 월급, 연봉을 상호 변환합니다. 2024년 최저시급 기준 비교, 근무시간 설정 가능.',
  keywords: '시급 계산기, 시급 계산, 일급 계산, 월급 시급 변환, hourly wage calculator, 최저시급',
  openGraph: { title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/hourly-wage' },
}

export default function HourlyWagePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '시급 계산기', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['시급 계산', '일급 변환', '월급 변환', '최저시급 비교'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2025년 최저시급은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 최저시급은 시간당 10,030원입니다. 주 40시간 근무 기준 월 환산액은 약 2,096,270원(주휴수당 포함)이며, 연봉으로 환산하면 약 25,155,240원입니다. 최저임금은 정규직, 비정규직, 아르바이트 등 모든 근로자에게 동일하게 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '시급을 월급으로 변환하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '월급 = 시급 × 1일 근로시간 × 월 소정근로일수로 계산합니다. 주 5일, 1일 8시간 근무 기준 월 소정근로시간은 209시간(유급 주휴 포함)입니다. 주 5일 근무 시 월 소정근로일수는 약 21.7일이지만, 주휴시간을 포함하면 209시간을 시급에 곱합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주휴수당은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주휴수당은 1주 15시간 이상 근무하고 소정근로일을 개근한 근로자에게 지급됩니다. 계산법은 (1주 소정근로시간 / 40) × 8 × 시급입니다. 예를 들어 주 40시간 근무 시 8시간분의 시급이 추가되며, 주 20시간 근무 시 4시간분이 추가됩니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><HourlyWage /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
