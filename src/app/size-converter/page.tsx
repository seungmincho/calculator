import { Metadata } from 'next'
import SizeConverter from '@/components/SizeConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/sizeConverter.json'

const TITLE = '신발 사이즈 변환표 - US·UK·EU·mm·옷·반지 호수 | 툴허브'
const DESC = '해외직구 신발 사이즈를 한국 mm와 US·UK·EU·JP로 한 번에 바꿔요. 남성·여성·아동(C/Y) 신발, 남녀 옷(44·55·66·85~110), 바지 허리 인치, 반지 호수·둘레·US 사이즈까지 전체 변환표와 실측 추천을 함께 보여 줘요.'
const PAGE_URL = 'https://toolhub.ai.kr/size-converter/'
const OG = 'https://toolhub.ai.kr/og/size-converter.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '신발 사이즈 변환, 신발 사이즈표, US 사이즈 한국, 나이키 사이즈 변환, 옷 사이즈 변환, 여성 옷 사이즈 55 66, 반지 호수, 반지 사이즈 변환, 아동 신발 사이즈 C Y, 바지 허리 인치 cm',
  openGraph: {
    title: TITLE,
    description: '한국 270mm = US 9 · UK 8 · EU 42.5 — 신발·옷·반지 해외 사이즈를 한 번에 변환',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '해외 신발·옷·반지 사이즈 변환' }],
  },
  twitter: { card: 'summary_large_image', title: '해외 사이즈 변환 | 툴허브', description: '신발 mm·US·UK·EU, 옷 44·55·66, 반지 호수를 한 번에', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function SizeConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '해외 신발·옷·반지 사이즈 변환',
    description: '한국 신발 mm(발길이)와 US·UK·EU·JP 신발 사이즈, 아동 C/Y 사이즈, 남녀 옷 사이즈(한국 호칭·XS~XXL·US·UK·EU·JP), 바지 허리 인치·cm, 반지 호수·안쪽 둘레·안지름·US·UK를 서로 바꾸고 실측값으로 맞는 치수를 추천하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '신발 남성·여성·아동(C/Y) 한국 mm ↔ US·UK·EU·JP',
      '발길이를 재서 넣으면 맞는 치수 추천',
      '여성 옷 44·55·66·77·88, 남성 상의 85~110 ↔ XS~XXL·US·UK·EU·JP',
      '바지 허리 인치 ↔ cm',
      '반지 호수 ↔ 안쪽 둘레·안지름·US·UK·EU(ISO)·JP, 손가락 둘레로 호수 추천',
      '전체 변환표와 결과 공유',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.sizeConverter.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <SizeConverter />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
