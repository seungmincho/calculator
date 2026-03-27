import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import KMPVisualizer from '@/components/algorithm/visualizers/KMPVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'KMP 패턴 매칭 시각화 - 실패 함수 + 문자열 검색 | 툴허브',
  description: 'KMP(Knuth-Morris-Pratt) 패턴 매칭 알고리즘을 시각화합니다. 실패 함수 구축, 텍스트-패턴 비교, 불일치 시 패턴 이동을 단계별 애니메이션으로 배우세요.',
  keywords: 'KMP, 패턴 매칭, 문자열 검색, 실패 함수, Knuth-Morris-Pratt, 알고리즘 시각화',
  openGraph: {
    title: 'KMP 패턴 매칭 시각화 | 툴허브',
    description: 'KMP 실패 함수 구축과 O(n+m) 문자열 검색을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/kmp',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KMP 패턴 매칭 시각화',
    description: 'KMP 실패 함수 + 문자열 검색 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/kmp',
  },
}

export default function KMPPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'KMP 패턴 매칭 시각화',
    description: 'KMP 알고리즘 실패 함수 구축 및 문자열 패턴 매칭 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/kmp',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '실패 함수(failure function) 구축 시각화',
      '텍스트-패턴 정렬 및 이동 애니메이션',
      '일치/불일치 하이라이트',
      '매칭 위치 표시',
      '4가지 프리셋 텍스트-패턴 쌍',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <KMPVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
