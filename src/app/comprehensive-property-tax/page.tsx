import { Metadata } from 'next'
import { Suspense } from 'react'
import ComprehensivePropertyTax from '@/components/ComprehensivePropertyTax'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '종합부동산세 계산기 2025 - 종부세 자동계산, 세율표, 세액공제 | 툴허브',
  description: '2025년 종합부동산세(종부세)를 자동으로 계산합니다. 1세대1주택·다주택·법인별 세율, 공정시장가액비율 60%, 고령자·장기보유 세액공제, 세부담상한, 농어촌특별세까지 단계별로 확인하세요.',
  keywords: '종합부동산세 계산기, 종부세 계산기, 종부세 2025, 종부세 세율, 종부세 공제, 공정시장가액비율, 고령자 세액공제, 장기보유 세액공제, 세부담상한, 농어촌특별세, 다주택 종부세, 법인 종부세',
  openGraph: {
    title: '종합부동산세 계산기 2025 | 툴허브',
    description: '2025년 종부세 자동계산. 납세자 유형별 세율, 세액공제, 세부담상한까지 단계별 분석.',
    url: 'https://toolhub.ai.kr/comprehensive-property-tax/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '종합부동산세 계산기 2025 | 툴허브',
    description: '종부세 자동계산 - 세율, 세액공제, 농어촌특별세',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/comprehensive-property-tax/',
  },
}

export default function ComprehensivePropertyTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '종합부동산세 계산기',
    description: '2025년 종합부동산세(종부세) 자동계산. 납세자 유형별 세율, 세액공제, 세부담상한 분석.',
    url: 'https://toolhub.ai.kr/comprehensive-property-tax/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2025년 최신 종부세 세율 반영',
      '1세대1주택·일반·3주택이상·법인 구분',
      '공정시장가액비율 60% 자동 적용',
      '고령자·장기보유 세액공제 계산',
      '세부담상한 (150%/300%) 적용',
      '농어촌특별세 자동 계산',
      '다주택 합산 공시가격 입력',
      '단계별 계산 과정 상세 표시',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '종합부동산세란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '종합부동산세(종부세)는 일정 금액 이상의 부동산을 보유한 사람에게 부과되는 국세입니다. 주택의 경우 공시가격 합산액이 기본공제(1세대1주택 12억원, 일반 9억원)를 초과하면 과세 대상이 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '2025년 종부세 공정시장가액비율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 종합부동산세 공정시장가액비율은 60%입니다. 공시가격 합산액에 60%를 곱한 후 기본공제를 차감하여 과세표준을 산출합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '1세대1주택자 종부세 혜택은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1세대1주택자는 기본공제 12억원(일반 9억원 대비 3억원 추가), 고령자 세액공제(최대 30%), 장기보유 세액공제(최대 50%)를 받을 수 있습니다. 두 공제의 합산 한도는 80%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '세부담상한이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '세부담상한은 전년도 종부세 대비 급격한 세금 인상을 방지하는 제도입니다. 일반(2주택 이하)은 전년도 세액의 150%, 3주택 이상 및 법인은 300%를 초과할 수 없습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <ComprehensivePropertyTax />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
