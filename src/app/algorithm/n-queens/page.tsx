import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import NQueensVisualizer from '@/components/algorithm/visualizers/NQueensVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'N-Queens 시각화 - 백트래킹 알고리즘 | 툴허브',
  description:
    'N-Queens 문제를 백트래킹으로 푸는 과정을 체스보드에서 시각적으로 학습하세요. 퀸 배치, 충돌 감지, 되돌아가기를 단계별로 관찰합니다.',
  keywords: 'N-Queens, 백트래킹, Backtracking, 체스, 퀸, 알고리즘 시각화',
  openGraph: {
    title: 'N-Queens 시각화 | 툴허브',
    description: '백트래킹으로 N-Queens를 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/n-queens',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'N-Queens 시각화',
    description: '백트래킹 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/n-queens',
  },
}

export default function NQueensPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'N-Queens 시각화',
    description: 'N-Queens 백트래킹 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/n-queens',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '4~12 크기 체스보드',
      '퀸 배치 및 충돌 시각화',
      '공격 가능 칸 빨간 오버레이',
      '백트래킹 단계별 관찰',
      '코드 하이라이팅',
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
            <NQueensVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
