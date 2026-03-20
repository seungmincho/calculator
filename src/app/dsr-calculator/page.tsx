import { Metadata } from 'next'
import { Suspense } from 'react'
import DsrCalculator from '@/components/DsrCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'DSR 계산기 2025 - 대출한도 역산, 스트레스 DSR | 툴허브',
  description: '2025년 기준 DSR(총부채원리금상환비율)을 자동 계산합니다. 주담대·신용대출·카드론 원리금 산정, 스트레스 DSR 3단계 반영, 대출한도 역산까지 한눈에 확인하세요.',
  keywords: 'DSR 계산기, 총부채원리금상환비율, 대출한도 계산, 스트레스 DSR, DSR 40%, 대출 가능액, 주택담보대출 한도, 신용대출 DSR',
  openGraph: {
    title: 'DSR 계산기 2025 | 툴허브',
    description: 'DSR 계산 + 대출한도 역산 + 스트레스 DSR 반영',
    url: 'https://toolhub.ai.kr/dsr-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DSR 계산기 2025 | 툴허브',
    description: 'DSR 계산 + 대출한도 역산',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/dsr-calculator/' },
}

export default function DsrCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'DSR 계산기',
    description: '2025년 기준 DSR 계산, 대출한도 역산, 스트레스 DSR 3단계 반영.',
    url: 'https://toolhub.ai.kr/dsr-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['DSR 자동 계산', '대출한도 역산', '스트레스 DSR 3단계', '대출 유형별 원리금 산정', '기존 대출 합산', 'DSR 게이지 시각화'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'DSR이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: 'DSR(총부채원리금상환비율)은 모든 대출의 연간 원리금 상환액을 연소득으로 나눈 비율입니다. 은행권은 40%, 비은행권은 50%를 초과할 수 없습니다.' } },
      { '@type': 'Question', name: '스트레스 DSR이란?', acceptedAnswer: { '@type': 'Answer', text: '스트레스 DSR은 금리 상승 위험을 반영하여 실제 금리보다 높은 금리로 DSR을 계산하는 제도입니다. 2025년 3단계 기준 변동금리 주담대에 1.50%p를 가산합니다.' } },
      { '@type': 'Question', name: '전세대출도 DSR에 포함되나요?', acceptedAnswer: { '@type': 'Answer', text: '전세자금대출은 주거안정 목적으로 DSR 산정에서 제외됩니다. 다만 시중은행 전세대출의 경우 이자 상환분만 산입될 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper><DsrCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
