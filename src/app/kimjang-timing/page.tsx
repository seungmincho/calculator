import { Metadata } from 'next'
import KimjangTiming from '@/components/KimjangTiming'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/kimjangTiming.json'

export const metadata: Metadata = {
  title: '김장 시기 2026 - 지역별 김장 적기 예보 | 툴허브',
  description: '서울·경기·충청·호남·영남 15개 도시의 김장 적기를 날씨 예보와 평년 날짜로 확인하세요. 기상청 기준(하루 평균기온 4℃ 이하, 최저기온 0℃ 이하)을 앞으로 약 9일 예보에 적용해 올해 김장 시작일을 알려 드립니다.',
  keywords: '김장 시기, 김장 적기, 2026 김장 시기, 서울 김장 시기, 김장 언제, 김장 날짜, 지역별 김장 시기, 김장 적정 시기, 김장 기온',
  openGraph: {
    title: '김장 시기 2026 - 지역별 김장 적기 예보 | 툴허브',
    description: '우리 지역 김장 적기를 날씨 예보와 평년 날짜로 확인하세요.',
    url: 'https://toolhub.ai.kr/kimjang-timing/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/kimjang-timing.png', width: 1200, height: 630, alt: '김장 시기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '김장 시기 2026 | 툴허브', description: '지역별 김장 적기 예보', images: ['https://toolhub.ai.kr/og/kimjang-timing.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/kimjang-timing/' },
}

const faqs = messages.kimjangTiming.guide.faq.items

export default function KimjangTimingPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '김장 시기 예보',
    description: '15개 도시의 김장 적기를 MET Norway 날씨 예보와 평년 김장 시기로 알려 주는 도구.',
    url: 'https://toolhub.ai.kr/kimjang-timing/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['15개 도시 평년 김장 시기', '약 9일 예보 기반 김장 적기 시작일', '날짜별 최저·평균기온과 적기 여부', '주말만 보기', '지역별 비교표', '결과 공유 링크·이미지'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <KimjangTiming />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
