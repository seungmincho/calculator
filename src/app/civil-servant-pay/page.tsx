import { Metadata } from 'next'
import CivilServantPay from '@/components/CivilServantPay'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/civilServantPay.json'

const TITLE = '2027 공무원 봉급표 - 9급 1호봉 실수령액 | 툴허브'
const DESC = '2026 공무원 봉급표(일반직·경찰·소방·교원)를 직급·호봉별로 보고, 2027 예상 봉급(정부안 3.9%)과 공무원연금 기여금 9%·건강보험·소득세를 뺀 월 실수령액을 계산해요. 9급 1호봉 봉급 2,133,000원부터 9~5급 초임 비교까지.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '2027 공무원 봉급표, 공무원 봉급표, 공무원 월급, 9급 1호봉 실수령액, 공무원 실수령액 계산기, 2027 공무원 월급 인상, 공무원 호봉표, 경찰 봉급표, 소방 봉급표, 교원 봉급표, 교사 호봉 월급, 공무원연금 기여금',
  openGraph: {
    title: TITLE,
    description: '2026 공무원 봉급표와 2027 예상(정부안 3.9%), 직급·호봉별 월 실수령액',
    url: 'https://toolhub.ai.kr/civil-servant-pay/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/civil-servant-pay.png', width: 1200, height: 630, alt: '2027 공무원 봉급표·실수령액' }],
  },
  twitter: { card: 'summary_large_image', title: '2027 공무원 봉급표·실수령액 | 툴허브', description: '직급·호봉별 봉급과 공제 후 월 실수령액', images: ['https://toolhub.ai.kr/og/civil-servant-pay.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/civil-servant-pay/' },
}

const faqs = messages.civilServantPay.guide.faq.items

export default function CivilServantPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '2027 공무원 봉급표·실수령액',
    description: '공무원보수규정 2026년 봉급표(일반직 별표 3·경찰·소방 별표 10·교원 별표 11)로 직급·호봉별 봉급과 월 실수령액을 계산하고, 2027년 정부안 보수 인상률 3.9%를 적용한 예상 봉급을 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/civil-servant-pay/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026 일반직·경찰·소방·교원 봉급표 전체', '2027 예상 봉급(정부안 3.9% 일률 적용 추정)', '공무원연금 기여금 9%·건강보험·장기요양·소득세·지방소득세 공제', '정액급식비(비과세)·직급보조비 포함 여부 선택', '호봉별 봉급표와 9~5급 초임 비교', '조건을 담은 공유 링크'],
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
            <CivilServantPay />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
