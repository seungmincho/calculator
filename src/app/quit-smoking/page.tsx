import { Metadata } from 'next'
import QuitSmoking from '@/components/QuitSmoking'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/quitSmoking.json'

const TITLE = '금연 계산기 - 금연 아낀 돈·시간별 금연 효과 | 툴허브'
const DESC = '금연 시작일과 하루 흡연량으로 금연 기간, 아낀 돈, 안 피운 담배 수를 계산해요. WHO 기준 20분·12시간·1년·10년 시간별 금연 효과, 궐련형·액상 전자담배, 보건소 금연클리닉·건강보험 금연치료 지원까지 한 번에 확인하세요.'
const PAGE_URL = 'https://toolhub.ai.kr/quit-smoking/'
const OG = 'https://toolhub.ai.kr/og/quit-smoking.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '금연 계산기, 금연 효과, 금연 시간별 변화, 금연 아낀 돈, 금연 클리닉, 금연 치료 지원, 금연 일수 계산, 금연 후 몸의 변화, 금단 증상 기간, 전자담배 금연, 보건소 금연클리닉, 금연상담전화',
  openGraph: {
    title: TITLE,
    description: '금연 며칠째인지, 아낀 돈과 안 피운 담배, 시간별 건강 회복 단계와 금연 지원 제도',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '금연 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '금연 계산기 | 툴허브', description: '금연 아낀 돈과 시간별 금연 효과', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function QuitSmokingPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '금연 계산기',
    description: '금연 시작 일시와 하루 흡연량·담배 가격으로 금연 기간, 아낀 돈, 안 피운 담배 수, 앞으로 아낄 돈을 계산하고 WHO 기준 건강 회복 단계와 국내 금연 지원 제도를 안내하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '금연 경과 시간(일·시간·분) 1분마다 갱신',
      '아낀 돈과 안 피운 담배(개비·갑), 1년·5년·10년 이어 갈 때 아낄 돈',
      '궐련·궐련형 전자담배(스틱)·액상형 전자담배(월 비용) 단위 지원',
      'WHO 기준 20분~15년 건강 회복 단계와 다음 단계 D-day',
      '보건소 금연클리닉·건강보험 금연치료·금연상담전화 1544-9030·금연캠프 안내',
      '시작일·최장 기록을 이 기기에 저장, 결과 이미지·링크 공유',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.quitSmoking.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <QuitSmoking />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
