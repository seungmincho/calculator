import { Metadata } from 'next'
import SkiResorts from '@/components/SkiResorts'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/skiResorts.json'

export const metadata: Metadata = {
  title: '스키장 개장일 2026 - 전국 스키장 개장 일정·날씨·가기 좋은 날 | 툴허브',
  description: '2026/27 시즌 전국 스키장 12곳(모나용평·휘닉스·하이원·알펜시아·비발디파크·곤지암·지산 등) 개장일과 9일 날씨 예보. 눈·비·바람과 요일 혼잡도로 가기 좋은 날을 추천합니다.',
  keywords: '스키장 개장일, 스키장 개장일 2026, 2026 스키장 개장, 스키장 날씨, 휘닉스 개장일, 하이원 개장일, 용평 개장일, 비발디파크 개장, 곤지암 스키장 개장, 지산 스키장 개장, 스키장 추천',
  openGraph: {
    title: '스키장 개장일 2026 - 전국 스키장 개장 일정·날씨 | 툴허브',
    description: '전국 스키장 개장 일정과 9일 날씨로 가기 좋은 날 추천.',
    url: 'https://toolhub.ai.kr/ski-resorts/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/ski-resorts.png', width: 1200, height: 630, alt: '스키장 개장일 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '스키장 개장일 2026 | 툴허브', description: '전국 스키장 개장 일정·날씨', images: ['https://toolhub.ai.kr/og/ski-resorts.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/ski-resorts/' },
}

const faqs = messages.skiResorts.guide.faq.items

export default function SkiResortsPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '스키장 개장일·날씨',
    description: '전국 스키장 12곳의 2026/27 시즌 개장 일정과 MET Norway 9일 예보로 가기 좋은 날을 추천하는 도구.',
    url: 'https://toolhub.ai.kr/ski-resorts/',
    applicationCategory: 'TravelApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['스키장 12곳 개장일', '9일 날씨(눈·비·바람·기온)', '가기 좋은 날 점수', '지역 필터', '결과 공유 링크·이미지'],
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
            <SkiResorts />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
