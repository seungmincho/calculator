import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import AABBVisualizer from '@/components/algorithm/visualizers/AABBVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: 'AABB 충돌감지 시각화 - 바운딩 박스 | 툴허브',
  description: 'AABB(Axis-Aligned Bounding Box) 충돌감지 알고리즘을 인터랙티브 시각화로 배우세요. 두 직사각형을 드래그하며 X축, Y축 투영과 충돌 판정을 단계별로 이해합니다.',
  keywords: 'AABB, Axis-Aligned Bounding Box, 바운딩 박스, 충돌감지, 게임 물리, 알고리즘',
  openGraph: {
    title: 'AABB 충돌감지 시각화 | 툴허브',
    description: 'AABB 바운딩 박스 충돌감지를 인터랙티브하게 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/aabb',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AABB 충돌감지 시각화',
    description: '축 정렬 바운딩 박스로 충돌 판정',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/aabb',
  },
}

export default function AABBPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AABB 충돌감지 시각화',
    description: 'AABB 충돌감지 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/aabb',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '두 직사각형 드래그 인터랙션',
      'X/Y축 투영 바 시각화',
      '단계별 충돌 판정',
      'TypeScript 코드 보기',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <AABBVisualizer />
            <div className="mt-8">
              <GuideSection namespace="aabbVisualizer" />
            </div>
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
