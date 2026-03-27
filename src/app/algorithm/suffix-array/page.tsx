import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import SuffixArrayVisualizer from '@/components/algorithm/visualizers/SuffixArrayVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '접미사 배열 시각화 - SA 구축 + LCP + 이진탐색 | 툴허브',
  description: '접미사 배열(Suffix Array) 구축, Kasai LCP 배열, 이진탐색 패턴 매칭을 시각화합니다. 정렬된 접미사 목록과 공통 접두사 분석을 단계별로 학습하세요.',
  keywords: '접미사 배열, Suffix Array, LCP, Kasai, 패턴 검색, 이진탐색, 문자열, 알고리즘 시각화',
  openGraph: {
    title: '접미사 배열 시각화 | 툴허브',
    description: '접미사 배열 구축 + LCP + 이진탐색 패턴 매칭 시각화',
    url: 'https://toolhub.ai.kr/algorithm/suffix-array',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '접미사 배열 시각화',
    description: 'SA 구축 + LCP 분석 + 이진탐색 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/suffix-array',
  },
}

export default function SuffixArrayPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '접미사 배열 시각화',
    description: '접미사 배열 구축, LCP 배열, 이진탐색 패턴 매칭 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/suffix-array',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '접미사 배열 정렬 과정 시각화',
      'Kasai LCP 배열 계산 애니메이션',
      'LCP 값 바 차트 시각화',
      '이진탐색 패턴 매칭 단계별 추적',
      '4가지 프리셋 문자열-패턴 쌍',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <SuffixArrayVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
