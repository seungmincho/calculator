import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BFSDFSVisualizer from '@/components/algorithm/visualizers/BFSDFSVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'BFS/DFS 탐색 시각화 - 너비우선·깊이우선 | 툴허브',
  description:
    'BFS(너비우선탐색)와 DFS(깊이우선탐색)를 그리드에서 인터랙티브하게 비교하며 학습하세요. 벽 그리기, 미로 생성, 단계별 애니메이션으로 탐색 알고리즘을 직관적으로 이해합니다.',
  keywords: 'BFS, DFS, 너비우선탐색, 깊이우선탐색, 그래프 탐색, 알고리즘, 미로',
  openGraph: {
    title: 'BFS/DFS 탐색 시각화 | 툴허브',
    description: 'BFS와 DFS를 그리드에서 비교하며 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/bfs-dfs',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BFS/DFS 탐색 시각화',
    description: '너비우선·깊이우선 탐색 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/bfs-dfs',
  },
}

export default function BFSDFSPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BFS/DFS 탐색 시각화',
    description: 'BFS/DFS 그래프 탐색 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/bfs-dfs',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'BFS/DFS 시각적 비교',
      '벽 그리기 & 미로 생성',
      '단계별 탐색 애니메이션',
      'BFS vs DFS 동시 비교 모드',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <BFSDFSVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
