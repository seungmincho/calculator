import { Metadata } from 'next'
import YearCalendar from '@/components/YearCalendar'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/yearCalendar.json'

// 해마다 이 폴더를 복사해 YEAR·URL·문구만 바꾼다(24절기는 src/utils/yearCalendar.ts 에 그 해 천문연 자료 추가)
const YEAR = 2027
const PAGE_URL = `https://toolhub.ai.kr/calendar-${YEAR}/`
const TITLE = '2027년 달력 - 공휴일·음력·24절기, 인쇄용 | 툴허브' // generate-og 가 소스 문자열을 그대로 읽으므로 리터럴
const DESC = `${YEAR}년 달력을 공휴일·대체공휴일, 음력, 24절기와 함께 보고 A4로 인쇄하세요. 공휴일 24일·대체공휴일 7일·3일 이상 연휴 10번, 설날·추석 연휴, 복날까지 한눈에. 공휴일은 캘린더(.ics)로 한 번에 저장할 수 있어요.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: `${YEAR} 달력, ${YEAR}년 달력, ${YEAR} 달력 인쇄, ${YEAR}년 공휴일, ${YEAR} 공휴일, ${YEAR} 대체공휴일, ${YEAR} 24절기, ${YEAR} 음력 달력, ${YEAR} 설날, ${YEAR} 추석, ${YEAR} 빨간날`,
  openGraph: {
    title: TITLE,
    description: '2027년 공휴일·음력·24절기 달력, A4 인쇄와 캘린더 저장',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: `https://toolhub.ai.kr/og/calendar-${YEAR}.png`, width: 1200, height: 630, alt: `${YEAR}년 달력` }],
  },
  twitter: { card: 'summary_large_image', title: `${YEAR}년 달력 | 툴허브`, description: `${YEAR}년 공휴일·음력·24절기 달력`, images: [`https://toolhub.ai.kr/og/calendar-${YEAR}.png`] },
  alternates: { canonical: PAGE_URL },
}

const faqs = messages.yearCalendar.guide.faq.items

export default function Calendar2027Page() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: `${YEAR}년 달력`,
    description: `${YEAR}년 공휴일·대체공휴일·음력·24절기를 담은 달력과 인쇄·캘린더 저장 도구.`,
    url: PAGE_URL,
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['공휴일·대체공휴일 표시', '날짜별 음력', '24절기 날짜·시각', '명절·복날', '3일 이상 연휴 목록', 'A4 연간 1장·월별 12장 인쇄', '공휴일 캘린더(.ics) 저장'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <YearCalendar year={YEAR} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
