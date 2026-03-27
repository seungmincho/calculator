import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BTreeVisualizer from '@/components/algorithm/visualizers/BTreeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'B-트리 시각화 - 데이터베이스 인덱싱의 핵심 | 툴허브',
  description: 'B-트리의 삽입·삭제·검색·분할을 인터랙티브 시각화로 배우세요. MySQL, PostgreSQL 인덱스의 핵심 자료구조를 단계별 애니메이션으로 이해할 수 있습니다.',
  keywords: 'B-트리, B-Tree, 다진 탐색 트리, 데이터베이스 인덱스, 분할, 알고리즘 시각화',
  openGraph: {
    title: 'B-트리 시각화 | 툴허브',
    description: 'B-트리 삽입·삭제·분할을 단계별 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/b-tree',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'B-트리 시각화', description: 'B-트리 노드 분할과 검색 단계별 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/b-tree' },
}

export default function BTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: 'B-트리 시각화', description: 'B-트리 삽입·삭제·검색·분할 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/b-tree',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['삽입 + 노드 분할 시각화', '차수(t) 조절 가능', '검색 경로 애니메이션', '삭제 + 병합/차용 처리', 'TypeScript 코드 보기'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <BTreeVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
