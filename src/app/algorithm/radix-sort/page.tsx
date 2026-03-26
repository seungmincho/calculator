import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import RadixSortVisualizer from '@/components/algorithm/visualizers/RadixSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '래딕스정렬 시각화 - 자릿수별 정렬 | 툴허브',
  description:
    '래딕스정렬(Radix Sort) LSD 방식을 10개 버킷 애니메이션으로 학습하세요. 일의 자리부터 높은 자리까지 자릿수별로 분배·수집하는 과정을 시각적으로 이해합니다. O(d×n) 비교 없는 안정 정렬.',
  keywords: '래딕스정렬, Radix Sort, LSD 정렬, 자릿수 정렬, 버킷 정렬, 알고리즘 시각화, 비교 없는 정렬',
  openGraph: {
    title: '래딕스정렬 시각화 | 툴허브',
    description: '래딕스정렬 LSD를 10개 버킷 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/radix-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '래딕스정렬 시각화',
    description: '자릿수별 버킷 정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/radix-sort',
  },
}

export default function RadixSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '래딕스정렬 시각화',
    description: '래딕스정렬(Radix Sort) LSD 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/radix-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '10개 버킷 실시간 분배·수집 애니메이션',
      'LSD(최하위 자릿수) 래딕스정렬 시각화',
      '활성 자릿수 하이라이팅',
      '자릿수 패스별 단계 구분',
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
            <RadixSortVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
