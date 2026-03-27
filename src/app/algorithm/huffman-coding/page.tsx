import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import HuffmanCodingVisualizer from '@/components/algorithm/visualizers/HuffmanCodingVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '허프만 코딩 시각화 - 탐욕 알고리즘 데이터 압축 | 툴허브',
  description: '허프만 코딩(Huffman Coding) 알고리즘을 시각화합니다. 문자 빈도 분석, 최소 힙 기반 트리 구축, 최적 접두사 코드 생성, 압축률 비교를 단계별 애니메이션으로 학습하세요.',
  keywords: '허프만 코딩, Huffman Coding, 데이터 압축, 탐욕 알고리즘, 접두사 코드, 알고리즘 시각화',
  openGraph: {
    title: '허프만 코딩 시각화 | 툴허브',
    description: '허프만 트리 구축과 최적 접두사 코드 생성을 단계별로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/huffman-coding',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '허프만 코딩 시각화',
    description: '탐욕 알고리즘 기반 데이터 압축 원리 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/huffman-coding',
  },
}

export default function HuffmanCodingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '허프만 코딩 시각화',
    description: '허프만 코딩 알고리즘 트리 구축 및 최적 접두사 코드 생성 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/huffman-coding',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '문자 빈도 분석 및 최소 힙 시각화',
      '허프만 트리 구축 단계별 애니메이션',
      '0/1 간선 라벨 및 코드 테이블',
      '원본 대비 압축률 표시',
      '4가지 프리셋 텍스트',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <HuffmanCodingVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
