import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import AStarVisualizer from '@/components/algorithm/visualizers/AStarVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'A* 경로탐색 시각화 - 최단 경로 알고리즘 | 툴허브',
  description:
    'A*(A-Star) 경로탐색 알고리즘을 인터랙티브하게 학습하세요. 휴리스틱 선택, 대각선 이동, BFS 비교 모드로 최단 경로 탐색을 직관적으로 이해합니다.',
  keywords: 'A*, A-Star, 경로탐색, 최단경로, 휴리스틱, 다익스트라, 알고리즘',
  openGraph: {
    title: 'A* 경로탐색 시각화 | 툴허브',
    description: '휴리스틱 기반 최단경로 알고리즘을 시각적으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/a-star',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A* 경로탐색 시각화',
    description: '휴리스틱 기반 최단경로 탐색 알고리즘',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/a-star',
  },
}

export default function AStarPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'A* 경로탐색 시각화',
    description: 'A* 최단경로 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/a-star',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'A* 최단경로 시각화',
      '3가지 휴리스틱 비교',
      'A* vs BFS 비교 모드',
      '대각선 이동 지원',
      '단계별 f/g/h 코스트 표시',
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
            <AStarVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
