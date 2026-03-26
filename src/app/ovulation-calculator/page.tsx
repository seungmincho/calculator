import { Metadata } from 'next'
import { Suspense } from 'react'
import OvulationCalculator from '@/components/OvulationCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '배란일 계산기 - 생리주기 가임기 예측 | 툴허브',
  description: '마지막 생리일과 주기를 입력하면 배란일, 가임기, 안전기를 자동 계산합니다. 3개월 달력으로 한눈에 확인하고 출산예정일 계산기와 연계됩니다.',
  keywords: '배란일 계산기, 배란일 계산, 가임기 계산, 생리주기 계산, 배란일 예측, 가임기 예측, 임신 계획',
  openGraph: {
    title: '배란일 계산기 - 가임기 예측 | 툴허브',
    description: '생리주기 기반 배란일·가임기 예측 3개월 달력',
    url: 'https://toolhub.ai.kr/ovulation-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '배란일 계산기 | 툴허브',
    description: '생리주기 기반 배란일·가임기 예측',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ovulation-calculator/',
  },
}

export default function OvulationCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '배란일 계산기',
    description: '생리주기 기반 배란일·가임기 예측 계산기',
    url: 'https://toolhub.ai.kr/ovulation-calculator',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '배란일 자동 계산',
      '가임기·안전기 표시',
      '3개월 달력 시각화',
      '출산예정일 계산기 연계',
      'URL 공유 기능',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '배란일은 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '배란일은 일반적으로 다음 생리 시작일로부터 14일 전입니다. 생리주기가 28일인 경우 생리 시작일로부터 약 14일 후에 배란이 일어납니다.',
        },
      },
      {
        '@type': 'Question',
        name: '가임기는 얼마나 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '가임기는 배란일 전 5일부터 배란일 후 1일까지 약 6일간입니다. 정자는 체내에서 최대 5일, 난자는 배란 후 12~24시간 생존합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <OvulationCalculator />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
