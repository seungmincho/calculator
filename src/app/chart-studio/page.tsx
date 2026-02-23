import { Metadata } from 'next'
import { Suspense } from 'react'
import ChartStudio from '@/components/ChartStudio'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '차트 스튜디오 - 데이터 시각화 & 차트 코드 생성기 | 툴허브',
  description: 'JSON, CSV 데이터를 붙여넣으면 바·라인·파이·산점도·레이더 차트를 즉시 생성합니다. ECharts 코드와 React 컴포넌트 코드를 복사하여 프로젝트에 바로 사용하세요.',
  keywords: '차트 생성기, 데이터 시각화, ECharts, 그래프 만들기, JSON 차트, CSV 차트, 차트 코드 생성, 데이터 분석',
  openGraph: {
    title: '차트 스튜디오 - 데이터 시각화 | 툴허브',
    description: 'JSON/CSV 데이터로 차트를 즉시 생성하고 ECharts 코드를 복사하세요.',
    url: 'https://toolhub.ai.kr/chart-studio',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '차트 스튜디오',
    description: '데이터 시각화 & 차트 코드 생성기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/chart-studio',
  },
}

export default function ChartStudioPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '차트 스튜디오',
    description: 'JSON, CSV 데이터를 차트로 시각화하고 ECharts 코드를 자동 생성합니다.',
    url: 'https://toolhub.ai.kr/chart-studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JSON/CSV 데이터 파싱', '6가지 차트 타입', 'ECharts 코드 생성', 'React 컴포넌트 코드', 'PNG 다운로드']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ChartStudio />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
