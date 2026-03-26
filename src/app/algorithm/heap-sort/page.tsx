import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import HeapSortVisualizer from '@/components/algorithm/visualizers/HeapSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '힙정렬 시각화 - 이진 힙 정렬 알고리즘 | 툴허브',
  description:
    '힙정렬(Heap Sort)의 이진 힙 구성과 추출 과정을 트리+막대 차트로 학습하세요. 최대 힙 구성, 루트 추출, 힙 복원을 단계별로 시각화합니다.',
  keywords: '힙정렬, Heap Sort, 이진 힙, 우선순위 큐, 정렬 알고리즘, 시각화',
  openGraph: {
    title: '힙정렬 시각화 | 툴허브',
    description: '힙정렬의 이진 힙 구성과 정렬 과정을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/heap-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '힙정렬 시각화',
    description: '이진 힙 정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/heap-sort',
  },
}

export default function HeapSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '힙정렬 시각화',
    description: '힙정렬 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/heap-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '이진 힙 트리 시각화',
      '트리+배열 동시 표시',
      '힙 구성·추출 과정',
      '다양한 입력 생성',
      '단계별 코드 하이라이팅',
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
            <HeapSortVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
