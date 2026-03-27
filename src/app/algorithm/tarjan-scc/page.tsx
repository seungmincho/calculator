import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import TarjanSccVisualizer from '@/components/algorithm/visualizers/TarjanSccVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '타잔 SCC 시각화 - 강연결 요소 탐색 | 툴허브',
  description:
    '타잔(Tarjan) 알고리즘으로 방향 그래프의 강연결 요소(SCC)를 찾는 과정을 DFS 탐색, discovery/low-link 값, 스택 상태와 함께 단계별로 시각화합니다.',
  keywords: '타잔, Tarjan, SCC, 강연결요소, Strongly Connected Components, DFS, low-link, 알고리즘 시각화',
  openGraph: {
    title: '타잔 SCC 강연결 요소 시각화 | 툴허브',
    description: 'DFS 기반 타잔 알고리즘으로 방향 그래프의 SCC를 찾아보세요.',
    url: 'https://toolhub.ai.kr/algorithm/tarjan-scc',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '타잔 SCC 강연결 요소 시각화',
    description: 'DFS 기반 SCC 탐색 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/tarjan-scc',
  },
}

export default function TarjanSccPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '타잔 SCC 강연결 요소 시각화',
    description: '타잔 알고리즘으로 방향 그래프의 강연결 요소를 찾는 과정을 DFS 탐색과 함께 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/tarjan-scc',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'DFS 기반 SCC 탐색',
      'Discovery time / Low-link 실시간 추적',
      '스택 상태 시각화',
      'SCC 그룹 색상 구분',
      '단계별 코드 하이라이트',
      '노드 드래그 지원',
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
            <TarjanSccVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
