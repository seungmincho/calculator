import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import DijkstraVisualizer from '@/components/algorithm/visualizers/DijkstraVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '다익스트라 시각화 - 가중치 최단경로 알고리즘 | 툴허브',
  description:
    '다익스트라(Dijkstra) 알고리즘으로 가중치 그래프의 최단 경로를 찾는 과정을 인터랙티브하게 학습하세요. 가중치 지형, 대각선 이동, A* 비교 모드를 지원합니다.',
  keywords: '다익스트라, Dijkstra, 최단경로, 가중치 그래프, 우선순위 큐, 알고리즘 시각화',
  openGraph: {
    title: '다익스트라 최단경로 시각화 | 툴허브',
    description: '가중치 그래프의 최단 경로를 다익스트라로 찾아보세요.',
    url: 'https://toolhub.ai.kr/algorithm/dijkstra',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '다익스트라 최단경로 시각화',
    description: '가중치 최단경로 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/dijkstra',
  },
}

export default function DijkstraPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '다익스트라 최단경로 시각화',
    description: '다익스트라 알고리즘으로 가중치 그래프의 최단 경로를 찾는 과정을 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/dijkstra',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '가중치 그리드 최단경로',
      '3가지 가중치 패턴',
      'Dijkstra vs A* 비교',
      '대각선 이동 지원',
      '단계별 거리 표시',
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
            <DijkstraVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
