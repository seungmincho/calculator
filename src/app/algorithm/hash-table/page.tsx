import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import HashTableVisualizer from '@/components/algorithm/visualizers/HashTableVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '해시테이블 시각화 - 해시 충돌 해결 | 툴허브',
  description: '해시테이블 자료구조를 인터랙티브 시각화로 배우세요. 체이닝, 선형 프로빙, 이차 프로빙으로 해시 충돌 해결 방법을 단계별로 이해할 수 있습니다.',
  keywords: '해시테이블, 해시 충돌, 체이닝, 선형 프로빙, 이차 프로빙, 자료구조, 알고리즘 시각화',
  openGraph: {
    title: '해시테이블 시각화 | 툴허브',
    description: '해시 충돌 해결(체이닝·선형·이차 프로빙)을 인터랙티브하게 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/hash-table',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '해시테이블 시각화',
    description: '해시 충돌 해결 방법을 단계별로 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/hash-table',
  },
}

export default function HashTablePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '해시테이블 시각화',
    description: '해시테이블 자료구조 인터랙티브 교육 도구 — 체이닝 및 오픈 어드레싱 충돌 해결',
    url: 'https://toolhub.ai.kr/algorithm/hash-table',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '3가지 충돌 해결 전략 (체이닝, 선형/이차 프로빙)',
      '해시 함수 → 버킷 인덱스 플로우 시각화',
      '충돌 시 빨간 하이라이트 + 프로브 시퀀스',
      '키 삽입/탐색 단계별 재생',
      '적재율(Load Factor) 실시간 표시',
      'TypeScript 슈도코드 보기',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <HashTableVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
