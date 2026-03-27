import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import RaycastingVisualizer from '@/components/algorithm/visualizers/RaycastingVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '레이캐스팅 시각화 - 2.5D 렌더링 | 툴허브',
  description:
    'Wolfenstein 스타일 레이캐스팅 엔진을 직접 체험하세요. DDA 알고리즘으로 광선을 쏘아 벽을 감지하고 2.5D 1인칭 뷰를 실시간으로 렌더링합니다.',
  keywords: '레이캐스팅, Raycasting, DDA, 2.5D 렌더링, 게임 엔진, 알고리즘 시각화',
  openGraph: {
    title: '레이캐스팅 시각화 | 툴허브',
    description: 'DDA 알고리즘 기반 2.5D 렌더링을 체험하세요.',
    url: 'https://toolhub.ai.kr/algorithm/raycasting',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '레이캐스팅 시각화',
    description: '2.5D 렌더링 엔진 체험',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/raycasting',
  },
}

export default function RaycastingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '레이캐스팅 시각화',
    description: '레이캐스팅 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/raycasting',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'WASD/화살표 키보드 조작',
      'DDA 알고리즘 실시간 렌더링',
      '2D 미니맵 + 3D 1인칭 뷰',
      '맵 에디터',
      '광선 시각화',
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
            <RaycastingVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
