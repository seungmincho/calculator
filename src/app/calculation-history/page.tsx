import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import AllCalculationHistory from '@/components/AllCalculationHistory'
import RelatedTools from '@/components/RelatedTools'
import Breadcrumb from '@/components/Breadcrumb'

export const metadata: Metadata = {
  title: '계산 히스토리 - 저장된 계산 기록 | 툴허브',
  description: '모든 계산기에서 저장한 계산 기록을 한곳에서 확인하세요. 급여, 대출, 세금, 건강 등 모든 계산 이력을 검색·필터링·삭제할 수 있습니다.',
  keywords: '계산히스토리, 계산기록, 저장된계산, 계산이력, 급여계산이력, 대출계산이력, 세금계산이력',
  openGraph: {
    title: '계산 히스토리 - 저장된 계산 기록 | 툴허브',
    description: '모든 계산기에서 저장한 계산 기록을 한곳에서 확인하고 관리하세요',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/calculation-history',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '계산 히스토리',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '계산 히스토리 - 저장된 계산 기록 | 툴허브',
    description: '모든 계산기에서 저장한 계산 기록을 한곳에서 확인하고 관리하세요',
    images: ['/og-image-1200x630.png'],
  },
  alternates: { canonical: 'https://toolhub.ai.kr/calculation-history/' },
}

export default function CalculationHistoryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '계산 히스토리',
    description: '모든 계산기에서 저장한 계산 기록을 한곳에서 확인하고 관리하는 도구',
    url: 'https://toolhub.ai.kr/calculation-history',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '전체 계산 이력 조회',
      '계산기별 필터링',
      '날짜/도구별 정렬',
      '이력 검색',
      '이력 삭제',
      '계산기로 바로가기',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <AllCalculationHistory />
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
