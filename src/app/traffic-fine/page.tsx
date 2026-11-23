import { Metadata } from 'next'
import TrafficFine from '@/components/TrafficFine'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/trafficFine.json'

const TITLE = '교통 범칙금·과태료·벌점 계산기 - 속도위반·신호위반·어린이보호구역 | 툴허브'
const DESC = '속도위반·신호위반·중앙선·휴대전화·주정차 등 위반을 고르면 무인 단속 과태료와 현장 적발 범칙금·벌점을 차종별로 계산해요. 어린이·노인보호구역 가중(오전 8시~오후 8시), 자진납부 감경, 누적 벌점 면허정지·취소 기준까지 도로교통법 시행령·시행규칙 원문 기준으로 보여 줘요.'
const PAGE_URL = 'https://toolhub.ai.kr/traffic-fine/'
const OG = 'https://toolhub.ai.kr/og/traffic-fine.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '속도위반 과태료, 과속 범칙금 벌점, 어린이보호구역 과태료, 신호위반 벌점, 벌점 면허정지, 교통 범칙금 조회, 주정차 과태료, 휴대전화 범칙금, 중앙선 침범 벌점, 과태료 범칙금 차이, 노인보호구역 과태료',
  openGraph: {
    title: TITLE,
    description: '위반·차종·보호구역으로 계산하는 과태료·범칙금·벌점과 누적 벌점 면허정지·취소 판정',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '교통 범칙금·과태료·벌점 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '교통 범칙금·과태료·벌점 계산기 | 툴허브', description: '속도위반·신호위반·보호구역 과태료와 범칙금·벌점, 면허정지 기준', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function TrafficFinePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '교통 범칙금·과태료·벌점 계산기',
    description: '도로교통법 시행령 별표 6·7·8·10과 시행규칙 별표 28·39를 기준으로 위반 유형·차종·보호구역·초과 속도에 따른 과태료(무인 단속)와 범칙금·벌점(현장 적발), 자진납부 감경, 범칙금 가산 단계, 누적 벌점 면허정지·취소 여부를 계산하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '속도위반은 제한속도·실제 속도로 초과 구간 자동 판정',
      '신호·중앙선·횡단보도·교차로·끼어들기·실선 진로변경·안전거리·휴대전화·안전띠·갓길·앞지르기·주정차·소화전',
      '승합·승용·이륜 차종별 과태료와 범칙금',
      '어린이·노인·장애인보호구역 오전 8시~오후 8시 가중',
      '과태료 자진납부 감경 대상 여부와 범칙금 납부 단계별 금액',
      '누적 벌점으로 면허정지 일수·취소 기준 판정',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.trafficFine.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <TrafficFine />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
