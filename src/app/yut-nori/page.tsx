import { Metadata } from 'next'
import YutNoriAI, { YutNoriGuide } from '@/components/games/YutNoriAI'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/yutNori.json'

const TITLE = '윷놀이 - 온라인 윷놀이 게임, AI 대전 | 툴허브'
const DESC = '설날 윷놀이를 온라인으로. AI 1~3명과 대전하거나 한 기기에서 2~4명이 번갈아 던져요. 빽도·업기·잡기·모와 방 지름길까지 전통 규칙 그대로, 말 2개·4개 선택. 윷 확률표와 윷놀이 규칙·하는 법 FAQ.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '윷놀이, 윷놀이 게임, 온라인 윷놀이, 윷놀이 규칙, 윷놀이 하는 법, 윷놀이 빽도, 윷놀이 말판, 윷 확률, 설날 놀이, 민속놀이, 보드게임',
  openGraph: {
    title: TITLE,
    description: 'AI와 대전하거나 한 기기에서 2~4명이 즐기는 온라인 윷놀이 — 빽도·업기·잡기·지름길',
    url: 'https://toolhub.ai.kr/yut-nori/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/yut-nori.png', width: 1200, height: 630, alt: '온라인 윷놀이' }],
  },
  twitter: { card: 'summary_large_image', title: '윷놀이 - 온라인 윷놀이 게임 | 툴허브', description: 'AI 대전·한 기기 2~4명 온라인 윷놀이', images: ['https://toolhub.ai.kr/og/yut-nori.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/yut-nori/' },
}

const faqs = messages.yutNori.guide.faq.items

export default function YutNoriPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'VideoGame',
    name: '윷놀이',
    description: '전통 규칙(빽도·업기·잡기·모와 방 지름길)으로 AI 1~3명과 대전하거나 한 기기에서 2~4명이 번갈아 즐기는 온라인 윷놀이.',
    url: 'https://toolhub.ai.kr/yut-nori/',
    genre: 'Board Game', gamePlatform: 'Web Browser', operatingSystem: 'Any', applicationCategory: 'GameApplication',
    inLanguage: 'ko',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    playMode: ['SinglePlayer', 'MultiPlayer'],
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 4 },
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
          <YutNoriAI />
          <div className="mt-8">
            <YutNoriGuide />
          </div>
          <div className="mt-8">
            <RelatedTools />
          </div>
        </div>
      </div>
    </>
  )
}
