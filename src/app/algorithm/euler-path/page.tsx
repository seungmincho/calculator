import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import EulerPathVisualizer from '@/components/algorithm/visualizers/EulerPathVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '오일러 경로 시각화 - Hierholzer 알고리즘 | 툴허브',
  description:
    '오일러 경로와 회로를 Hierholzer 알고리즘으로 찾는 과정을 인터랙티브하게 학습하세요. 그래프의 모든 간선을 정확히 한 번씩 지나는 경로를 단계별로 시각화합니다.',
  keywords: '오일러 경로, 오일러 회로, Euler Path, Euler Circuit, Hierholzer, 그래프 알고리즘, 알고리즘 시각화',
  openGraph: {
    title: '오일러 경로/회로 시각화 | 툴허브',
    description: '그래프의 모든 간선을 한 번씩 방문하는 오일러 경로를 찾아보세요.',
    url: 'https://toolhub.ai.kr/algorithm/euler-path',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '오일러 경로 시각화',
    description: 'Hierholzer 알고리즘으로 오일러 경로 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/euler-path',
  },
}

export default function EulerPathPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '오일러 경로/회로 시각화',
    description: 'Hierholzer 알고리즘으로 그래프의 모든 간선을 한 번씩 방문하는 오일러 경로와 회로를 찾는 과정을 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/euler-path',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '오일러 경로/회로 자동 판별',
      'Hierholzer 알고리즘 단계별 시각화',
      '방향/무방향 그래프 전환',
      '홀수 차수 정점 표시',
      '경로 결과 순서 표시',
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
            <EulerPathVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
