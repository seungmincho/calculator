import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import InsertionSortVisualizer from '@/components/algorithm/visualizers/InsertionSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '삽입정렬 시각화 - 카드 정렬 알고리즘 | 툴허브',
  description:
    '삽입정렬(Insertion Sort)을 막대 차트 애니메이션으로 단계별 학습하세요. 요소 선택·비교·이동·삽입 과정을 시각적으로 이해하고, 다양한 입력(랜덤/역순/거의 정렬)으로 성능 차이를 확인합니다.',
  keywords: '삽입정렬, Insertion Sort, 정렬 알고리즘, 시각화, 비교정렬, 알고리즘 교육, 카드 정렬',
  openGraph: {
    title: '삽입정렬 시각화 | 툴허브',
    description: '삽입정렬을 막대 차트 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/insertion-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '삽입정렬 시각화',
    description: '정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/insertion-sort',
  },
}

export default function InsertionSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '삽입정렬 시각화',
    description: '삽입정렬 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/insertion-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '막대 차트 정렬 애니메이션',
      '선택·비교·이동·삽입 하이라이팅',
      '다양한 입력 생성 (랜덤/역순/거의정렬)',
      '단계별 코드 하이라이팅',
      '비교·이동 횟수 통계',
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
            <InsertionSortVisualizer />
            <div className="mt-8">
              <GuideSection namespace="insertionSortVisualizer" />
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
