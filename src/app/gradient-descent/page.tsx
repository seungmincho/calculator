import { Metadata } from 'next'
import { Suspense } from 'react'
import GradientDescentVisualizer from '@/components/GradientDescentVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import Breadcrumb from '@/components/Breadcrumb'

export const metadata: Metadata = {
  title: '경사하강법 시각화 - 2D/3D 손실 함수 최적화 과정 | 툴허브',
  description: '경사하강법(Gradient Descent)의 최적화 과정을 2D 등고선 위에서 인터랙티브하게 시각화합니다. SGD, 모멘텀, Adam, RMSProp 옵티마이저를 비교하고 학습률의 영향을 직접 확인하세요.',
  keywords: '경사하강법, gradient descent, 손실 함수, 최적화, SGD, 모멘텀, Adam, 학습률, 머신러닝',
  openGraph: {
    title: '경사하강법 시각화 | 툴허브',
    description: '손실 함수 위에서 최적점을 찾아가는 경사하강법을 인터랙티브하게 학습',
    url: 'https://toolhub.ai.kr/gradient-descent',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '경사하강법 시각화 - 최적화 알고리즘 비교',
    description: 'SGD, Momentum, Adam, RMSProp을 2D 등고선 위에서 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/gradient-descent/',
  },
}

export default function GradientDescentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '경사하강법 시각화',
    description: '2D 손실 함수 위에서 경사하강법 최적화 과정을 인터랙티브하게 시각화하는 교육 도구',
    url: 'https://toolhub.ai.kr/gradient-descent',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2D 등고선 손실 함수 시각화',
      '4가지 옵티마이저 비교 (SGD, Momentum, Adam, RMSProp)',
      '클릭으로 시작점 지정',
      '학습률 슬라이더',
      '비교 모드 (동시 실행)',
      '손실 히스토리 차트',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <GradientDescentVisualizer />
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
