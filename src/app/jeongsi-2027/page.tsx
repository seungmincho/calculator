import { Metadata } from 'next'
import Jeongsi2027 from '@/components/Jeongsi2027'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/jeongsi2027.json'

const TITLE = '2027 정시 일정 - 원서접수·가나다군 전형 기간 | 툴허브'
const DESC = '2027학년도 정시 원서접수(2027년 1월 4~7일), 가군 1월 11~17일·나군 18~24일·다군 25~31일, 합격자 발표·등록·충원·추가모집 일정과 D-day를 대교협 원문으로 정리했어요.'
const PAGE_URL = 'https://toolhub.ai.kr/jeongsi-2027/'
const OG = 'https://toolhub.ai.kr/og/jeongsi-2027.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '2027 정시 일정, 2027학년도 정시 원서접수, 정시 원서접수 기간, 가나다군 전형 기간, 정시 합격자 발표, 정시 등록 기간, 정시 충원, 2027 추가모집, 수능 성적 발표일, 정시 원서 몇 장, 수시 합격 정시 지원',
  openGraph: {
    title: TITLE,
    description: '2027학년도 정시 원서접수·가나다군·합격 발표·등록·추가모집 일정과 오늘 기준 D-day',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '2027학년도 정시 일정' }],
  },
  twitter: { card: 'summary_large_image', title: '2027 정시 일정 | 툴허브', description: '정시 원서접수·가나다군·합격 발표·추가모집 D-day', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

const faqs = messages.jeongsi2027.guide.faq.items

export default function Jeongsi2027Page() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '2027학년도 정시 일정',
    description: '대교협 2027학년도 대입전형 일정(수시 합격 발표·등록·충원, 정시 원서접수, 가·나·다군 전형, 합격자 발표·등록·충원, 추가모집)과 수능 시험일·성적 통지일을 오늘 기준 진행 단계와 D-day로 보여 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['오늘 기준 진행 단계와 다음 일정 D-day', '수능부터 추가모집까지 15개 일정 타임라인', '일정별·전체 캘린더(.ics) 추가, 3일 전 알림', '가·나·다군 지원 횟수·수시 합격자 지원 제한·이중 등록 금지 요약', '대교협·평가원 원문 근거'],
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
            <Jeongsi2027 />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
