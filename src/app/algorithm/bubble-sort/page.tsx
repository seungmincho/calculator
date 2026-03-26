import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BubbleSortVisualizer from '@/components/algorithm/visualizers/BubbleSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '버블정렬 시각화 - 정렬 알고리즘 | 툴허브',
  description:
    '버블정렬(Bubble Sort)을 막대 차트 애니메이션으로 단계별 학습하세요. 비교·스왑 과정을 시각적으로 이해하고, 다양한 입력(랜덤/역순/거의 정렬)으로 성능 차이를 확인합니다.',
  keywords: '버블정렬, Bubble Sort, 정렬 알고리즘, 시각화, 비교정렬, 알고리즘 교육',
  openGraph: {
    title: '버블정렬 시각화 | 툴허브',
    description: '버블정렬을 막대 차트 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/bubble-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '버블정렬 시각화',
    description: '정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/bubble-sort',
  },
}

export default function BubbleSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '버블정렬 시각화',
    description: '버블정렬 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/bubble-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '막대 차트 정렬 애니메이션',
      '비교·스왑 하이라이팅',
      '다양한 입력 생성 (랜덤/역순/거의정렬)',
      '단계별 코드 하이라이팅',
      '패스별 통계',
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
            <BubbleSortVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
