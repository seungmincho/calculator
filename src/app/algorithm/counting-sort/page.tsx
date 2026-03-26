import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import CountingSortVisualizer from '@/components/algorithm/visualizers/CountingSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '카운팅정렬 시각화 - 비교 없는 정렬 | 툴허브',
  description:
    '카운팅정렬(Counting Sort)을 3단계(빈도세기→누적합→배치) 막대 차트 애니메이션으로 학습하세요. 비교 없이 O(n+k)로 정렬되는 원리를 입력/카운트/출력 배열을 통해 시각적으로 이해합니다.',
  keywords: '카운팅정렬, Counting Sort, 비교 없는 정렬, 선형시간 정렬, 알고리즘 시각화, 정렬 알고리즘',
  openGraph: {
    title: '카운팅정렬 시각화 | 툴허브',
    description: '카운팅정렬을 3단계 막대 차트 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/counting-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '카운팅정렬 시각화',
    description: '비교 없는 정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/counting-sort',
  },
}

export default function CountingSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '카운팅정렬 시각화',
    description: '카운팅정렬(Counting Sort) 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/counting-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '3단계 막대 차트 애니메이션 (입력/카운트/출력)',
      '빈도 세기 단계 시각화',
      '누적합(prefix sum) 단계 시각화',
      '출력 배열 배치 단계 시각화',
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
            <CountingSortVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
