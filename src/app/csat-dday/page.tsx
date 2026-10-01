import { Metadata } from 'next'
import CsatDday from '@/components/CsatDday'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '수능 D-day 2027 - 시간표·준비물·가채점표 | 툴허브',
  description: '2027학년도 수능(2026년 11월 19일 목) D-day 카운트다운과 교시별 시간표, 준비물·반입금지 물품 체크리스트, 인쇄용 가채점표, 성적 발표·정시 일정을 한곳에서 확인하세요.',
  keywords: '수능 디데이, 수능 D-day, 2027 수능, 수능 시간표, 수능 준비물, 수능 반입금지 물품, 수능 가채점표, 수능 날짜, 수능 성적 발표일, 정시 원서접수',
  openGraph: {
    title: '수능 D-day 2027 - 시간표·준비물·가채점표 | 툴허브',
    description: '2027 수능 카운트다운, 교시별 시간표, 준비물 체크리스트, 가채점표',
    url: 'https://toolhub.ai.kr/csat-dday/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/csat-dday.png', width: 1200, height: 630, alt: '수능 D-day 2027' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '수능 D-day 2027 | 툴허브',
    description: '2027 수능 카운트다운, 시간표, 준비물, 가채점표',
    images: ['https://toolhub.ai.kr/og/csat-dday.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/csat-dday/',
  },
}

export default function CsatDdayPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '수능 D-day · 시간표 · 준비물',
    description: '2027학년도 수능 D-day 카운트다운, 교시별 시간표, 준비물 체크리스트, 가채점표',
    url: 'https://toolhub.ai.kr/csat-dday',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['수능 D-day 실시간 카운트다운', '교시별 시간표·현재 교시 표시', '준비물·반입금지 물품 체크리스트', '인쇄용 가채점표', '응원 카드 공유', '성적 통지·정시 일정'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2027학년도 수능은 언제인가요?',
        acceptedAnswer: { '@type': 'Answer', text: '2027학년도 대학수학능력시험은 2026년 11월 19일(목)에 시행되며, 성적은 2026년 12월 11일(금)에 통지됩니다.' },
      },
      {
        '@type': 'Question',
        name: '수능 시간표는 어떻게 되나요?',
        acceptedAnswer: { '@type': 'Answer', text: '입실은 오전 8시 10분까지입니다. 1교시 국어 08:40~10:00, 2교시 수학 10:30~12:10, 점심 12:10~13:00, 3교시 영어 13:10~14:20, 4교시 한국사·탐구 14:50~16:37, 5교시 제2외국어/한문 17:05~17:45입니다.' },
      },
      {
        '@type': 'Question',
        name: '수능 정시 원서접수는 언제인가요?',
        acceptedAnswer: { '@type': 'Answer', text: '2027학년도 정시 원서접수는 2027년 1월 4일부터 7일 사이에 대학별로 3일 이상 진행됩니다. 정확한 기간은 지원 대학 모집요강을 확인하세요.' },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CsatDday />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
