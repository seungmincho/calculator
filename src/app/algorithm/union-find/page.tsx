import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import UnionFindVisualizer from '@/components/algorithm/visualizers/UnionFindVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '유니온-파인드 시각화 - 서로소 집합 자료구조 | 툴허브',
  description:
    '유니온-파인드(Union-Find) 자료구조의 Union, Find 연산과 경로 압축, 랭크 합치기 최적화를 인터랙티브하게 학습하세요. 트리 구조 변화를 단계별로 시각화합니다.',
  keywords: '유니온파인드, Union-Find, 서로소 집합, Disjoint Set, 경로 압축, 랭크, 알고리즘 시각화',
  openGraph: {
    title: '유니온-파인드 시각화 | 툴허브',
    description: '서로소 집합 자료구조의 Union/Find 연산을 시각적으로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/union-find',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '유니온-파인드 시각화',
    description: '서로소 집합 자료구조 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/union-find',
  },
}

export default function UnionFindPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '유니온-파인드 시각화',
    description: '유니온-파인드 자료구조의 Union, Find 연산과 최적화를 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/union-find',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'Union/Find 연산 시각화',
      '경로 압축 애니메이션',
      '랭크 기반 합치기',
      '트리 구조 변화 관찰',
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
            <UnionFindVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
