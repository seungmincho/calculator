import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import QuickSortVisualizer from '@/components/algorithm/visualizers/QuickSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '퀵정렬 시각화 - 분할정복 정렬 알고리즘 | 툴허브',
  description:
    '퀵정렬(Quick Sort)의 파티션 과정을 막대 차트 애니메이션으로 학습하세요. 피벗 선택, 분할, 재귀 과정을 단계별로 시각화합니다.',
  keywords: '퀵정렬, Quick Sort, 분할정복, 파티션, 피벗, 정렬 알고리즘, 시각화',
  openGraph: {
    title: '퀵정렬 시각화 | 툴허브',
    description: '퀵정렬의 파티션 과정을 막대 차트 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/quick-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '퀵정렬 시각화',
    description: '분할정복 정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/quick-sort',
  },
}

export default function QuickSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퀵정렬 시각화',
    description: '퀵정렬 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/quick-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '파티션 과정 시각화',
      '피벗 하이라이팅',
      '재귀 깊이 표시',
      '다양한 입력 생성',
      '단계별 코드 하이라이팅',
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
            <QuickSortVisualizer />
            <div className="mt-8">
              <GuideSection namespace="quickSortVisualizer" />
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
