import { Metadata } from 'next'
import { Suspense } from 'react'
import MeetingMinutes from '@/components/MeetingMinutes'
import I18nWrapper from '@/components/I18nWrapper'

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
    canonical: 'https://toolhub.ai.kr/meeting-minutes',
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
              <MeetingMinutes />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
