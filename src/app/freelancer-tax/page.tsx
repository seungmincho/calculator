import { Metadata } from 'next'
import { Suspense } from 'react'
import FreelancerTax from '@/components/FreelancerTax'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '프리랜서 세금 계산기 - 3.3% 원천징수, 종합소득세 환급액 계산 | 툴허브',
  description: '프리랜서·자영업자 3.3% 원천징수세와 종합소득세를 간편하게 계산하세요. 업종별 경비율(단순·기준), 소득공제 반영, 예상 환급액·추가납부액까지 한번에 확인할 수 있습니다.',
  keywords: '프리랜서 세금 계산기, 3.3% 원천징수, 종합소득세 계산, 경비율 계산, 프리랜서 환급, 단순경비율, 기준경비율, 사업소득세',
  openGraph: {
    title: '프리랜서 세금 계산기 2025 | 툴허브',
    description: '3.3% 원천징수 vs 실제 세금 비교. 업종별 경비율 반영, 환급액 자동 계산.',
    url: 'https://toolhub.ai.kr/freelancer-tax',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '프리랜서 세금 계산기 2025 | 툴허브',
    description: '3.3% 원천징수 vs 실제 종합소득세. 환급액 자동 계산.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/freelancer-tax',
  },
}

const faqData = [
  {
    question: '프리랜서 3.3% 원천징수란 무엇인가요?',
    answer: '프리랜서가 용역대금을 받을 때 소득세 3%와 지방소득세 0.3%를 합산한 3.3%가 원천징수됩니다. 이는 선납세금으로, 다음해 5월 종합소득세 신고 시 실제 세금과 비교하여 환급받거나 추가 납부합니다.',
  },
  {
    question: '단순경비율과 기준경비율의 차이는?',
    answer: '단순경비율은 수입금액에 업종별 비율을 곱해 경비를 일괄 인정하는 간편한 방식입니다. 기준경비율은 주요경비(매입비·임차료·인건비)는 증빙으로, 기타경비만 비율로 인정합니다. 일반적으로 직전년도 수입 2,400만원 미만이면 단순경비율, 이상이면 기준경비율을 적용합니다.',
  },
  {
    question: '프리랜서도 종합소득세 환급을 받을 수 있나요?',
    answer: '네, 3.3% 원천징수액이 실제 납부할 세금보다 많으면 차액을 환급받습니다. 특히 연 수입이 적거나 경비가 많은 경우, 부양가족이 있는 경우 환급 가능성이 높습니다. 매년 5월 종합소득세 신고를 통해 환급 신청합니다.',
  },
]

export default function FreelancerTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '프리랜서 세금 계산기',
    description: '프리랜서·자영업자의 3.3% 원천징수와 종합소득세를 계산하는 온라인 도구',
    url: 'https://toolhub.ai.kr/freelancer-tax',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '3.3% 원천징수 vs 실제 세금 비교',
      '업종별 경비율 (단순/기준) 자동 적용',
      '소득공제 (인적·국민연금·건강보험) 반영',
      '환급액·추가납부액 자동 계산',
      '2025년 종합소득세 세율표',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <FreelancerTax />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
