import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import PrimVisualizer from '@/components/algorithm/visualizers/PrimVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '프림 MST 시각화 - 최소 신장 트리 알고리즘 | 툴허브',
  description:
    '프림(Prim) 알고리즘으로 최소 신장 트리(MST)를 구성하는 과정을 인터랙티브하게 학습하세요. 우선순위 큐, 정점 확장, 간선 선택을 단계별로 시각화합니다.',
  keywords: '프림, Prim, MST, 최소 신장 트리, 우선순위 큐, 그래프 알고리즘, 알고리즘 시각화',
  openGraph: {
    title: '프림 MST 시각화 | 툴허브',
    description: '최소 신장 트리를 프림 알고리즘으로 구성하는 과정을 시각적으로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/prim',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '프림 MST 시각화',
    description: '최소 신장 트리 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/prim',
  },
}

export default function PrimPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '프림 MST 시각화',
    description: '프림 알고리즘으로 최소 신장 트리를 구성하는 과정을 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/prim',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '그래프 MST 구성',
      '우선순위 큐 시각화',
      '정점 확장 과정',
      '후보/선택 간선 구분',
      '단계별 의사코드 하이라이트',
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
            <PrimVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
