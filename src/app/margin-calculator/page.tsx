import { Metadata } from 'next'
import { Suspense } from 'react'
import MarginCalculator from '@/components/MarginCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '마진 계산기 - 온라인 셀러 순이익·마진율 계산 | 툴허브',
  description: '온라인 셀러를 위한 마진 계산기. 쿠팡·스마트스토어·11번가 수수료, 배송비, 포장비, 부가세를 반영한 실제 순이익과 마진율을 계산하세요.',
  keywords: '마진 계산기, 순이익 계산, 마진율, 마크업률, 쿠팡 수수료, 스마트스토어 수수료, 온라인 셀러, 판매가 계산, 손익분기점',
  openGraph: {
    title: '마진 계산기 | 툴허브',
    description: '온라인 셀러 순이익·마진율 자동 계산. 플랫폼 수수료·배송비·부가세 반영.',
    url: 'https://toolhub.ai.kr/margin-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '마진 계산기 | 툴허브',
    description: '온라인 셀러 순이익·마진율 자동계산',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/margin-calculator/' },
}

export default function MarginCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '마진 계산기',
    description: '온라인 셀러를 위한 순이익·마진율 자동 계산. 플랫폼 수수료·배송비·부가세 반영.',
    url: 'https://toolhub.ai.kr/margin-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['쿠팡·스마트스토어·11번가 수수료', '마진율·마크업률 계산', '역산: 목표 마진율→판매가', '부가세 자동 계산', '비용 구성 시각화', '월간 시뮬레이션'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '마진율과 마크업률의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '마진율은 판매가 대비 이익 비율(순이익/판매가×100), 마크업률은 원가 대비 이익 비율(순이익/원가×100)입니다. 같은 상품이라도 마크업률이 항상 더 높게 나옵니다.' } },
      { '@type': 'Question', name: '쿠팡 판매 수수료는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '쿠팡 판매 수수료는 카테고리별로 4%~10.9%입니다. 최종 결제금액(배송비 포함) 기준으로 부과되며, 월 서비스 이용료 55,000원이 별도로 있습니다(월매출 100만원 초과 시).' } },
      { '@type': 'Question', name: '부가세는 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '일반과세자는 매출세액(판매가의 10%)에서 매입세액(원가의 10%)을 뺀 차액을 납부합니다. 실질적으로 마진(판매가-원가)의 약 10%가 부가세입니다. 간이과세자는 낮은 부가가치율이 적용됩니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper><MarginCalculator /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
