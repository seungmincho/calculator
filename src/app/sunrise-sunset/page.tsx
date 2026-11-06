import { Metadata } from 'next'
import SunriseSunset from '@/components/SunriseSunset'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/sunriseSunset.json'
import { kstDate } from '@/lib/sun/solar'

// Static HTML shows the build date's month; the browser switches to today after loading.
const buildDate = kstDate(Date.now())

export const metadata: Metadata = {
  title: '일출·일몰 시간 계산기 - 오늘 해 뜨는 시간·지는 시간 | 툴허브',
  description: '서울·부산·대구·광주·제주 등 21개 도시의 날짜별 일출·일몰 시각, 낮 길이, 남중 시각, 시민박명, 사진 찍기 좋은 골든아워를 계산하세요. 한 달 일출·일몰 표와 연중 낮 길이 그래프, 내 위치 계산까지.',
  keywords: '일출 시간, 일몰 시간, 오늘 일출 시간, 오늘 일몰 시간, 해 뜨는 시간, 해 지는 시간, 서울 일몰 시간, 부산 일출 시간, 골든아워 시간, 낮 길이, 동지 낮 길이',
  openGraph: {
    title: '일출·일몰 시간 계산기 | 툴허브',
    description: '날짜·도시별 일출·일몰·낮 길이·골든아워.',
    url: 'https://toolhub.ai.kr/sunrise-sunset/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/sunrise-sunset.png', width: 1200, height: 630, alt: '일출·일몰 시간 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '일출·일몰 시간 계산기 | 툴허브', description: '날짜·도시별 일출·일몰·낮 길이', images: ['https://toolhub.ai.kr/og/sunrise-sunset.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/sunrise-sunset/' },
}

const faqs = messages.sunriseSunset.guide.faq.items

export default function SunriseSunsetPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '일출·일몰 시간 계산기',
    description: '날짜와 도시를 고르면 일출·일몰·남중 시각, 낮 길이, 시민박명, 골든아워를 천문 계산으로 알려 주는 도구.',
    url: 'https://toolhub.ai.kr/sunrise-sunset/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['21개 도시·내 위치', '일출·일몰·남중 시각', '낮 길이', '시민박명', '골든아워', '한 달 일출·일몰 표', '연중 낮 길이 그래프', '결과 공유 링크·이미지'],
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
            <SunriseSunset buildDate={buildDate} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
