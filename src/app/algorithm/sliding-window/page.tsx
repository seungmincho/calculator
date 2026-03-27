import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import SlidingWindowVisualizer from '@/components/algorithm/visualizers/SlidingWindowVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '슬라이딩 윈도우 시각화 - 고정/가변 크기 윈도우 기법 | 툴허브',
  description: '슬라이딩 윈도우(Sliding Window) 기법을 시각화합니다. 고정 크기(최대 합)와 가변 크기(최소 길이) 두 모드를 지원하며, 좌/우 포인터 이동을 단계별 애니메이션으로 학습하세요.',
  keywords: '슬라이딩 윈도우, Sliding Window, 투 포인터, 부분 배열, 알고리즘 시각화',
  openGraph: {
    title: '슬라이딩 윈도우 시각화 | 툴허브',
    description: '고정/가변 크기 윈도우 기법으로 부분 배열 문제를 효율적으로 풀어보세요.',
    url: 'https://toolhub.ai.kr/algorithm/sliding-window',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '슬라이딩 윈도우 시각화',
    description: '고정/가변 크기 슬라이딩 윈도우 기법 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/sliding-window',
  },
}

export default function SlidingWindowPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '슬라이딩 윈도우 시각화',
    description: '슬라이딩 윈도우 기법 고정/가변 크기 모드 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/sliding-window',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '고정 크기 윈도우: 크기 k 최대 합',
      '가변 크기 윈도우: 합 >= 목표의 최소 길이',
      '좌/우 포인터 이동 애니메이션',
      '윈도우 오버레이 시각화',
      '4가지 프리셋 + 랜덤 생성',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <SlidingWindowVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
