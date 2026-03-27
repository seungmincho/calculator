import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import CoinChangeVisualizer from '@/components/algorithm/visualizers/CoinChangeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '동전 교환 시각화 - Coin Change DP | 툴허브',
  description: '동전 교환(Coin Change) 문제를 DP 배열 바 차트로 시각화합니다. 각 금액에 대한 최소 동전 수 계산 과정, 역추적, 그리디 비교를 단계별 애니메이션으로 배우세요.',
  keywords: '동전 교환, Coin Change, DP, 동적 프로그래밍, 거스름돈, 알고리즘 시각화',
  openGraph: {
    title: '동전 교환 시각화 | 툴허브',
    description: 'Coin Change DP 배열 계산과 역추적을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/coin-change',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '동전 교환 시각화',
    description: 'Coin Change DP 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/coin-change',
  },
}

export default function CoinChangePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '동전 교환 시각화',
    description: 'Coin Change DP 배열 계산 및 역추적 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/coin-change',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'DP 배열 바 차트 시각화',
      '동전 선택 과정 하이라이트',
      '역추적으로 최적 동전 조합 표시',
      '그리디 vs DP 결과 비교',
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
            <CoinChangeVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
