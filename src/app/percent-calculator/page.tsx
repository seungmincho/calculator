import { Metadata } from 'next'
import { Suspense } from 'react'
import PercentCalculator from '@/components/PercentCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '퍼센트 계산기 - 비율, 증감률, 할인율 계산 | 툴허브',
  description: '퍼센트 계산기 - X의 Y%는? 비율 계산, 증감률 계산, 퍼센트 추가/차감 (세금, 할인) 등 다양한 퍼센트 계산을 한 곳에서 간편하게 해보세요.',
  keywords: '퍼센트 계산기, 퍼센트 계산, 비율 계산, 증감률 계산, 할인율 계산, 세금 계산, 백분율 계산기, percent calculator',
  openGraph: {
    title: '퍼센트 계산기 | 툴허브',
    description: '퍼센트 계산, 비율 계산, 증감률, 할인율 등 다양한 퍼센트 계산을 한 곳에서 간편하게',
    url: 'https://toolhub.ai.kr/percent-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '퍼센트 계산기 | 툴허브',
    description: '퍼센트 계산, 비율 계산, 증감률, 할인율 등 다양한 퍼센트 계산을 한 곳에서 간편하게',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/percent-calculator',
  },
}

export default function PercentCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퍼센트 계산기',
    description: '퍼센트 계산, 비율 계산, 증감률 계산, 퍼센트 추가/차감 등 다양한 퍼센트 계산을 한 곳에서 간편하게 해보세요.',
    url: 'https://toolhub.ai.kr/percent-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '기본 퍼센트 계산 (X의 Y%)',
      '비율 계산 (X는 Y의 몇%)',
      '증감률 계산',
      '퍼센트 추가/차감 (세금, 할인)',
      '계산 기록',
      '빠른 퍼센트 버튼',
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
              <PercentCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
