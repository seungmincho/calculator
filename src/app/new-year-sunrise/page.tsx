import { Metadata } from 'next'
import NewYearSunrise from '@/components/NewYearSunrise'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/newYearSunrise.json'
import { newYearTarget } from '@/lib/sun/solar'

// Fixed at build time: the static page covers the next New Year's Day (KST).
const target = newYearTarget(Date.now())
const year = target.slice(0, 4)

export const metadata: Metadata = {
  title: `${year} 새해 해돋이 시간 - 명소별 일출 시각·구름 예보 | 툴허브`,
  description: `${year}년 1월 1일 독도·간절곶·호미곶·정동진·성산일출봉·해운대 등 전국 해돋이 명소 19곳의 일출 시각을 비교하세요. 서울보다 몇 분 빠른지, 산 정상 높이 효과, 새해 아침 구름 예보까지 한눈에.`,
  keywords: `${year} 해돋이 시간, 새해 일출 시간, ${year} 일출 시간, 해돋이 명소, 정동진 일출 시간, 간절곶 일출, 호미곶 일출 시간, 서울 일출 시간 1월 1일, 해맞이`,
  openGraph: {
    // Plain string: generate-og reads it for the (year-independent) share image.
    title: '새해 해돋이 시간 - 명소별 일출 시각 | 툴허브',
    description: '전국 해돋이 명소의 1월 1일 일출 시각과 구름 예보.',
    url: 'https://toolhub.ai.kr/new-year-sunrise/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/new-year-sunrise.png', width: 1200, height: 630, alt: '새해 해돋이 시간' }],
  },
  twitter: { card: 'summary_large_image', title: `${year} 새해 해돋이 시간 | 툴허브`, description: '명소별 일출 시각과 구름 예보', images: ['https://toolhub.ai.kr/og/new-year-sunrise.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/new-year-sunrise/' },
}

const faqs = messages.newYearSunrise.guide.faq.items

export default function NewYearSunrisePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '새해 해돋이 시간',
    description: '전국 해돋이 명소의 1월 1일 일출 시각을 천문 계산으로 비교하고 새해 아침 구름 예보를 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/new-year-sunrise/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['명소 19곳 1월 1일 일출 시각', '서울 대비 빠르기', '산 정상 높이 효과', '새해 아침 구름 예보', '지역 필터', '결과 공유 링크·이미지'],
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
            <NewYearSunrise target={target} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
