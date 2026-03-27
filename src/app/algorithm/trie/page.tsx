import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import TrieVisualizer from '@/components/algorithm/visualizers/TrieVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '트라이 시각화 - Trie 삽입/탐색/자동완성 | 툴허브',
  description: '트라이(Trie) 자료구조의 삽입, 탐색, 자동완성 알고리즘을 인터랙티브 시각화로 배우세요. 트리 구조에서 문자 단위 탐색, 노드 생성, 접두사 기반 자동완성을 단계별로 확인합니다.',
  keywords: '트라이, Trie, 문자열 검색, 자동완성, 접두사 트리, 자료구조, 알고리즘 시각화',
  openGraph: {
    title: '트라이 시각화 | 툴허브',
    description: 'Trie 삽입/탐색/자동완성을 단계별 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/trie',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '트라이 시각화',
    description: 'Trie 삽입/탐색/자동완성 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/trie',
  },
}

export default function TriePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '트라이 시각화',
    description: '트라이(Trie) 자료구조 삽입/탐색/자동완성 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/trie',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '트라이 삽입 단계별 시각화',
      '문자열 탐색 경로 하이라이트',
      '접두사 기반 자동완성',
      '기본 단어 세트로 초기 트라이 구축',
      '종료 노드 이중 원 표시',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <TrieVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
