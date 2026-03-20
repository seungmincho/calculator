import { Metadata } from 'next'
import { Suspense } from 'react'
import MilitaryDischarge from '@/components/MilitaryDischarge'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '전역일 계산기 - 군 복무 전역일·D-Day 계산 | 툴허브',
  description: '입대일과 군별(육군·해군·공군·해병대·사회복무요원 등)을 선택하면 전역일, D-Day, 복무 진행률, 진급 일정을 자동으로 계산합니다.',
  keywords: '전역일 계산기, 군 복무 기간, D-Day, 입대일, 전역 날짜, 육군 해군 공군 해병대, 사회복무요원, 복무 진행률',
  openGraph: {
    title: '전역일 계산기 - 군 복무 전역일·D-Day 계산 | 툴허브',
    description: '입대일과 군별을 선택하면 전역일, D-Day, 복무 진행률, 진급 일정을 계산합니다.',
    url: 'https://toolhub.ai.kr/military-discharge/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '전역일 계산기 | 툴허브',
    description: '군 복무 전역일, D-Day, 진급 일정을 한 번에 계산하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/military-discharge/',
  },
}

export default function MilitaryDischargePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '전역일 계산기',
    description: '입대일과 군별을 선택하면 전역일, D-Day, 복무 진행률, 진급 일정을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/military-discharge',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '전역일 자동 계산',
      'D-Day 카운터',
      '복무 진행률 표시',
      '진급 일정 (이등병→일병→상병→병장)',
      '군별 복무기간 지원 (육군·해군·공군·해병대·사회복무요원 등)',
      '단축일수 반영',
      '복무 통계 (식사, PX 방문 횟수)',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <MilitaryDischarge />
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
