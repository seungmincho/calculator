import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import PathfindingCompareVisualizer from '@/components/algorithm/visualizers/PathfindingCompareVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '경로탐색 비교 - A* vs Dijkstra | 툴허브',
  description: 'A*와 다익스트라 알고리즘을 동일 맵에서 동시 실행하여 비교합니다. 탐색 범위, 경로 길이, 효율성 차이를 시각적으로 확인하세요.',
  keywords: 'A*, Dijkstra, 경로탐색, 최단경로, 비교, 알고리즘, 시각화, 미로',
  openGraph: {
    title: '경로탐색 비교 A* vs Dijkstra | 툴허브',
    description: 'A*와 Dijkstra를 동일 맵에서 동시 비교 시각화.',
    url: 'https://toolhub.ai.kr/algorithm/pathfinding-compare',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'A* vs Dijkstra 비교', description: '두 경로탐색 알고리즘 동시 비교' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/pathfinding-compare' },
}

export default function PathfindingComparePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '경로탐색 비교 (A* vs Dijkstra)', description: 'A*와 다익스트라 경로탐색 알고리즘 동시 비교 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/pathfinding-compare',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['A* vs Dijkstra 동시 실행', '탐색 범위 색상 비교', '벽 그리기 + 미로 생성', '탐색 노드 수 / 경로 길이 비교', '단계별 재생 컨트롤'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <PathfindingCompareVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
