import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmHub from '@/components/algorithm/AlgorithmHub'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '알고리즘 시각화 - 인터랙티브 알고리즘 교육 | 툴허브',
  description: '알고리즘을 인터랙티브 시각화로 직관적으로 이해하세요. SAT 충돌감지, 탐색, 정렬 등 핵심 알고리즘을 드래그하며 배울 수 있는 교육 도구입니다.',
  keywords: '알고리즘 시각화, SAT, 충돌감지, 알고리즘 교육, 인터랙티브, 프로그래밍 학습',
  openGraph: {
    title: '알고리즘 시각화 - 인터랙티브 교육 | 툴허브',
    description: '알고리즘을 인터랙티브 시각화로 직관적으로 이해하세요.',
    url: 'https://toolhub.ai.kr/algorithm',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '알고리즘 시각화 | 툴허브',
    description: '인터랙티브 알고리즘 교육 도구',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm',
  },
}

export default function AlgorithmPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '알고리즘 시각화',
    description: '알고리즘을 인터랙티브 시각화로 직관적으로 이해하는 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'SAT 충돌감지 시각화',
      '단계별 알고리즘 진행',
      '드래그 인터랙션',
      '2D/3D 전환',
      'TypeScript 코드 보기',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <AlgorithmHub />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
