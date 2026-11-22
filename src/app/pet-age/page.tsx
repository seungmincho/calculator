import { Metadata } from 'next'
import PetAge from '@/components/PetAge'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/petAge.json'

const TITLE = '강아지 나이 계산기 - 고양이 사람 나이·사료량 | 툴허브'
const DESC = '강아지·고양이 나이를 사람 나이로 바꿔 줘요. 개는 AKC 크기별 환산표와 UCSD 후성유전 공식(래브라도 연구 기반 참고치)을 비교하고, 고양이는 International Cat Care 표로 계산해요. AAHA 생애 단계별 검진 주기와 하루 칼로리(RER·MER), 사료 g·1회 급여량까지 한 번에 확인하세요.'
const PAGE_URL = 'https://toolhub.ai.kr/pet-age/'
const OG = 'https://toolhub.ai.kr/og/pet-age.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '강아지 나이 계산, 강아지 나이 사람 나이, 고양이 나이 계산, 고양이 사람 나이, 강아지 사료량 계산기, 고양이 사료량, 반려견 나이',
  openGraph: {
    title: TITLE,
    description: '우리 강아지·고양이는 사람 나이로 몇 살? 크기별 환산표, 생애 단계, 하루 칼로리·사료량',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '강아지·고양이 사람 나이 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '강아지·고양이 사람 나이 계산기 | 툴허브', description: '크기별 사람 나이 환산, 생애 단계, 하루 칼로리·사료량', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function PetAgePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '강아지·고양이 사람 나이 계산기',
    description: '반려견·반려묘 나이(년·개월 또는 생일)와 체중으로 사람 나이, AAHA 생애 단계와 검진 주기, 하루 권장 칼로리(RER·MER)와 사료 g·1회 급여량을 계산하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '개 크기(소형·중형·대형·초대형)를 체중으로 자동 분류, 직접 변경 가능',
      'AKC 크기별 환산표와 UCSD 후성유전 공식(16·ln(나이)+31) 비교',
      '고양이 International Cat Care 환산표(개월 단위)',
      'AAHA 생애 단계(puppy·kitten, young adult, mature adult, senior)와 검진 주기',
      '하루 칼로리(RER × 계수 범위), 사료 g, 급여 횟수별 1회량, 간식 10% 한도',
      '0~20살 환산표와 공유 링크·결과 이미지',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.petAge.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <PetAge />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
