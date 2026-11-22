import { Metadata } from 'next'
import StudentLoanRepayment from '@/components/StudentLoanRepayment'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/studentLoanRepayment.json'

const TITLE = '학자금 대출 상환 계산기 - 취업 후 상환 의무상환액 | 툴허브'
const DESC = '연봉을 넣으면 취업 후 상환 학자금 의무상환액과 월 원천공제액, 완납 시점·총이자를 계산해요. 2026년 상환기준소득(총급여 3,037만 원)·금리 1.7% 기준이고, 일반 상환 월 납입액과 같은 조건으로 비교하며 매달 더 갚을 때 얼마나 앞당겨지는지도 보여 줘요.'
const PAGE_URL = 'https://toolhub.ai.kr/student-loan-repayment/'
const OG = 'https://toolhub.ai.kr/og/student-loan-repayment.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '학자금 대출 상환, 취업 후 상환 학자금, 의무상환액 계산, 학자금 대출 이자, 상환기준소득, 한국장학재단 상환, 학자금 대출 상환 계산기, 일반 상환 학자금, 학자금 원천공제',
  openGraph: {
    title: TITLE,
    description: '연봉으로 계산하는 취업 후 상환 학자금 의무상환액·월 원천공제액·완납 시점과 일반 상환 비교',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '학자금 대출 상환 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '학자금 대출 상환 계산기 | 툴허브', description: '취업 후 상환 의무상환액과 일반 상환 월 납입액·총이자 비교', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function StudentLoanRepaymentPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '학자금 대출 상환 계산기',
    description: '연봉·비과세·대출 잔액·금리로 취업 후 상환 학자금(ICL)의 의무상환액과 월 원천공제액, 완납 시점, 총이자를 「취업 후 학자금 상환 특별법」과 2026년 상환기준소득 기준으로 계산하고, 일반 상환 학자금의 원리금균등 월 납입액과 비교하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '의무상환액 = (소득금액 − 상환기준소득) × 20%(대학원 25%), 최소부담 36만 원',
      '총급여 − 근로소득공제로 소득금액 계산, 비과세 반영',
      '월 원천공제액(의무상환액 ÷ 12)과 공제 기간',
      '연도별 연봉·소득금액·의무상환액·이자·잔액 표와 잔액 그래프',
      '일반 상환 거치·원리금균등 월 납입액과 같은 조건 비교',
      '매달 자발적 상환 시 완납 단축 기간과 줄어드는 이자',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.studentLoanRepayment.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <StudentLoanRepayment />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
