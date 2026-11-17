import { Metadata } from 'next'
import KanbanBoard from '@/components/KanbanBoard'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '칸반보드 - 프로젝트 관리 & 할일 관리 | 툴허브',
  description: '회의록에서 고른 할 일을 칸반 카드로 가져오세요. 기존 카드를 보존하면서 담당자·기한을 관리하고, 드래그 또는 모바일 열 선택으로 작업을 이동할 수 있습니다. JSON 백업을 지원합니다.',
  keywords: '칸반보드, 프로젝트 관리, 할일 관리, 태스크 관리, 드래그앤드롭, 업무 관리, TODO, 작업 관리',
  openGraph: {
    title: '칸반보드 - 프로젝트 관리 | 툴허브',
    description: '회의록 할 일을 칸반 카드로 가져와 담당자·기한·진행 상태를 관리하세요.',
    url: 'https://toolhub.ai.kr/kanban-board/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/kanban-board.png', width: 1200, height: 630, alt: '칸반보드' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '칸반보드',
    description: '드래그 앤 드롭 프로젝트 관리 도구',
    images: ['https://toolhub.ai.kr/og/kanban-board.png'],
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
    url: 'https://toolhub.ai.kr/kanban-board/',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['회의록 할 일 가져오기·중복 방지', '담당자 편집·검색', '드래그 앤 드롭·모바일 열 이동', '우선순위 관리', '마감일 추적', '컬럼 커스터마이징', 'JSON 내보내기/가져오기']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <KanbanBoard />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            칸반보드란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            칸반보드(Kanban Board)는 작업을 시각적인 카드로 표현하고 단계별 컬럼(할 일·진행 중·완료 등)으로 이동시켜 프로젝트 진행 상황을 한눈에 파악하는 프로젝트 관리 방법론 도구입니다. 드래그 앤 드롭으로 직관적으로 작업 상태를 변경하고, 우선순위 설정과 마감일 추적으로 개인 업무부터 팀 프로젝트까지 효율적으로 관리할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            칸반보드 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>WIP 제한 설정:</strong> '진행 중' 컬럼의 카드 수를 3~5개로 제한하면(WIP Limit) 멀티태스킹을 줄이고 집중력을 높일 수 있습니다.</li>
            <li><strong>우선순위 색상 코딩:</strong> 긴급·높음·보통·낮음 우선순위를 색상으로 구분하면 중요한 작업을 즉시 식별할 수 있습니다.</li>
            <li><strong>마감일 추적:</strong> 카드에 마감일을 설정하면 기한이 임박한 작업을 시각적으로 경고하여 일정 관리가 수월해집니다.</li>
            <li><strong>회의록 연결:</strong> 선택한 할 일을 회의 전용 열 또는 기존 열로 복사할 수 있습니다. 가져온 뒤의 변경은 원래 회의록에 자동 반영되지 않습니다.</li>
            <li><strong>JSON 내보내기·가져오기:</strong> 작업 데이터를 JSON으로 내보내 백업하거나 다른 도구와 데이터를 교환할 수 있습니다.</li>
            <li><strong>컬럼 커스터마이징:</strong> 상태별 열 외에 '검토 중', '테스트' 등 팀 워크플로에 맞는 컬럼을 자유롭게 추가하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
