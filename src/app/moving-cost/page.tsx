import { Metadata } from 'next'
import { Suspense } from 'react'
import MovingCost from '@/components/MovingCost'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이사 비용 계산기 - 포장이사/일반이사 견적 | 툴허브',
  description: '이사 비용 계산기 - 평수, 이사 유형, 거리, 층수별 이사 비용을 계산하세요. 포장이사, 일반이사, 반포장이사 견적 비교.',
  keywords: '이사 비용 계산기, 포장이사 비용, 일반이사 비용, 반포장이사, 이사 견적, 사다리차 비용, 이사비 계산',
  openGraph: {
    title: '이사 비용 계산기 | 툴허브',
    description: '평수, 이사 유형, 거리, 층수별 이사 비용을 계산하세요. 포장이사, 일반이사, 반포장이사 견적 비교.',
    url: 'https://toolhub.ai.kr/moving-cost',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이사 비용 계산기 | 툴허브',
    description: '포장이사, 일반이사, 반포장이사 견적 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/moving-cost',
  },
}

export default function MovingCostPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이사 비용 계산기',
    description: '평수, 이사 유형, 거리, 층수별 이사 비용 견적 계산',
    url: 'https://toolhub.ai.kr/moving-cost',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '포장이사/일반이사/반포장이사 비용 비교',
      '평수별 기본 이사비 계산',
      '거리별 추가비용',
      '층수/엘리베이터 추가비용',
      '에어컨, 피아노 등 추가 서비스',
      '성수기/주말 할증 계산',
      '이사 준비 체크리스트',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <MovingCost />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
