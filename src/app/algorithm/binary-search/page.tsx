import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BinarySearchVisualizer from '@/components/algorithm/visualizers/BinarySearchVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이진탐색 시각화 - 분할정복 검색 알고리즘 | 툴허브',
  description:
    '이진탐색(Binary Search)으로 정렬된 배열에서 목표값을 찾는 과정을 단계별로 학습하세요. 탐색 범위가 절반씩 줄어드는 과정을 시각적으로 확인합니다.',
  keywords: '이진탐색, Binary Search, 분할정복, 정렬 배열, 검색 알고리즘, 시각화',
  openGraph: {
    title: '이진탐색 시각화 | 툴허브',
    description: '정렬된 배열에서 목표값을 찾는 이진탐색을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/binary-search',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이진탐색 시각화',
    description: '분할정복으로 배열 검색하기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/binary-search',
  },
}

export default function BinarySearchPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이진탐색 시각화',
    description: '이진탐색(Binary Search) 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/binary-search',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '탐색 범위 시각화',
      'low/mid/high 포인터 표시',
      '제거된 영역 페이드',
      '랜덤 타겟 생성',
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
            <BinarySearchVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
