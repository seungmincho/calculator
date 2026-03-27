import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import BloomFilterVisualizer from '@/components/algorithm/visualizers/BloomFilterVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '블룸 필터 시각화 - 확률적 자료구조 | 툴허브',
  description:
    '블룸 필터의 삽입·검색 과정과 거짓 양성(false positive)을 인터랙티브하게 학습하세요. 비트 배열, 해시 함수, 채움률과 거짓 양성률의 관계를 단계별로 시각화합니다.',
  keywords: '블룸 필터, Bloom Filter, 확률적 자료구조, 해시 함수, false positive, 알고리즘 시각화',
  openGraph: {
    title: '블룸 필터 시각화 | 툴허브',
    description: '블룸 필터의 삽입·검색과 거짓 양성을 시각적으로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/bloom-filter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '블룸 필터 시각화',
    description: '확률적 자료구조 블룸 필터 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/bloom-filter',
  },
}

export default function BloomFilterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '블룸 필터 시각화',
    description: '블룸 필터의 삽입·검색 과정과 거짓 양성을 인터랙티브하게 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/bloom-filter',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '비트 배열 시각화',
      '해시 함수 위치 표시',
      '삽입/검색 단계별 실행',
      '거짓 양성 시연',
      '채움률 및 FP률 통계',
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
            <BloomFilterVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
