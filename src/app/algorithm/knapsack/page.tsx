import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import KnapsackVisualizer from '@/components/algorithm/visualizers/KnapsackVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '배낭 문제 시각화 - 0/1 Knapsack DP | 툴허브',
  description: '0/1 배낭 문제(Knapsack)를 2D DP 테이블로 시각화합니다. 아이템 포함/제외 결정, 셀 계산 과정, 역추적으로 선택된 아이템을 단계별 애니메이션으로 배우세요.',
  keywords: '배낭 문제, Knapsack, DP, 동적 프로그래밍, 0/1 배낭, 알고리즘 시각화',
  openGraph: {
    title: '배낭 문제 시각화 | 툴허브',
    description: '0/1 Knapsack DP 테이블 계산과 역추적을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/knapsack',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '배낭 문제 시각화',
    description: '0/1 Knapsack DP 테이블 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/knapsack',
  },
}

export default function KnapsackPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '배낭 문제 시각화',
    description: '0/1 Knapsack DP 테이블 계산 및 역추적 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/knapsack',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2D DP 테이블 셀 계산 시각화',
      '포함/제외 결정 과정 하이라이트',
      '역추적으로 선택된 아이템 표시',
      '3가지 프리셋 예제',
      '셀 호버로 계산 세부정보 확인',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <KnapsackVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
