import { Metadata } from 'next'
import { Suspense } from 'react'
import KanbanBoard from '@/components/KanbanBoard'
import I18nWrapper from '@/components/I18nWrapper'

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
    canonical: 'https://toolhub.ai.kr/kanban-board',
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
              <KanbanBoard />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
