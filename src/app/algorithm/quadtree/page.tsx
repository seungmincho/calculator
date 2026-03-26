import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import QuadTreeVisualizer from '@/components/algorithm/visualizers/QuadTreeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '쿼드트리 시각화 - 공간 분할 자료구조 | 툴허브',
  description:
    '쿼드트리(Quad Tree)의 공간 분할과 범위 검색을 인터랙티브하게 학습하세요. 점 삽입, 4분할, 범위 검색 과정을 단계별로 시각화합니다.',
  keywords: '쿼드트리, Quad Tree, 공간분할, 범위검색, 자료구조, 알고리즘 시각화',
  openGraph: {
    title: '쿼드트리 시각화 | 툴허브',
    description: '쿼드트리의 공간 분할과 범위 검색을 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/quadtree',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '쿼드트리 시각화',
    description: '공간 분할 자료구조의 원리와 범위 검색',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/quadtree',
  },
}

export default function QuadTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '쿼드트리 시각화',
    description: '쿼드트리 공간 분할 및 범위 검색 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/quadtree',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '공간 4분할 시각화',
      '인터랙티브 점 삽입',
      '범위 검색 애니메이션',
      '클러스터/랜덤 패턴 생성',
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
            <QuadTreeVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
