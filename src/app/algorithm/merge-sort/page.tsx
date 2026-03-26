import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import MergeSortVisualizer from '@/components/algorithm/visualizers/MergeSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '병합정렬 시각화 - 분할정복 안정정렬 | 툴허브',
  description:
    '병합정렬(Merge Sort)의 분할과 병합 과정을 막대 차트 애니메이션으로 학습하세요. 왼쪽·오른쪽 부분 배열의 병합 과정을 색상으로 구분하여 직관적으로 이해합니다.',
  keywords: '병합정렬, Merge Sort, 분할정복, 안정정렬, 정렬 알고리즘, 시각화',
  openGraph: {
    title: '병합정렬 시각화 | 툴허브',
    description: '병합정렬의 분할과 병합 과정을 막대 차트로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/merge-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '병합정렬 시각화',
    description: '분할정복 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/merge-sort',
  },
}

export default function MergeSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '병합정렬 시각화',
    description: '병합정렬 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/merge-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '분할·병합 과정 시각화',
      '왼쪽·오른쪽 부분배열 색상 구분',
      '다양한 입력 생성',
      '재귀 깊이 표시',
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
            <MergeSortVisualizer />
            <div className="mt-8">
              <GuideSection namespace="mergeSortVisualizer" />
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
