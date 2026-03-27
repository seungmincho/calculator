import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import SegmentTreeVisualizer from '@/components/algorithm/visualizers/SegmentTreeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '세그먼트 트리 시각화 - 구간 합·최솟값 O(log n) 쿼리 | 툴허브',
  description: '세그먼트 트리의 빌드·구간 쿼리(합/최소/최대)·점 업데이트를 인터랙티브 시각화로 단계별 학습하세요. O(log n) 범위 쿼리 자료구조를 직관적으로 이해합니다.',
  keywords: '세그먼트 트리, Segment Tree, 구간 합, 범위 쿼리, 점 업데이트, 알고리즘 시각화, 자료구조',
  openGraph: {
    title: '세그먼트 트리 시각화 | 툴허브',
    description: '세그먼트 트리 빌드·쿼리·업데이트를 단계별 애니메이션으로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/segment-tree',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '세그먼트 트리 시각화', description: '구간 합/최솟값/최댓값 쿼리 O(log n) 단계별 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/segment-tree' },
}

export default function SegmentTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '세그먼트 트리 시각화', description: '세그먼트 트리 빌드·구간 쿼리·점 업데이트 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/segment-tree',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['구간 합/최소/최대 쿼리 시각화', '점 업데이트 경로 추적', '트리 빌드 과정 단계별 재생', '쿼리 타입 전환', '코드 하이라이팅'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <SegmentTreeVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
