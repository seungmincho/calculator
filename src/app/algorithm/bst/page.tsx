import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BSTVisualizer from '@/components/algorithm/visualizers/BSTVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이진탐색트리 시각화 - BST 자료구조 | 툴허브',
  description: '이진탐색트리(BST) 삽입·탐색·삭제 알고리즘을 인터랙티브 시각화로 배우세요. 단계별 애니메이션으로 노드 비교 과정, 트리 높이, 비교 횟수를 직관적으로 이해할 수 있습니다.',
  keywords: '이진탐색트리, BST, Binary Search Tree, 자료구조, 알고리즘, 삽입, 탐색, 삭제, 트리 시각화',
  openGraph: {
    title: '이진탐색트리 시각화 | 툴허브',
    description: 'BST 삽입·탐색·삭제를 단계별 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/bst',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이진탐색트리 시각화',
    description: 'BST 자료구조 삽입·탐색·삭제 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/bst',
  },
}

export default function BSTPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이진탐색트리 시각화',
    description: '이진탐색트리(BST) 삽입·탐색·삭제 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/bst',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'BST 삽입 단계별 시각화',
      'BST 탐색 경로 하이라이트',
      'BST 삭제 3가지 케이스 시각화',
      '랜덤/정렬/균형 트리 자동 생성',
      '트리 높이 및 비교 횟수 통계',
      'TypeScript 코드 보기',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <BSTVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
