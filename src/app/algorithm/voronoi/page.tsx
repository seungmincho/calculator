import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import VoronoiVisualizer from '@/components/algorithm/visualizers/VoronoiVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '보로노이 다이어그램 시각화 - 최근접 분할 | 툴허브',
  description:
    '보로노이 다이어그램(Voronoi Diagram)을 스윕 애니메이션으로 학습하세요. 사이트 추가, 영역 분할, 최근접 이웃 할당을 시각적으로 이해합니다.',
  keywords: '보로노이, Voronoi Diagram, 최근접 분할, 계산기하학, 알고리즘 시각화',
  openGraph: {
    title: '보로노이 다이어그램 시각화 | 툴허브',
    description: '보로노이 다이어그램을 인터랙티브하게 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/voronoi',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '보로노이 다이어그램 시각화',
    description: '계산기하학 영역 분할 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/voronoi',
  },
}

export default function VoronoiPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '보로노이 다이어그램 시각화',
    description: '보로노이 다이어그램 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/voronoi',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '사이트 클릭 추가',
      '스윕 라인 애니메이션',
      '영역별 컬러링',
      '경계선 자동 계산',
      '랜덤/그리드 배치',
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
            <VoronoiVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
