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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퍼센트(%)는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기본 퍼센트 계산은 "A의 B% = A × B ÷ 100"입니다. 예를 들어 200의 15%는 200 × 15 ÷ 100 = 30입니다. "A는 B의 몇 %?"는 (A ÷ B) × 100으로 계산합니다. 50은 200의 25%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '증감률은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '증감률 = (변화 후 값 - 변화 전 값) ÷ 변화 전 값 × 100(%)입니다. 양수면 증가율, 음수면 감소율입니다. 예를 들어 100에서 130으로 변했다면 증가율은 (130-100)÷100×100 = 30%이고, 100에서 80으로 변했다면 감소율은 -20%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '할인을 중복 적용하면 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '할인을 중복 적용할 때는 단순히 할인율을 더하지 않고 순차적으로 곱합니다. 예를 들어 30% 할인 후 추가 20% 할인이면, 원가 × 0.7 × 0.8 = 원가 × 0.56이므로 실제 할인율은 44%입니다. 30% + 20% = 50%가 아님에 주의하세요.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
