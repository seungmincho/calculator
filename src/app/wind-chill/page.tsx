import { Metadata } from 'next'
import WindChill from '@/components/WindChill'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/windChill.json'

const TITLE = '체감온도 계산기 - 오늘 체감온도·한파 예보 | 툴허브'
const DESC = '기온과 풍속을 넣으면 기상청 공식으로 겨울철 체감온도와 관심·주의·경고·위험 단계를 계산해요. 서울·철원·대관령 등 16개 지역의 앞으로 48시간 체감온도, 날짜별 최저 체감온도와 한파 기준, 체감온도 표까지 한눈에.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '체감온도 계산기, 체감온도, 오늘 체감온도, 체감온도 계산, 체감온도 공식, 겨울 체감온도, 한파, 한파주의보 기준, 체감온도 표, 서울 체감온도',
  openGraph: {
    title: TITLE,
    description: '기상청 공식 체감온도 계산과 16개 지역 48시간 체감온도·한파 예보',
    url: 'https://toolhub.ai.kr/wind-chill/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/wind-chill.png', width: 1200, height: 630, alt: '체감온도 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '체감온도 계산기 | 툴허브', description: '체감온도 계산과 지역별 한파 예보', images: ['https://toolhub.ai.kr/og/wind-chill.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/wind-chill/' },
}

const faqs = messages.windChill.guide.faq.items

export default function WindChillPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '체감온도 계산기',
    description: '기상청 겨울철 체감온도 식으로 체감온도와 단계를 계산하고, 16개 지역의 48시간 체감온도·한파 기준을 MET Norway 예보로 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/wind-chill/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['기상청 겨울철 체감온도 식', '관심·주의·경고·위험 단계와 대응', '16개 지역 48시간 체감온도 예보', '날짜별 아침 최저기온·최저 체감온도', '한파주의보·경보 기준 참고 표시', '체감온도 표(기온×풍속)'],
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
            <WindChill />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
