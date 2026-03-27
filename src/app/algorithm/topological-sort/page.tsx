import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import TopologicalSortVisualizer from '@/components/algorithm/visualizers/TopologicalSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '위상정렬 시각화 - DAG 의존성 정렬 알고리즘 | 툴허브',
  description:
    '위상정렬(Topological Sort)로 방향 비순환 그래프(DAG)의 의존성 순서를 결정하는 과정을 인터랙티브하게 학습하세요. 칸(Kahn) 알고리즘의 진입차수 감소 과정을 단계별로 시각화합니다.',
  keywords: '위상정렬, Topological Sort, DAG, 의존성 정렬, Kahn, 진입차수, 알고리즘 시각화',
  openGraph: {
    title: '위상정렬 시각화 | 툴허브',
    description: 'DAG 의존성 순서를 위상정렬로 결정하는 과정을 시각적으로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/topological-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '위상정렬 시각화',
    description: 'DAG 의존성 정렬 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/topological-sort',
  },
}

export default function TopologicalSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '위상정렬 시각화',
    description: '위상정렬로 DAG의 의존성 순서를 결정하는 과정을 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/topological-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'DAG 위상정렬',
      '진입차수 실시간 표시',
      'BFS 큐 시각화',
      '순환 감지',
      '단계별 코드 하이라이트',
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
            <TopologicalSortVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
