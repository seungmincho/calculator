import { Metadata } from 'next'
import WinterFestivals from '@/components/WinterFestivals'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FESTIVALS } from '@/lib/festivals'
import messages from '../../../messages/generated/ko/ns/winterFestivals.json'

const PAGE_URL = 'https://toolhub.ai.kr/winter-festivals/'
const TITLE = '2026-27 겨울 축제 일정 - 산천어·송어·눈꽃·빛축제 | 툴허브'
const DESC = '화천 산천어축제(2027.1.9~1.31)·서울빛초롱축제(2026.12.11~2027.1.31)·평창송어축제·홍천강 꽁꽁축제·태백산 눈축제·대관령 눈꽃축제·해운대 빛축제 등 2026-27 겨울 축제 12곳 일정. 공지 전인 곳은 지난 시즌 기간으로 예년 시기를 보여 드려요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '겨울 축제, 겨울축제 2026, 2027 겨울축제, 겨울 축제 일정, 화천 산천어축제 2027, 평창송어축제 2027, 홍천강 꽁꽁축제, 태백산 눈축제, 대관령 눈꽃축제, 서울빛초롱축제 2026, 해운대 빛축제, 아침고요수목원 오색별빛정원전, 얼음낚시 축제, 빛축제',
  openGraph: {
    title: TITLE,
    description: '산천어·송어 얼음낚시, 눈축제, 빛축제까지 2026-27 겨울 축제 12곳 일정과 예년 시기',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/winter-festivals.png', width: 1200, height: 630, alt: '2026-27 겨울 축제 일정' }],
  },
  twitter: { card: 'summary_large_image', title: '2026-27 겨울 축제 일정 | 툴허브', description: '얼음낚시·눈·빛 축제 12곳 일정', images: ['https://toolhub.ai.kr/og/winter-festivals.png'] },
  alternates: { canonical: PAGE_URL },
}

const ns = messages.winterFestivals
const faqs = ns.guide.faq.items

// Event 마크업은 넣지 않는다: 12곳 중 4곳만 날짜가 나왔고, 얼음 축제는 날씨로 자주 바뀌어 낡은 Event 정보가 남기 쉽다.
export default function WinterFestivalsPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: '2026-27 겨울 축제 일정',
    description: DESC,
    url: PAGE_URL,
    inLanguage: 'ko',
    dateModified: '2026-11-07',
    mainEntity: {
      '@type': 'ItemList',
      name: '2026-27 겨울 축제',
      numberOfItems: FESTIVALS.length,
      itemListElement: FESTIVALS.map((f, i) => ({
        '@type': 'ListItem', position: i + 1, name: ns.festivals[f.id].name,
        ...(f.url ? { url: f.url } : {}),
      })),
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
            <WinterFestivals />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
