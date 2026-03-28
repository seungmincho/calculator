import { Metadata } from 'next'
import { Suspense } from 'react'
import CsVisualizerHub from '@/components/CsVisualizerHub'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'CS 개념 시각화 - Git, CPU, 네트워크, ML 인터랙티브 학습 | 툴허브',
  description: 'Git, CPU 스케줄링, 메모리 관리, TCP/DNS, 신경망, 경사하강법, K-means, 의사결정 트리, 정규표현식을 인터랙티브 시각화로 학습하세요. 무료 온라인 CS 교육 도구.',
  keywords: 'CS 시각화, Git 시각화, CPU 스케줄링, 메모리 관리, TCP 핸드셰이크, DNS, 신경망, 경사하강법, K-means, 의사결정 트리, 정규표현식, 컴퓨터과학 학습',
  openGraph: {
    title: 'CS 개념 시각화 - 인터랙티브 컴퓨터과학 학습 | 툴허브',
    description: '10개 CS 핵심 개념을 인터랙티브 시각화로 학습하세요',
    url: 'https://toolhub.ai.kr/cs-visualizer',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS 개념 시각화 | 툴허브',
    description: '10개 CS 핵심 개념을 인터랙티브 시각화로 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cs-visualizer',
  },
}

export default function CsVisualizerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CS 개념 시각화',
    description: 'Git, CPU, 네트워크, ML 등 CS 핵심 개념을 인터랙티브 시각화로 학습',
    url: 'https://toolhub.ai.kr/cs-visualizer',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'Git 커밋 그래프 시각화',
      'CPU 스케줄링 간트 차트',
      '메모리 페이지 교체 시뮬레이션',
      'TCP 3-way Handshake 애니메이션',
      'DNS 조회 과정 시각화',
      '신경망 순전파/역전파',
      '경사하강법 등고선 시각화',
      'K-means 클러스터링',
      '의사결정 트리 빌더',
      '정규표현식 엔진 시각화',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <CsVisualizerHub />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
