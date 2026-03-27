import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BellmanFordVisualizer from '@/components/algorithm/visualizers/BellmanFordVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '벨만-포드 시각화 - 음수 가중치 최단경로 | 툴허브',
  description:
    '벨만-포드(Bellman-Ford) 알고리즘으로 음수 가중치가 있는 그래프에서 최단 경로를 찾는 과정을 인터랙티브하게 학습하세요. V-1회 반복과 음수 사이클 검출을 단계별로 시각화합니다.',
  keywords: '벨만포드, Bellman-Ford, 최단경로, 음수 가중치, 음수 사이클, 이완, 알고리즘 시각화',
  openGraph: {
    title: '벨만-포드 최단경로 시각화 | 툴허브',
    description: '음수 가중치 그래프의 최단 경로를 벨만-포드로 찾아보세요.',
    url: 'https://toolhub.ai.kr/algorithm/bellman-ford',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '벨만-포드 최단경로 시각화',
    description: '음수 가중치 최단경로 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/bellman-ford',
  },
}

export default function BellmanFordPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '벨만-포드 최단경로 시각화',
    description: '벨만-포드 알고리즘으로 음수 가중치 그래프의 최단 경로를 찾는 과정을 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/bellman-ford',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '음수 가중치 최단경로',
      'V-1 반복 이완 과정',
      '음수 사이클 검출',
      '거리 테이블 실시간 갱신',
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
            <BellmanFordVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
