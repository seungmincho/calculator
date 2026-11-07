import { Metadata } from 'next'
import BasicPension from '@/components/BasicPension'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/basicPension.json'

const TITLE = '기초연금 계산기 - 2026 수급자격·수령액 | 툴허브'
const DESC = '소득·재산을 넣으면 2026년 기초연금 소득인정액을 계산해 선정기준액(단독 247만원·부부 395.2만원)과 비교하고, 예상 월 수령액을 보여 줘요. 기준연금액 349,700원, 부부 20% 감액, 소득역전 방지 감액, 국민연금 연계 감액까지 법령 기준으로 계산합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '기초연금 계산기, 기초연금 수급자격, 기초연금 소득인정액, 기초연금 선정기준액 2026, 기초연금 국민연금 감액, 기초연금 부부감액, 기초연금 모의계산, 기초연금 재산 기준, 기초연금 수령액, 2026 기초연금',
  openGraph: {
    title: TITLE,
    description: '2026 기초연금 소득인정액·선정기준액 비교와 예상 수령액(부부·국민연금 연계 감액)',
    url: 'https://toolhub.ai.kr/basic-pension/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/basic-pension.png', width: 1200, height: 630, alt: '기초연금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '기초연금 계산기 | 툴허브', description: '2026 기초연금 수급자격과 예상 수령액 계산', images: ['https://toolhub.ai.kr/og/basic-pension.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/basic-pension/' },
}

const faqs = messages.basicPension.guide.faq.items

export default function BasicPensionPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '기초연금 계산기',
    description: '2026년 기초연금 소득인정액(소득평가액 + 재산의 소득환산액)을 계산해 선정기준액과 비교하고, 기준연금액·부부감액·소득역전 방지 감액·국민연금 연계 감액을 반영한 예상 월액을 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/basic-pension/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026 선정기준액(단독 247만원·부부 395.2만원) 비교', '근로소득 116만원 공제와 30% 추가 공제', '대도시·중소도시·농어촌 기본재산액과 금융재산 2,000만원 공제', '재산의 소득환산(연 4%)과 고급자동차 기준', '기준연금액 349,700원·부부 20% 감액·소득역전 방지 감액', '국민연금 연계 감액(A급여 산식·250% 산식)'],
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
            <BasicPension />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
