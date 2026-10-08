import { Metadata } from 'next'
import HealthInsuranceCalculator from '@/components/HealthInsuranceCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import healthInsuranceMessages from '../../../messages/generated/ko/ns/healthInsurance.json'

export const metadata: Metadata = {
  title: '건강보험료 계산기 2026 - 직장/지역가입자 보험료 계산 | 툴허브',
  description: '2026년 건강보험료(7.19%)를 정확하게 계산합니다. 직장가입자 4대보험료, 지역가입자 소득·재산 보험료, 피부양자 자격 판정, 퇴직 후 임의계속가입 vs 지역가입 비교까지 한번에 확인하세요.',
  keywords: '건강보험료 계산기, 건강보험료, 직장가입자 보험료, 지역가입자 보험료, 4대보험, 건강보험 요율, 장기요양보험, 피부양자 자격, 국민건강보험, 2026 보험료율',
  openGraph: {
    title: '건강보험료 계산기 2026 - 직장/지역가입자 | 툴허브',
    description: '2026년 직장·지역가입자 건강보험료 계산, 피부양자 판정, 퇴직 후 임의계속가입 vs 지역가입 비교',
    url: 'https://toolhub.ai.kr/health-insurance/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/health-insurance.png', width: 1200, height: 630, alt: '건강보험료 계산기 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '건강보험료 계산기 2026 | 툴허브',
    description: '직장/지역가입자 건강보험료 계산, 피부양자 판정',
    images: ['https://toolhub.ai.kr/og/health-insurance.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/health-insurance/',
  },
}

export default function HealthInsurancePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '건강보험료 계산기',
    description: '2026년 직장·지역가입자 건강보험료 계산, 피부양자 판정, 퇴직 후 임의계속가입 vs 지역가입 비교',
    url: 'https://toolhub.ai.kr/health-insurance/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2026년 건강보험료율 7.19% 반영',
      '직장가입자 4대보험 전체 계산',
      '지역가입자 소득·재산 보험료 계산',
      '피부양자 자격 판정',
      '퇴직 후 임의계속가입·지역가입 비교',
      '장기요양보험료 자동 계산',
      '보험료 상·하한(월 9,183,480원/20,160원) 반영',
      '연봉별 건강보험료 표',
      '재산 60등급 점수표·점수당 211.5원',
      '월급 외 소득(소득월액보험료) 계산',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '건강보험료 계산하는 방법',
    description: '가입자 유형과 소득을 입력하면 건강보험료와 장기요양보험료를 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '가입자 유형 선택', text: '직장가입자 또는 지역가입자를 선택합니다.' },
      { '@type': 'HowToStep', name: '소득·재산 입력', text: '직장가입자는 월 보수액을, 지역가입자는 연소득과 재산 과세표준을 입력합니다.' },
      { '@type': 'HowToStep', name: '보험료 확인', text: '건강보험료, 장기요양보험료, 4대보험 합계와 피부양자 자격 판정 결과를 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={healthInsuranceMessages.healthInsurance.guide.faq.items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <HealthInsuranceCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
