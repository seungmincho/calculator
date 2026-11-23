import { Metadata } from 'next'
import CharyeCost from '@/components/CharyeCost'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/charyeCost.json'

const TITLE = '차례상 비용 계산기 - 설·추석 차례상 전통시장 vs 대형마트, 간소화 | 툴허브'
const DESC = 'aT(한국농수산식품유통공사) 차례상 차림비용 조사 품목별 가격으로 설·추석 차례상 비용을 계산해요. 4인 가족 기준 전통시장과 대형마트 비교, 성균관 간소화 차례상으로 줄이는 금액, 품목별 수량 조정과 장보기 체크리스트까지.'
const PAGE_URL = 'https://toolhub.ai.kr/charye-cost/'
const OG = 'https://toolhub.ai.kr/og/charye-cost.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '차례상 비용, 차례상 비용 계산기, 설 차례상 비용, 추석 차례상 비용, 2027 설 차례상, 차례상 전통시장 대형마트, 간소화 차례상, 성균관 차례상 표준안, 차례상 장보기 목록, 제수용품 가격, 차례상 차림비용',
  openGraph: {
    title: TITLE,
    description: 'aT 조사 품목별 가격으로 계산하는 설·추석 차례상 비용, 전통시장 vs 대형마트, 간소화 비교',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '차례상 비용 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '차례상 비용 계산기 | 툴허브', description: '설·추석 차례상 비용 전통시장 vs 대형마트, 간소화 비교', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function CharyeCostPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '차례상 비용 계산기',
    description: '한국농수산식품유통공사(aT) 설·추석 차례상 차림비용 조사의 품목별 전통시장·대형유통업체 가격으로 상차림(조사 기준 전체·성균관 간소화), 구매처, 규모, 품목별 수량에 맞춘 차례상 비용을 계산하고 장보기 체크리스트를 만드는 도구.',
    url: PAGE_URL,
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'aT 설·추석 차례상 조사 품목별 가격(4인 가족)',
      '전통시장·대형마트·품목별 싼 곳 섞어 사기 비교',
      '성균관 간소화 차례상과 조사 기준 전체 상차림 비교',
      '품목 빼기·더하기, 수량 조정, 상차림 규모',
      '분류별(과일·나물·육류·수산·떡·기타) 소계',
      '장보기 체크리스트 저장·복사, 결과 공유 링크',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.charyeCost.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CharyeCost />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
