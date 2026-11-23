import { Metadata } from 'next'
import PassportName from '@/components/PassportName'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/passportName.json'

const TITLE = '여권 영문 이름 변환기 - 한글 이름 영어로, 성씨 영문 표기 | 툴허브'
const DESC = '한글 이름을 국어의 로마자 표기법 인명 규칙(이름은 음절별, 음운 변화 미반영)으로 바꿔 여권 영문명 예시(HONG GILDONG)를 보여 줘요. 이·박·최·정 등 성씨 관용 표기 후보, 항공권 표기, 여권 MRZ 줄, 여권법 시행령의 로마자성명 변경 요건까지 함께 확인하세요.'
const PAGE_URL = 'https://toolhub.ai.kr/passport-name/'
const OG = 'https://toolhub.ai.kr/og/passport-name.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '여권 영문 이름, 여권 영문명 변환, 한글 이름 영어로, 성씨 영문 표기, 여권 로마자 표기, 이름 로마자 변환, 여권 영문 이름 변경, 이씨 영문 LEE, 박씨 영문 PARK, 항공권 영문 이름, 여권 MRZ',
  openGraph: {
    title: TITLE,
    description: '한글 이름을 로마자 표기법으로 바꾸고 성씨 관용 표기·항공권 표기·여권 영문 이름 변경 요건 확인',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '여권 영문 이름 변환기' }],
  },
  twitter: { card: 'summary_large_image', title: '여권 영문 이름 변환기 | 툴허브', description: '한글 이름 영어로, 성씨 영문 표기와 항공권 이름까지', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function PassportNamePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '여권 영문 이름 변환기',
    description: '한글 성과 이름을 국어의 로마자 표기법(문화체육관광부 고시 제2014-42호) 인명 규칙으로 바꾸고, 성씨 관용 표기 후보와 여권·항공권·MRZ 표기 예시, 여권법 시행령의 로마자성명 변경 요건을 알려 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '이름은 음절별로 변환(음운 변화 미반영), 붙여 쓰기·붙임표 선택',
      '두 글자 성(남궁·제갈·선우·황보) 처리',
      '이·박·최·정 등 성씨 30개의 표기법 표기와 관용 표기 후보',
      '여권 표기(대문자), 항공권 예약 표기, MRZ 첫 줄 미리보기와 복사',
      '로마자성명 변경 허용 요건과 외교부고시 50%·1만 명 기준 안내',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.passportName.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <PassportName />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
