import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import FloodFillVisualizer from '@/components/algorithm/visualizers/FloodFillVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '플러드필 시각화 - 영역 채우기 알고리즘 | 툴허브',
  description:
    '플러드필(Flood Fill) 알고리즘을 컬러 그리드에서 인터랙티브하게 학습하세요. 페인트 버킷처럼 클릭하면 BFS/DFS로 같은 색 영역을 채웁니다. 단계별 애니메이션으로 탐색 과정을 시각적으로 이해합니다.',
  keywords: '플러드필, flood fill, 영역 채우기, BFS, DFS, 페인트 버킷, 알고리즘 시각화',
  openGraph: {
    title: '플러드필 시각화 | 툴허브',
    description: '페인트 버킷처럼 클릭해서 BFS/DFS 플러드필 알고리즘을 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/flood-fill',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '플러드필 시각화',
    description: '영역 채우기 알고리즘 인터랙티브 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/flood-fill',
  },
}

export default function FloodFillPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '플러드필 시각화',
    description: '플러드필 영역 채우기 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/flood-fill',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '컬러 그리드 클릭으로 플러드필 시작',
      'BFS / DFS 모드 비교',
      '8색 팔레트 선택',
      '단계별 채우기 애니메이션',
      '랜덤 / 체커보드 / 섬 패턴 그리드',
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
            <FloodFillVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
