import { Metadata } from 'next'
import Changes2027 from '@/components/Changes2027'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/changes2027.json'

export const metadata: Metadata = {
  title: '2027년 달라지는 것 - 최저임금·4대보험·중위소득 총정리 | 툴허브',
  description: '2027년부터 바뀌는 최저임금 10,700원, 국민연금 10%·장기요양 인상, 기준 중위소득 6.70% 인상, 실업급여 하한, 아동수당 확대, 시간단위 연차까지 시행일 순으로 정리하고 내 월급 변화를 바로 계산하세요.',
  keywords: '2027년 달라지는 것, 2027 달라지는 제도, 2027년부터 달라지는 것, 2027 최저임금, 2027 4대보험, 2027 국민연금, 2027 중위소득, 2027 실업급여, 2027 아동수당, 2027 연차',
  openGraph: {
    title: '2027년 달라지는 것 - 최저임금·4대보험·중위소득 총정리 | 툴허브',
    description: '2027년 바뀌는 급여·4대보험·복지·근로 제도를 시행일 순으로.',
    url: 'https://toolhub.ai.kr/changes-2027/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/changes-2027.png', width: 1200, height: 630, alt: '2027년 달라지는 것' }],
  },
  twitter: { card: 'summary_large_image', title: '2027년 달라지는 것 | 툴허브', description: '급여·4대보험·복지·근로 제도 변화', images: ['https://toolhub.ai.kr/og/changes-2027.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/changes-2027/' },
}

const faqs = messages.changes2027.faq.items

export default function Changes2027Page() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: '2027년 달라지는 것',
    description: '2027년부터 바뀌는 최저임금·4대보험·기준 중위소득·근로 제도를 출처와 함께 시행일 순으로 정리한 페이지.',
    url: 'https://toolhub.ai.kr/changes-2027/',
    inLanguage: 'ko-KR', dateModified: '2026-11-06',
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <Changes2027 />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
