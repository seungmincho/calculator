import { Metadata } from 'next'
import DependentEligibility from '@/components/DependentEligibility'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/dependentEligibility.json'

const TITLE = '피부양자 자격 계산기 - 소득·재산 탈락 기준 | 툴허브'
const DESC = '건강보험 피부양자 자격을 부양·소득·재산 요건으로 판정해요. 소득 연 2,000만원, 사업소득 500만원, 재산 과표 5.4억·9억(소득 1,000만원), 형제자매 1.8억 기준을 법령 그대로 적용하고, 탈락하면 예상 지역보험료와 11월 반영 시기까지 알려 줘요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '피부양자 자격, 피부양자 자격 계산기, 피부양자 탈락 기준, 피부양자 소득 기준, 피부양자 재산 기준, 피부양자 탈락 건강보험료, 건강보험 피부양자, 형제자매 피부양자, 피부양자 연금 2000만원, 피부양자 재산세 과세표준',
  openGraph: {
    title: TITLE,
    description: '건강보험 피부양자 부양·소득·재산 요건 판정과 탈락 시 예상 지역보험료',
    url: 'https://toolhub.ai.kr/dependent-eligibility/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dependent-eligibility.png', width: 1200, height: 630, alt: '피부양자 자격 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '피부양자 자격 계산기 | 툴허브', description: '피부양자 소득·재산 탈락 기준 판정', images: ['https://toolhub.ai.kr/og/dependent-eligibility.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/dependent-eligibility/' },
}

const faqs = messages.dependentEligibility.guide.faq.items

export default function DependentEligibilityPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '피부양자 자격 계산기',
    description: '국민건강보험법 시행규칙 별표 1·별표 1의2 기준으로 건강보험 피부양자의 부양·소득·재산 요건을 판정하고, 요건을 못 채우면 지역가입자 예상 보험료를 어림하는 도구.',
    url: 'https://toolhub.ai.kr/dependent-eligibility/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['관계·동거 여부별 부양요건 판정', '소득 합계 연 2,000만원·사업소득 500만원 기준', '재산 과표 5.4억·9억·형제자매 1.8억 기준', '탈락 시 예상 지역보험료', '소득·재산 자료 반영 시기 안내', '결과 공유 링크'],
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
            <DependentEligibility />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
