import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import FibonacciDpVisualizer from '@/components/algorithm/visualizers/FibonacciDpVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '피보나치 DP 시각화 - 재귀 vs 메모이제이션 vs 테이블레이션 | 툴허브',
  description: '피보나치 수열로 배우는 동적 프로그래밍(DP) 입문. 나이브 재귀의 지수적 호출 트리 vs 메모이제이션의 가지치기 vs 바텀업 테이블레이션을 단계별 애니메이션으로 비교합니다.',
  keywords: '피보나치, DP, 동적 프로그래밍, 메모이제이션, 테이블레이션, 재귀, 알고리즘 시각화',
  openGraph: {
    title: '피보나치 DP 시각화 | 툴허브',
    description: '재귀 트리 폭발 vs DP 효율을 단계별 애니메이션으로 비교하세요.',
    url: 'https://toolhub.ai.kr/algorithm/fibonacci-dp',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '피보나치 DP 시각화',
    description: '재귀 vs 메모이제이션 vs 테이블레이션 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/fibonacci-dp',
  },
}

export default function FibonacciDpPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '피보나치 DP 시각화',
    description: '피보나치 수열로 배우는 동적 프로그래밍 입문 — 재귀 vs 메모이제이션 vs 테이블레이션',
    url: 'https://toolhub.ai.kr/algorithm/fibonacci-dp',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '나이브 재귀 호출 트리 시각화',
      '메모이제이션 가지치기 비교',
      '테이블레이션 바텀업 DP 테이블',
      '단계별 애니메이션 재생',
      '호출 횟수 비교 통계',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <FibonacciDpVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
