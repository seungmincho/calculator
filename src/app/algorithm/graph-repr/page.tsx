import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import GraphReprVisualizer from '@/components/algorithm/visualizers/GraphReprVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '그래프 표현 시각화 - 인접행렬·인접리스트 | 툴허브',
  description: '그래프를 인접 행렬과 인접 리스트로 동시에 표현합니다. 노드·간선 추가/삭제 시 세 가지 뷰가 실시간 동기화됩니다. 방향/무방향, 가중치 지원.',
  keywords: '그래프, 인접 행렬, 인접 리스트, Adjacency Matrix, Adjacency List, 자료구조, 시각화',
  openGraph: {
    title: '그래프 표현 시각화 | 툴허브',
    description: '그래프·인접행렬·인접리스트 3가지 뷰 실시간 동기화.',
    url: 'https://toolhub.ai.kr/algorithm/graph-repr',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '그래프 표현 시각화', description: '인접행렬·인접리스트 실시간 동기화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/graph-repr' },
}

export default function GraphReprPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '그래프 표현 시각화', description: '그래프 인접행렬·인접리스트 표현 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/graph-repr',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['그래프+행렬+리스트 3뷰 동기화', '노드 드래그', '방향/무방향 토글', '가중치 간선', '클릭으로 간선 추가/삭제'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <GraphReprVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
