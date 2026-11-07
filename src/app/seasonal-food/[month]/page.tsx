import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SeasonalFood from '@/components/SeasonalFood'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { MONTHS, MOF_PICKS, foodsInMonth, isMonth, type Category } from '@/utils/seasonalFood'
import messages from '../../../../messages/generated/ko/ns/seasonalFood.json'

type Params = { month: string }

export function generateStaticParams(): Params[] {
  return MONTHS.map((m) => ({ month: String(m) }))
}

export const dynamicParams = false

const SITE = 'https://toolhub.ai.kr'
const OG = `${SITE}/og/seasonal-food.png`
const items = messages.seasonalFood.items as Record<string, { name: string }>
// FAQPage JSON-LD 는 /seasonal-food/ 에만 (같은 FAQ 를 13페이지에 반복하지 않음)

const parse = (s: string) => {
  const m = Number(s)
  return isMonth(m) && String(m) === s ? m : null
}
const names = (m: number, c?: Category) => foodsInMonth(m, c).map((f) => items[f.id].name)

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const m = parse((await params).month)
  if (!m) return {}
  const n = foodsInMonth(m).length
  const top = (c: Category) => names(m, c).slice(0, 3).join('·')
  const title = `${m}월 제철 음식 - 채소·과일·수산물 ${n}가지 | 툴허브`
  const description = `${m}월 제철 음식 ${n}가지: 채소 ${top('veg')}, 과일 ${top('fruit')}, 수산물 ${top('seafood')} 등. 고르는 법·보관법·대표 요리와 해양수산부 ${MOF_PICKS[m].year}년 ${m}월 이달의 수산물까지 한눈에 봐요.`
  const url = `${SITE}/seasonal-food/${m}/`
  return {
    title,
    description,
    keywords: `${m}월 제철 음식, ${m}월 제철 과일, ${m}월 제철 채소, ${m}월 제철 수산물, ${m}월 제철 생선, ${m}월 제철 해산물, ${m}월 이달의 수산물`,
    openGraph: { title, description, url, siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: OG, width: 1200, height: 630, alt: `${m}월 제철 음식` }] },
    twitter: { card: 'summary_large_image', title, description, images: [OG] },
    alternates: { canonical: url },
  }
}

export default async function SeasonalFoodMonthPage({ params }: { params: Promise<Params> }) {
  const m = parse((await params).month)
  if (!m) notFound()
  const url = `${SITE}/seasonal-food/${m}/`
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `${m}월 제철 음식`,
    url,
    itemListElement: names(m).map((name, i) => ({ '@type': 'ListItem', position: i + 1, name })),
  }
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '툴허브', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: '이달의 제철 음식', item: `${SITE}/seasonal-food/` },
      { '@type': 'ListItem', position: 3, name: `${m}월`, item: url },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <SeasonalFood month={m} />
            <div className="mt-8">
              <RelatedTools href="/seasonal-food" />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
