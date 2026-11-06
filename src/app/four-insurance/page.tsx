import { Metadata } from 'next'
import FourInsurance from '@/components/FourInsurance'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/fourInsurance.json'

export const metadata: Metadata = {
  title: '4대보험 계산기 - 근로자·회사 부담과 2027 요율 | 툴허브',
  description: '월급이나 연봉을 넣으면 국민연금·건강보험·장기요양·고용보험·산재보험을 근로자와 회사 몫으로 나눠 계산합니다. 2027년 국민연금 10%·장기요양 13.90% 인상 반영, 2026년과 비교, 회사 총 인건비까지.',
  keywords: '4대보험 계산기, 4대보험 요율 2027, 2027 4대보험, 4대보험 계산, 사업주 4대보험 부담, 회사 4대보험, 국민연금 10%, 장기요양보험료율 2027, 월급 300 4대보험, 인건비 계산',
  openGraph: {
    title: '4대보험 계산기 - 근로자·회사 부담과 2027 요율 | 툴허브',
    description: '국민연금·건강·장기요양·고용·산재보험을 근로자와 회사 몫으로 나눠 계산하고 2027년과 비교.',
    url: 'https://toolhub.ai.kr/four-insurance/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/four-insurance.png', width: 1200, height: 630, alt: '4대보험 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '4대보험 계산기 | 툴허브', description: '근로자·회사 부담과 2027 요율 비교', images: ['https://toolhub.ai.kr/og/four-insurance.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/four-insurance/' },
}

const faqs = messages.fourInsurance.guide.faq.items

export default function FourInsurancePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '4대보험 계산기',
    description: '직장가입자 4대보험(국민연금·건강보험·장기요양·고용보험·산재보험)을 근로자·사업주 부담으로 나눠 계산하고 2026·2027년 요율을 비교하는 도구.',
    url: 'https://toolhub.ai.kr/four-insurance/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['근로자·사업주 항목별 부담', '2026·2027 요율 비교', '국민연금 상·하한', '회사 규모별 고용안정·직업능력개발', '산재보험 요율 입력', '회사 총 인건비', '결과 공유 링크·이미지'],
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
            <FourInsurance />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
