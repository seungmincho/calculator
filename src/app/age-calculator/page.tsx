import { Metadata } from 'next'
import { Suspense } from 'react'
import AgeCalculator from '@/components/AgeCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '나이 계산기 - 만 나이, 한국 나이, 띠, 별자리 계산 | 툴허브',
  description: '나이 계산기 - 생년월일을 입력하면 만 나이, 한국 나이(세는 나이), 연 나이, 띠, 별자리, 살아온 날 수, 다음 생일까지 남은 일수를 한눈에 확인하세요.',
  keywords: '나이 계산기, 만 나이 계산, 한국 나이, 세는 나이, 띠 계산, 별자리 계산, 연 나이, age calculator',
  openGraph: {
    title: '나이 계산기 | 툴허브',
    description: '만 나이, 한국 나이, 띠, 별자리 등 다양한 나이 정보를 한눈에 확인하세요',
    url: 'https://toolhub.ai.kr/age-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '나이 계산기 | 툴허브',
    description: '만 나이, 한국 나이, 띠, 별자리 등 다양한 나이 정보를 한눈에 확인하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/age-calculator',
  },
}

export default function AgeCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '나이 계산기',
    description: '생년월일을 입력하면 만 나이, 한국 나이, 연 나이, 띠, 별자리, 살아온 날 수 등을 한눈에 확인할 수 있는 나이 계산기입니다.',
    url: 'https://toolhub.ai.kr/age-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '만 나이 계산 (국제 표준)',
      '한국 나이 (세는 나이) 계산',
      '연 나이 계산',
      '띠 (12간지) 계산',
      '별자리 계산',
      '살아온 일수/주수/개월수',
      '다음 생일까지 남은 일수',
      '세대 구분',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <AgeCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
