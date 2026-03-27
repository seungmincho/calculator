import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import ConvexHullVisualizer from '@/components/algorithm/visualizers/ConvexHullVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '볼록 껍질 시각화 - Graham Scan 알고리즘 | 툴허브',
  description:
    'Graham Scan 알고리즘으로 볼록 껍질(Convex Hull)을 구하는 과정을 인터랙티브하게 학습하세요. 점 추가·드래그, 스택 연산, 회전 방향 판정을 단계별로 시각화합니다.',
  keywords: '볼록 껍질, Convex Hull, Graham Scan, 계산기하학, 알고리즘 시각화',
  openGraph: {
    title: '볼록 껍질 시각화 | 툴허브',
    description: 'Graham Scan으로 볼록 껍질을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/convex-hull',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '볼록 껍질 시각화',
    description: '계산기하학 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/convex-hull',
  },
}

export default function ConvexHullPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '볼록 껍질 시각화',
    description: '볼록 껍질 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/convex-hull',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '점 클릭 추가 및 드래그',
      'Graham Scan 단계별 애니메이션',
      '스택 push/pop 시각화',
      '회전 방향(CCW) 판정 시각화',
      '코드 하이라이팅',
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
            <ConvexHullVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
