import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import LCSVisualizer from '@/components/algorithm/visualizers/LCSVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'LCS 시각화 - 최장 공통 부분수열 DP | 툴허브',
  description: 'LCS(Longest Common Subsequence) 알고리즘을 2D DP 테이블로 시각화합니다. 두 문자열 비교, 셀 계산, 화살표 방향, 역추적 경로를 단계별 애니메이션으로 배우세요.',
  keywords: 'LCS, 최장 공통 부분수열, DP, 동적 프로그래밍, 문자열 비교, 알고리즘 시각화',
  openGraph: {
    title: 'LCS 시각화 | 툴허브',
    description: '최장 공통 부분수열 DP 테이블과 역추적을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/lcs',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LCS 시각화',
    description: '최장 공통 부분수열 DP 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/lcs',
  },
}

export default function LCSPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LCS 시각화',
    description: 'LCS(최장 공통 부분수열) DP 테이블 계산 및 역추적 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/lcs',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2D DP 테이블 문자 비교 시각화',
      '일치/불일치 셀 하이라이트',
      '화살표 방향 표시',
      '역추적 경로 및 LCS 문자열 구성',
      '4가지 프리셋 문자열 쌍',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <LCSVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
