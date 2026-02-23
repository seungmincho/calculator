import { Metadata } from 'next'
import { Suspense } from 'react'
import GanttChart from '@/components/GanttChart'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '간트 차트 생성기 - 프로젝트 일정 시각화 | 툴허브',
  description: '프로젝트 일정을 간트 차트로 시각화하세요. 작업 추가, 진행률 관리, 카테고리별 색상 구분. PNG 이미지, CSV, JSON으로 내보내기 가능합니다.',
  keywords: '간트 차트, 간트차트 만들기, 프로젝트 관리, 일정 관리, 프로젝트 타임라인, 간트 차트 생성기, 무료 간트 차트',
  openGraph: {
    title: '간트 차트 생성기 | 툴허브',
    description: '프로젝트 일정을 간트 차트로 시각화하고 PNG/CSV/JSON으로 내보내세요.',
    url: 'https://toolhub.ai.kr/gantt-chart',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '간트 차트 생성기',
    description: '프로젝트 일정 시각화 및 진행률 관리',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/gantt-chart',
  },
}

export default function GanttChartPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '간트 차트 생성기',
    description: '프로젝트 일정을 간트 차트로 시각화합니다. 작업 관리, 진행률 추적, 내보내기 지원.',
    url: 'https://toolhub.ai.kr/gantt-chart',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['간트 차트 시각화', '작업 진행률 관리', '카테고리별 색상', 'PNG/CSV/JSON 내보내기']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <GanttChart />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
