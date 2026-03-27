import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import EditDistanceVisualizer from '@/components/algorithm/visualizers/EditDistanceVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '편집 거리 시각화 - Levenshtein Distance DP | 툴허브',
  description:
    '두 문자열 간 편집 거리(Levenshtein Distance)를 DP 테이블로 단계별 학습하세요. 삽입, 삭제, 치환 연산의 최소 횟수를 인터랙티브하게 시각화합니다.',
  keywords: '편집 거리, Levenshtein Distance, Edit Distance, 동적 프로그래밍, DP, 문자열 유사도, 알고리즘 시각화',
  openGraph: {
    title: '편집 거리(Levenshtein) 시각화 | 툴허브',
    description: '두 문자열 간 최소 편집 연산을 DP 테이블로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/edit-distance',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '편집 거리 시각화',
    description: 'Levenshtein Distance DP 알고리즘 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/edit-distance',
  },
}

export default function EditDistancePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '편집 거리(Levenshtein Distance) 시각화',
    description: '두 문자열 간 최소 편집 연산(삽입, 삭제, 치환)을 DP 테이블로 단계별 시각화하여 학습하는 도구',
    url: 'https://toolhub.ai.kr/algorithm/edit-distance',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'DP 테이블 셀별 단계 시각화',
      '역추적 경로로 편집 연산 확인',
      '삽입/삭제/치환/일치 색상 구분',
      '다양한 문자열 프리셋',
      '코드 하이라이트 연동',
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
            <EditDistanceVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
