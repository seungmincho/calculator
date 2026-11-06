import { Metadata } from 'next'
import AgeTable from '@/components/AgeTable'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/ageTable.json'
import { yearInfo } from '@/utils/ageTable'

// Fixed at build time: the table covers this year (KST) and the next.
const base = Number(new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 4))
const next = base + 1
const nx = yearInfo(next)
const ZODIAC_KO: Record<string, string> = messages.ageTable.zodiac

export const metadata: Metadata = {
  title: `나이표 ${base}·${next} - 출생연도별 만 나이·띠별 나이 | 툴허브`,
  description: `${next}년 나이표: 1930년생부터 ${next}년생까지 만 나이·연 나이·띠(간지)·초등학교 입학 연도. ${next}년은 ${nx.ganzi}년 ${ZODIAC_KO[nx.zodiac]}띠, 띠별 나이와 설날 기준 띠 경계, 빠른년생까지 한눈에.`,
  keywords: `나이표, ${next} 나이표, ${next}년 나이표, 띠별 나이, ${next} 띠별 나이, ${next}년 띠, ${nx.ganzi}년, 출생연도별 나이, 만 나이표, 연도별 나이, 빠른년생`,
  openGraph: {
    title: '나이표 - 출생연도별 만 나이·띠별 나이 | 툴허브',
    description: '출생연도별 올해·내년 만 나이와 띠, 초등 입학 연도를 한 표로.',
    url: 'https://toolhub.ai.kr/age-table/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/age-table.png', width: 1200, height: 630, alt: '나이표' }],
  },
  twitter: { card: 'summary_large_image', title: `나이표 ${base}·${next} | 툴허브`, description: '출생연도별 만 나이·띠별 나이', images: ['https://toolhub.ai.kr/og/age-table.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/age-table/' },
}

const faqs = messages.ageTable.guide.faq.items

export default function AgeTablePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '나이표',
    description: '출생연도별 올해·내년 만 나이, 연 나이, 띠(간지), 초등학교 입학 연도를 보여 주는 표.',
    url: 'https://toolhub.ai.kr/age-table/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['출생연도별 만 나이(올해·내년)', '연 나이', '띠·간지(설날 기준)', '띠별 나이', '초등학교 입학 연도·빠른년생', '결과 공유 링크·이미지'],
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
            <AgeTable base={base} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
