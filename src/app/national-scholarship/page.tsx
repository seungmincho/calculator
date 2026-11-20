import { Metadata } from 'next'
import NationalScholarship from '@/components/NationalScholarship'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/nationalScholarship.json'

const TITLE = '국가장학금 계산기 2027 - 학자금 지원구간 가~마 구간·소득인정액 | 툴허브'
const DESC = '2027학년도 1학기 국가장학금 학자금 지원구간을 가구 소득·재산으로 추정해요. 가 구간(기준중위소득 70% 이하) 연 600만원, 나 구간(130%) 440만원, 다 구간(200%) 360만원, 라 구간(300%) 100만원, 다자녀·기초·차상위까지. 1차 신청 11월 24일~1월 7일.'
const PAGE_URL = 'https://toolhub.ai.kr/national-scholarship/'
const OG = 'https://toolhub.ai.kr/og/national-scholarship.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '국가장학금 계산기, 학자금 지원구간 계산기, 국가장학금 소득분위, 국가장학금 구간, 2027 국가장학금, 소득인정액 계산, 국가장학금 가구간, 국가장학금 지원금액, 다자녀 국가장학금, 학자금 지원구간 경곗값, 기준중위소득, 국가장학금 신청기간',
  openGraph: {
    title: TITLE,
    description: '소득·재산으로 2027 학자금 지원구간(가~마)과 국가장학금 Ⅰ유형·다자녀 예상 금액, 등록금 실부담 계산',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '국가장학금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '국가장학금 계산기 2027 | 툴허브', description: '학자금 지원구간 가~마 추정과 국가장학금 예상 금액', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function NationalScholarshipPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '국가장학금 계산기 · 학자금 지원구간',
    description: '한국장학재단 소득인정액 산정방식(소득평가액 + 재산의 소득환산액 − 형제·자매 공제)으로 2027학년도 1학기 학자금 지원구간(가~마)을 추정하고 국가장학금 Ⅰ유형·다자녀 국가장학금 예상 금액과 등록금 실부담을 계산하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '부모(배우자)·학생 소득과 일반재산·금융재산·자동차·부채로 월 소득인정액 추정',
      '2027 개편 학자금 지원구간 가~마 판정과 기준중위소득 대비 비율',
      '다음 구간 경곗값까지 남은 금액',
      '국가장학금 Ⅰ유형·다자녀(첫째·둘째, 셋째 이상) 학기·연간 금액',
      '학기 등록금 대비 실부담',
      '구간을 이미 알면 바로 금액 확인, 링크로 공유',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.nationalScholarship.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <NationalScholarship />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
