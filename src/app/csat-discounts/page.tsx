import { Metadata } from 'next'
import CsatDiscounts from '@/components/CsatDiscounts'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/csatDiscounts.json'

const TITLE = '수험표 할인 2027 - 수능 끝 놀이공원·영화·외식 혜택 모음 | 툴허브'
const DESC = '2027학년도 수능 수험표 할인 30개를 오늘 쓸 수 있는 것부터 정리했어요. 에버랜드 2만원·롯데월드 2만7천원·서울랜드·레고랜드, CGV·메가박스 7천원, 샤브올데이·매드포갈릭, 제주항공·이스타항공까지 기간·조건·출처를 함께 봐요.'
const PAGE_URL = 'https://toolhub.ai.kr/csat-discounts/'
const OG = 'https://toolhub.ai.kr/og/csat-discounts.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '수험표 할인, 수험생 할인, 2027 수험표 할인, 수능 수험표 혜택, 수험생 할인 이벤트, 에버랜드 수험생 할인, 롯데월드 수험생 할인, 서울랜드 수험생, 레고랜드 수험생, CGV 수험생, 메가박스 수험생, 수험생 항공권 할인, 수능 끝나고 할 일',
  openGraph: {
    title: TITLE,
    description: '2027학년도 수능 수험생 놀이공원·영화·외식·여행 할인을 기간·조건·출처와 함께, 오늘 쓸 수 있는 것부터',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '2027 수험표 할인 모음' }],
  },
  twitter: { card: 'summary_large_image', title: '2027 수험표 할인 모음 | 툴허브', description: '놀이공원·영화·외식·여행 수험생 할인, 오늘 쓸 수 있는 것부터', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function CsatDiscountsPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '2027 수험표 할인 모음',
    description: '2027학년도 수능 수험생이 수험표로 받을 수 있는 놀이공원·영화·공연·외식·항공·숙박 할인을 기간·조건·출처와 함께 모아, 오늘 기준 진행 중인 행사와 마감 임박 순으로 보여 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'LifestyleApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['오늘 쓸 수 있는 혜택부터 마감 임박 순 정렬과 D-day', '놀이공원·영화·외식·여행 분류 필터', '즐겨찾기 저장과 공유 링크', '행사별 기간·동반 인원·증빙 조건', '업체 공지·언론 보도 출처와 확인일'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.csatDiscounts.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CsatDiscounts />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
