import { Metadata } from 'next'
import { Suspense } from 'react'
import GanttChart from '@/components/GanttChart'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/gantt-chart/',
  },
}

export default function GanttChartPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '간트 차트란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '프로젝트 일정을 막대 형태로 시각화하는 도구입니다. 작업의 시작일, 종료일, 진행률을 한눈에 파악할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '작성한 간트 차트를 저장할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 이미지(PNG)로 내보내기가 가능하며, 브라우저 로컬 저장소에 자동 저장됩니다.',
        },
      },
    ],
  }

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <GanttChart />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            간트 차트 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            간트 차트 생성기는 프로젝트 일정을 시각적 타임라인으로 표현하는 무료 온라인 프로젝트 관리 도구입니다. 작업 추가·진행률 설정·카테고리별 색상 구분이 가능하며, 완성된 차트를 PNG 이미지·CSV·JSON으로 내보낼 수 있어 팀 공유나 보고서 작성에 바로 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            간트 차트 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>마일스톤 표시:</strong> 중요한 납기일이나 검토 시점을 별도 카테고리로 구분하여 간트 차트에 표시하면 전체 일정 흐름을 한눈에 파악할 수 있습니다.</li>
            <li><strong>진행률 업데이트:</strong> 주간 회의 전마다 각 작업의 진행률을 갱신하고 PNG로 내보내면 보고용 자료를 빠르게 준비할 수 있습니다.</li>
            <li><strong>JSON 백업:</strong> 작업 데이터를 JSON으로 저장해 두면 언제든지 불러와 차트를 재편집할 수 있습니다.</li>
            <li><strong>색상 코딩:</strong> 개발·디자인·QA 등 파트별로 색상을 다르게 지정하면 여러 팀의 일정 충돌을 즉시 파악할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
