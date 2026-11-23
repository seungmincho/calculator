import { Metadata } from 'next'
import TireSize from '@/components/TireSize'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/tireSize.json'

const TITLE = '타이어 사이즈 계산기 - 규격 보는 법·인치업 외경·속도계 오차·제조일 | 툴허브'
const DESC = '205/55R16 91V 같은 타이어 규격을 풀어 사이드월 높이·외경·둘레를 계산하고, 두 규격의 외경 차이와 속도계 오차, 하중지수(kg)·속도기호(km/h)를 비교해요. 같은 외경의 인치업 규격 후보와 DOT 제조일(경과 연수)도 확인할 수 있어요.'
const PAGE_URL = 'https://toolhub.ai.kr/tire-size/'
const OG = 'https://toolhub.ai.kr/og/tire-size.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '타이어 사이즈 계산기, 타이어 규격 보는법, 타이어 인치업 외경, 타이어 외경 계산, 타이어 제조일자, 타이어 DOT, 하중지수, 속도기호, 타이어 속도계 오차, 타이어 사이즈 비교, 겨울 타이어 교체',
  openGraph: {
    title: TITLE,
    description: '타이어 규격 풀이, 두 규격의 외경 차이·속도계 오차, 하중지수·속도기호, 인치업 후보, 제조일 확인',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '타이어 사이즈 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '타이어 사이즈 계산기 | 툴허브', description: '인치업 외경 차이·속도계 오차·하중지수·제조일을 한 번에', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function TireSizePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '타이어 사이즈 계산기',
    description: '타이어 규격(폭/편평비 R 림 하중지수 속도기호)을 해석해 사이드월 높이·외경·둘레·km당 회전수를 계산하고, 두 규격의 외경 차이와 속도계 오차, 하중지수·속도기호를 자동차규칙 별표 1의2 기준으로 비교하며 DOT 제조일로 경과 연수를 알려 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '205/55R16 91V·P215/65R15·LT235/75R15·225/40ZR18 92Y XL 등 규격 해석',
      '사이드월 높이·외경·둘레·km당 회전수 계산',
      '두 규격의 외경 차이(%)와 속도계 오차',
      '하중지수(kg)·속도기호(km/h) 비교와 순정보다 낮을 때 경고',
      '외경이 비슷한 인치업 규격 후보',
      'DOT 제조일로 제조 연월·경과 연수와 점검·교체 안내',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.tireSize.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <TireSize />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
