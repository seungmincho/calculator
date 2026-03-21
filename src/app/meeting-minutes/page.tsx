import { Metadata } from 'next'
import { Suspense } from 'react'
import MeetingMinutes from '@/components/MeetingMinutes'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '회의록 작성기 - 회의록 템플릿 & 내보내기 | 툴허브',
  description: '회의록을 쉽게 작성하세요. 5가지 회의 템플릿, 참석자 관리, 안건·논의·결정사항·액션아이템 기록, Markdown/HTML 내보내기를 지원합니다.',
  keywords: '회의록, 회의록 양식, 회의록 템플릿, 회의 기록, 미팅 노트, 액션아이템, 회의록 작성',
  openGraph: {
    title: '회의록 작성기 | 툴허브',
    description: '5가지 템플릿으로 회의록을 쉽게 작성하고 내보내세요.',
    url: 'https://toolhub.ai.kr/meeting-minutes',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '회의록 작성기',
    description: '회의록 템플릿 & 내보내기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/meeting-minutes/',
  },
}

export default function MeetingMinutesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '회의록 작성기',
    description: '회의록을 쉽게 작성하고 Markdown, HTML로 내보내는 도구. 5가지 회의 템플릿 제공.',
    url: 'https://toolhub.ai.kr/meeting-minutes',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['5가지 회의 템플릿', '참석자 관리', '액션아이템 추적', 'Markdown 내보내기', 'HTML 내보내기']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <MeetingMinutes />
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
              회의록 작성기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              회의록 작성기는 5가지 회의 유형별 템플릿(정기회의, 브레인스토밍, 프로젝트 킥오프, 1:1 미팅, 교육)을 제공하여 체계적인 회의록을 손쉽게 작성할 수 있는 온라인 도구입니다. 참석자 관리, 안건별 논의 내용·결정사항·액션아이템 기록, Markdown/HTML 내보내기를 지원해 회의 결과를 팀과 빠르게 공유할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              회의록 작성기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>템플릿 선택:</strong> 회의 성격에 맞는 템플릿을 선택하면 필요한 항목이 자동으로 구성되어 빠르게 시작할 수 있습니다.</li>
              <li><strong>액션아이템 추적:</strong> 담당자, 기한을 명확히 기록해 후속 조치 누락을 방지하고 책임 있는 실행을 유도하세요.</li>
              <li><strong>Markdown 내보내기:</strong> 작성한 회의록을 Markdown으로 내보내 GitHub, Notion, Confluence 등에 바로 붙여넣기하세요.</li>
              <li><strong>정기 회의 활용:</strong> 주간 팀 미팅, 월간 보고회 등에 동일 템플릿을 반복 사용해 일관된 회의 문화를 만드세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
