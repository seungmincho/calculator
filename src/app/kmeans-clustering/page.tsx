import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import KmeansClusteringVisualizer from '@/components/KmeansClusteringVisualizer'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'K-means 클러스터링 시각화 - 군집 분석 인터랙티브 학습 | 툴허브',
  description: 'K-means 클러스터링 알고리즘을 단계별 애니메이션으로 배우세요. 데이터 포인트 추가, 센트로이드 이동, SSE 수렴 과정을 실시간으로 확인합니다. 엘보 방법, 비볼록 한계까지 체험.',
  keywords: 'K-means, 클러스터링, 군집 분석, 비지도 학습, 머신러닝, k평균, centroid, SSE, 엘보 방법',
  openGraph: {
    title: 'K-means 클러스터링 시각화 | 툴허브',
    description: 'K-means 군집 분석을 인터랙티브 애니메이션으로 학습하세요.',
    url: 'https://toolhub.ai.kr/kmeans-clustering',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'K-means 클러스터링 시각화',
    description: '군집 분석 알고리즘을 단계별 애니메이션으로 배우기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/kmeans-clustering/',
  },
}

export default function KmeansClusteringPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'K-means 클러스터링 시각화',
    description: 'K-means 클러스터링 알고리즘을 단계별 애니메이션으로 학습하는 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/kmeans-clustering',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'K-means 단계별 애니메이션',
      '데이터 포인트 클릭 추가',
      '프리셋 데이터 (원형/겹침/달 모양)',
      'SSE 수렴 그래프',
      '센트로이드 K=2~8 조절',
      'Voronoi 경계선 표시',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'K-means 클러스터링이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'K-means는 데이터를 K개의 군집으로 나누는 비지도 학습 알고리즘입니다. 각 데이터 포인트를 가장 가까운 센트로이드(중심점)에 할당하고, 센트로이드를 재계산하는 과정을 수렴할 때까지 반복합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'K값은 어떻게 정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '엘보 방법(Elbow Method)이 가장 널리 쓰입니다. K를 1부터 늘려가며 SSE(Sum of Squared Errors)를 그래프로 그리면, 감소폭이 급격히 줄어드는 "팔꿈치" 지점이 최적의 K입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'K-means의 한계는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'K-means는 볼록(convex) 형태의 군집에 최적화되어 있어, 달 모양이나 고리 모양 같은 비볼록 군집을 제대로 분류하지 못합니다. 또한 초기 센트로이드 위치에 따라 결과가 달라질 수 있으며, K를 사전에 지정해야 합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <KmeansClusteringVisualizer />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
