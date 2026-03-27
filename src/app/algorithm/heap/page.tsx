import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import HeapVisualizer from '@/components/algorithm/visualizers/HeapVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '힙 / 우선순위 큐 시각화 - Heap | 툴허브',
  description: '최소힙·최대힙의 삽입·추출·Heapify를 트리+배열 이중 뷰로 시각화합니다. 배열 인덱스와 트리 위치의 매핑, Bubble Up/Down 과정을 단계별로 학습하세요.',
  keywords: '힙, Heap, 우선순위 큐, Priority Queue, Min Heap, Max Heap, Heapify, 자료구조',
  openGraph: {
    title: '힙 / 우선순위 큐 시각화 | 툴허브',
    description: '힙 삽입·추출·Heapify를 트리+배열로 동시 시각화.',
    url: 'https://toolhub.ai.kr/algorithm/heap',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '힙 시각화', description: 'Min/Max Heap 트리+배열 이중 뷰 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/heap' },
}

export default function HeapPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '힙 / 우선순위 큐 시각화', description: '힙 자료구조 삽입·추출·Heapify 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/heap',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['트리+배열 이중 뷰', 'Min/Max Heap 전환', 'Bubble Up/Down 애니메이션', '배열 인덱스 ↔ 트리 매핑', 'Heapify (Bottom-up) 시각화'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <HeapVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
