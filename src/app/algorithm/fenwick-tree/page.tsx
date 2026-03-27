import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import FenwickTreeVisualizer from '@/components/algorithm/visualizers/FenwickTreeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '펜윅 트리 (BIT) 시각화 - 누적합 O(log n) 업데이트·쿼리 | 툴허브',
  description: '펜윅 트리(Binary Indexed Tree)의 점 업데이트·누적합 쿼리·구간합을 lowbit 연산과 함께 인터랙티브 시각화로 학습하세요.',
  keywords: '펜윅 트리, BIT, Binary Indexed Tree, 누적합, lowbit, 알고리즘 시각화, 자료구조',
  openGraph: {
    title: '펜윅 트리 (BIT) 시각화 | 툴허브',
    description: '펜윅 트리 업데이트·누적합 쿼리를 lowbit 연산과 함께 단계별 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/fenwick-tree',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '펜윅 트리 (BIT) 시각화', description: '누적합 업데이트·쿼리 O(log n) lowbit 단계별 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/fenwick-tree' },
}

export default function FenwickTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '펜윅 트리 (BIT) 시각화', description: '펜윅 트리 점 업데이트·누적합 쿼리 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/fenwick-tree',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['점 업데이트 lowbit 경로 시각화', '누적합 쿼리 과정 추적', '이진 표현 실시간 표시', '담당 구간 브래킷 표시', '코드 하이라이팅'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <FenwickTreeVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
