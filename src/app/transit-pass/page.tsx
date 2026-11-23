import { Metadata } from 'next'
import TransitPass from '@/components/TransitPass'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/transitPass.json'

const TITLE = 'K패스 환급 계산기 - 모두의카드·기후동행카드 비교 | 툴허브'
const DESC = '월 교통비와 이용 횟수로 K-패스 기본형(20~53.3%)과 모두의카드 일반형·플러스형(기준금액 초과분 전액) 환급액을 비교해요. 지역·유형별 기준금액, 월 15회 조건, 정액형이 유리해지는 금액, 기후동행카드 30일권 종료 후 달라진 점까지 정리했어요.'
const PAGE_URL = 'https://toolhub.ai.kr/transit-pass/'
const OG = 'https://toolhub.ai.kr/og/transit-pass.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: 'K패스 환급 계산, K패스 환급 계산기, 모두의카드 계산기, 모두의카드 환급, 모두의카드 일반형 플러스형, 기후동행카드 K패스 비교, 기후동행패스, 대중교통비 환급, K-패스 기준금액, 교통비 환급 계산',
  openGraph: {
    title: TITLE,
    description: '내 교통비로 K-패스 기본형·모두의카드 일반형·플러스형 중 어떤 환급이 적용되는지와 월 환급액 계산',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'K-패스·모두의카드·기후동행카드 환급 비교' }],
  },
  twitter: { card: 'summary_large_image', title: 'K패스·모두의카드 환급 계산기 | 툴허브', description: '월 교통비로 K-패스·모두의카드 환급액 비교', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function TransitPassPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '대중교통 환급 비교: K-패스·모두의카드·기후동행',
    description: '월 대중교통비·이용 횟수·지역·유형으로 K-패스 기본형과 모두의카드 일반형·플러스형 환급액을 모두의카드 누리집 계산 방법대로 비교하고, 자동 적용되는 방식과 정액형이 유리해지는 금액을 알려 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'K-패스 기본형·모두의카드 일반형·플러스형 환급액 비교',
      '지역(수도권·일반 지방권·우대·특별지원지역)·유형별 기준금액',
      '1회 3천원 이상 이동(광역버스·GTX) 반영',
      '시차 출퇴근 시간대 추가 환급',
      '월 15회 조건과 정액형 손익분기 금액',
      '기후동행카드 30일권 종료와 기후동행패스 안내',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.transitPass.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <TransitPass />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
