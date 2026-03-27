import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import LisVisualizer from '@/components/algorithm/visualizers/LisVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'LIS 최장 증가 부분수열 시각화 | 툴허브',
  description: 'LIS(최장 증가 부분수열)를 O(n²) DP와 O(n log n) 이진탐색으로 시각화합니다. dp 배열과 tails 배열 갱신 과정, 역추적을 단계별 애니메이션으로 배우세요.',
  keywords: 'LIS, 최장 증가 부분수열, Longest Increasing Subsequence, DP, 이진탐색, 알고리즘 시각화',
  openGraph: {
    title: 'LIS 최장 증가 부분수열 시각화 | 툴허브',
    description: 'LIS DP와 이진탐색 풀이를 단계별로 비교하며 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/lis',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LIS 최장 증가 부분수열 시각화',
    description: 'LIS O(n²) DP vs O(n log n) 이진탐색 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/lis',
  },
}

export default function LisPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LIS 최장 증가 부분수열 시각화',
    description: 'LIS DP 및 이진탐색 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/lis',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'O(n²) DP 방법 시각화',
      'O(n log n) 이진탐색 방법 시각화',
      'dp 배열 / tails 배열 실시간 갱신',
      'LIS 원소 하이라이트',
      '랜덤 수열 생성',
      '4가지 프리셋 예제',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <LisVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
