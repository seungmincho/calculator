import { Metadata } from 'next'
import { Suspense } from 'react'
import KanbanBoard from '@/components/KanbanBoard'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '칸반보드 - 프로젝트 관리 & 할일 관리 | 툴허브',
  description: '드래그 앤 드롭으로 작업을 관리하세요. 칸반보드로 프로젝트 진행 상황을 시각적으로 추적하고, 우선순위 설정, 마감일 관리, JSON 내보내기를 지원합니다.',
  keywords: '칸반보드, 프로젝트 관리, 할일 관리, 태스크 관리, 드래그앤드롭, 업무 관리, TODO, 작업 관리',
  openGraph: {
    title: '칸반보드 - 프로젝트 관리 | 툴허브',
    description: '드래그 앤 드롭 칸반보드로 프로젝트를 관리하세요.',
    url: 'https://toolhub.ai.kr/kanban-board',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '칸반보드',
    description: '드래그 앤 드롭 프로젝트 관리 도구',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/kanban-board/',
  },
}

export default function KanbanBoardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '칸반보드',
    description: '드래그 앤 드롭으로 작업을 관리하는 칸반보드. 우선순위, 마감일, 컬럼 커스터마이징 지원.',
    url: 'https://toolhub.ai.kr/kanban-board',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['드래그 앤 드롭', '우선순위 관리', '마감일 추적', '컬럼 커스터마이징', 'JSON 내보내기/가져오기']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <KanbanBoard />
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
            칸반보드란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            칸반보드(Kanban Board)는 작업을 시각적인 카드로 표현하고 단계별 컬럼(할 일·진행 중·완료 등)으로 이동시켜 프로젝트 진행 상황을 한눈에 파악하는 프로젝트 관리 방법론 도구입니다. 드래그 앤 드롭으로 직관적으로 작업 상태를 변경하고, 우선순위 설정과 마감일 추적으로 개인 업무부터 팀 프로젝트까지 효율적으로 관리할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            칸반보드 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>WIP 제한 설정:</strong> '진행 중' 컬럼의 카드 수를 3~5개로 제한하면(WIP Limit) 멀티태스킹을 줄이고 집중력을 높일 수 있습니다.</li>
            <li><strong>우선순위 색상 코딩:</strong> 긴급·높음·보통·낮음 우선순위를 색상으로 구분하면 중요한 작업을 즉시 식별할 수 있습니다.</li>
            <li><strong>마감일 추적:</strong> 카드에 마감일을 설정하면 기한이 임박한 작업을 시각적으로 경고하여 일정 관리가 수월해집니다.</li>
            <li><strong>JSON 내보내기·가져오기:</strong> 작업 데이터를 JSON으로 내보내 백업하거나 다른 도구와 데이터를 교환할 수 있습니다.</li>
            <li><strong>컬럼 커스터마이징:</strong> 기본 3단계 외에 '검토 중', '테스트' 등 팀 워크플로에 맞는 컬럼을 자유롭게 추가하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
