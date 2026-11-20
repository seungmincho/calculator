import { Metadata } from 'next'
import DailySchedule from '@/components/DailySchedule'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/dailySchedule.json'

const TITLE = '생활계획표 만들기 - 방학 생활계획표 원형 24시간 | 툴허브'
const DESC = '초등학생·중고등학생·수험생·대학생·직장인 예시에서 시작해 시간만 고치면 원형 24시간 생활계획표가 완성돼요. 자정을 넘는 수면, 겹치는 일정·빈 시간 확인, 항목별 시간 합계, 이미지 저장과 A4 인쇄, 링크 공유까지 무료로.'
const PAGE_URL = 'https://toolhub.ai.kr/daily-schedule/'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '생활계획표, 생활계획표 만들기, 방학 생활계획표, 겨울방학 생활계획표, 원형 생활계획표, 하루 일과표, 생활계획표 양식, 수험생 생활계획표',
  openGraph: {
    title: TITLE,
    description: '예시를 고르고 시간만 고치면 원형 24시간 생활계획표 완성. 이미지 저장·A4 인쇄·링크 공유',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/daily-schedule.png', width: 1200, height: 630, alt: '생활계획표 만들기' }],
  },
  twitter: { card: 'summary_large_image', title: '생활계획표 만들기 | 툴허브', description: '방학 생활계획표를 원형 24시간으로 만들고 이미지·인쇄로 저장', images: ['https://toolhub.ai.kr/og/daily-schedule.png'] },
  alternates: { canonical: PAGE_URL },
}

export default function DailySchedulePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '생활계획표 만들기',
    description: '하루 24시간을 원형 차트로 그리는 생활계획표 만들기 도구. 초등학생·중고등학생 방학, 수험생, 대학생, 직장인 예시에서 시작해 일정 이름과 시각을 고치고, 겹침·빈 시간·항목별 합계를 확인한 뒤 이미지 저장·인쇄·링크로 공유한다.',
    url: PAGE_URL,
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '원형 24시간 생활계획표(0시 위, 시계 방향)',
      '초등학생·중고등학생 방학, 수험생, 대학생, 직장인 예시',
      '10분 단위 시각, 자정을 넘는 일정(예: 23:00~07:00)',
      '겹치는 일정 안내와 빈 시간 표시',
      '항목별 시간 합계와 24시간 확인',
      'PNG 이미지 저장, A4 인쇄, 링크 공유, 브라우저 자동 저장',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.dailySchedule.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DailySchedule />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
