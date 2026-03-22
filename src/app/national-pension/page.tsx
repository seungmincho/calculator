import { Metadata } from 'next'
import { Suspense } from 'react'
import NationalPensionCalculator from '@/components/NationalPensionCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '국민연금 수령액 계산기 - 예상 연금 확인 | 툴허브',
  description: '국민연금 예상 수령액을 계산하세요. 가입 기간과 평균 소득을 입력하면 노령연금, 조기수령, 연기수령 금액을 비교할 수 있습니다. 2025년 기준.',
  keywords: '국민연금 계산, 국민연금 수령액, 노령연금, 조기수령, 연기수령, 국민연금 예상액, 연금 계산기',
  openGraph: {
    title: '국민연금 수령액 계산기 | 툴허브',
    description: '국민연금 예상 수령액 계산, 조기/정상/연기 수령 비교',
    url: 'https://toolhub.ai.kr/national-pension',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '국민연금 수령액 계산기',
    description: '국민연금 예상 수령액 계산, 조기/정상/연기 수령 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/national-pension',
  },
}

export default function NationalPensionPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '국민연금 수령액 계산기',
    description: '가입 기간과 소득을 기반으로 국민연금 예상 수령액을 계산합니다',
    url: 'https://toolhub.ai.kr/national-pension',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국민연금 예상 수령액 계산',
      '조기수령/정상수령/연기수령 3가지 비교',
      '출생연도별 수급개시연령 자동 적용',
      '총 수령액 비교 시뮬레이션',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <NationalPensionCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
