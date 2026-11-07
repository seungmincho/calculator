import { Metadata } from 'next'
import SeasonalFood from '@/components/SeasonalFood'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FOODS, MONTHS } from '@/utils/seasonalFood'
import messages from '../../../messages/generated/ko/ns/seasonalFood.json'

const URL = 'https://toolhub.ai.kr/seasonal-food/'
const OG = 'https://toolhub.ai.kr/og/seasonal-food.png'
const TITLE = '이달의 제철 음식 - 월별 채소·과일·수산물 달력 | 툴허브'
const DESC = `1월부터 12월까지 달마다 제철인 채소·과일·수산물 ${FOODS.length}가지를 한눈에 보는 제철 달력이에요. 고르는 법·보관법·대표 요리, 해양수산부 2026 이달의 수산물, 수산물 금어기까지 농촌진흥청 농사로·해양수산부 자료로 정리했어요.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '제철 음식, 이달의 제철 음식, 월별 제철 음식, 제철 과일, 제철 채소, 제철 수산물, 제철 생선, 제철 해산물, 제철 달력, 이달의 수산물, 금어기',
  openGraph: {
    title: TITLE,
    description: '달마다 제철인 채소·과일·수산물과 고르는 법·보관법·대표 요리',
    url: URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '이달의 제철 음식' }],
  },
  twitter: { card: 'summary_large_image', title: '이달의 제철 음식 | 툴허브', description: '월별 제철 채소·과일·수산물 달력', images: [OG] },
  alternates: { canonical: URL },
}

const faqs = messages.seasonalFood.guide.faq.items

export default function SeasonalFoodPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: '이달의 제철 음식',
    description: DESC,
    url: URL,
    mainEntity: {
      '@type': 'ItemList', name: '월별 제철 음식',
      itemListElement: MONTHS.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: `${m}월 제철 음식`, url: `${URL}${m}/` })),
    },
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
            <SeasonalFood />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
