import { Metadata } from 'next'
import SebaetdonCalculator from '@/components/SebaetdonCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/sebaetdonCalculator.json'

const TITLE = '세뱃돈 계산기 - 2027 설 나이별 세뱃돈 얼마? 총액·신권 장수 | 툴허브'
const DESC = '조카·손주·부모님 명단을 넣으면 세뱃돈 총액과 5만원·1만원·5천원 신권 장수, 봉투 수를 바로 계산해요. 미취학 1~3만원, 초등 3~5만원, 중·고생 5~10만원 등 설문·송금 데이터로 본 나이대별 참고 범위와 덕담 봉투 문구, 신권 교환·증여세 안내까지.'
const PAGE_URL = 'https://toolhub.ai.kr/sebaetdon/'
const OG = 'https://toolhub.ai.kr/og/sebaetdon.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '세뱃돈 계산기, 세뱃돈 얼마, 세뱃돈 나이별, 세뱃돈 적정 금액, 조카 세뱃돈, 중학생 세뱃돈, 고등학생 세뱃돈, 대학생 세뱃돈, 설날 용돈, 부모님 설 용돈, 세뱃돈 신권, 신권 교환, 세뱃돈 덕담, 2027 설날',
  openGraph: {
    title: TITLE,
    description: '명단만 넣으면 세뱃돈 총액, 권종별 신권 장수, 나이대별 참고 범위와 덕담 문구까지',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '세뱃돈 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '세뱃돈 계산기 | 툴허브', description: '나이별 세뱃돈 참고 범위와 총액·신권 장수 계산', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function SebaetdonPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '세뱃돈 계산기',
    description: '세뱃돈을 줄 사람의 관계·나이대·인원·1인당 금액으로 총액, 나이대별 소계, 예산 대비 남는 금액, 5만원·1만원·5천원·1천원 신권 장수와 봉투 수를 계산하고 나이대별 참고 범위와 덕담 문구를 보여 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '관계·나이대·인원·1인당 금액으로 명단 작성',
      '설문·송금 데이터로 본 나이대별 참고 범위와 참고값 넣기',
      '세뱃돈 총액, 나이대별 소계, 예산 대비 남음·초과',
      '권종별 신권 장수와 봉투별 넣을 지폐',
      '나이대별 덕담 봉투 문구 복사',
      '다음 설날 D-day, 신권 교환·증여세 안내',
      '명단 공유 링크와 이 기기 저장',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.sebaetdonCalculator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <SebaetdonCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
