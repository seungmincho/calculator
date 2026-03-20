import { Metadata } from 'next'
import { Suspense } from 'react'
import JeonseLoanCalculator from '@/components/JeonseLoanCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전세대출 계산기 2025 - 버팀목·청년·신혼 금리 비교 | 툴허브',
  description: '2025년 기준 전세자금대출 금리·한도·월이자를 자동 계산합니다. 버팀목, 청년 버팀목, 신혼 버팀목, 시중은행 전세대출을 한눈에 비교하세요.',
  keywords: '전세대출 계산기, 버팀목 전세대출, 청년 전세대출, 신혼 전세대출, 전세대출 금리, 전세대출 한도, 전세대출 이자, LTV, 전세보증금대출',
  openGraph: {
    title: '전세대출 계산기 2025 | 툴허브',
    description: '버팀목·청년·신혼 전세대출 금리·한도 비교, 월 이자 자동 계산.',
    url: 'https://toolhub.ai.kr/jeonse-loan',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '전세대출 계산기 2025 | 툴허브',
    description: '전세대출 금리·한도·월이자 자동계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/jeonse-loan/',
  },
}

export default function JeonseLoanPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '전세대출 계산기',
    description: '2025년 기준 전세자금대출 금리·한도·월이자를 자동 계산. 버팀목·청년·신혼·시중은행 비교.',
    url: 'https://toolhub.ai.kr/jeonse-loan/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2025년 최신 금리 반영',
      '버팀목·청년·신혼·시중은행 4종 비교',
      '소득·보증금 구간별 금리 자동 매칭',
      '만기일시/원리금균등 상환 계산',
      'LTV 기준 대출 한도 체크',
      '보증료 예상 계산',
      '자격 요건 체크리스트',
      '우대금리 자동 적용',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '전세대출이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전세대출은 전세보증금을 마련하기 위해 금융기관에서 대출받는 것입니다. 정부 지원 상품(버팀목)과 시중은행 상품이 있으며, 보증금의 70~80%까지 대출 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '버팀목 전세대출 금리는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 기준 일반 버팀목 전세대출 금리는 연 2.5%~3.5%입니다. 청년 버팀목은 연 1.3%~4.3%, 신혼 버팀목은 연 1.0%~4.3%로, 소득과 보증금 구간에 따라 차등 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '청년 전세대출 자격 조건은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '만 19세~34세(병역이행자 최대 39세), 부부합산 연소득 5천만원 이하, 순자산 3.37억원 이하 무주택자가 대상입니다. 수도권 보증금 3억원 이하, 전용 85㎡ 이하 주택이어야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전세대출 LTV란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LTV(담보인정비율)는 전세보증금 대비 대출 가능 비율입니다. 일반 버팀목은 70%, 청년·신혼 버팀목은 80%까지 대출 가능합니다. 예를 들어 보증금 2억원, LTV 80%면 최대 1.6억원 대출 가능합니다.',
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
              <JeonseLoanCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
