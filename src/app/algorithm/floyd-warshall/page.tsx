import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import FloydWarshallVisualizer from '@/components/algorithm/visualizers/FloydWarshallVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '플로이드-워셜 시각화 - 모든 쌍 최단경로 | 툴허브',
  description:
    '플로이드-워셜(Floyd-Warshall) 알고리즘으로 모든 정점 쌍 간 최단 경로를 구하는 과정을 거리 행렬과 그래프로 인터랙티브하게 학습하세요. 경유 정점 k 증가에 따른 DP 행렬 갱신을 단계별로 시각화합니다.',
  keywords: '플로이드워셜, Floyd-Warshall, 모든쌍최단경로, 거리행렬, 동적프로그래밍, 음수사이클, 알고리즘 시각화',
  openGraph: {
    title: '플로이드-워셜 모든 쌍 최단경로 시각화 | 툴허브',
    description: '거리 행렬 DP로 모든 정점 쌍 간 최단 경로를 구해보세요.',
    url: 'https://toolhub.ai.kr/algorithm/floyd-warshall',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '플로이드-워셜 모든 쌍 최단경로 시각화',
    description: '거리 행렬 DP 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/floyd-warshall',
  },
}

export default function FloydWarshallPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '플로이드-워셜 모든 쌍 최단경로 시각화',
    description: '플로이드-워셜 알고리즘으로 모든 정점 쌍 간 최단 경로를 구하는 과정을 거리 행렬과 그래프로 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/floyd-warshall',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '모든 정점 쌍 최단경로 DP',
      '거리 행렬 실시간 갱신',
      '경유 정점 k 단계별 시각화',
      '음수 가중치 및 음수 사이클 검출',
      '경로 복원 및 하이라이트',
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
            <FloydWarshallVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
