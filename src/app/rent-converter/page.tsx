import { Metadata } from 'next'
import { Suspense } from 'react'
import RentConverter from '@/components/RentConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전세 월세 전환 계산기 - 전월세 전환율 계산 | 툴허브',
  description: '전세 월세 전환 계산기 - 전세 보증금을 월세로, 월세를 전세금으로 변환합니다. 전월세 전환율 기준 계산, 연간 비용 비교.',
  keywords: '전세 월세 전환, 전월세 전환율, 전세 월세 계산기, 전세금 월세 변환, rent converter, 전환율 계산',
  openGraph: { title: '전세 월세 전환 계산기 | 툴허브', description: '전세↔월세 전환율 기준 변환', url: 'https://toolhub.ai.kr/rent-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '전세 월세 전환 계산기 | 툴허브', description: '전세↔월세 전환 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/rent-converter' },
}

export default function RentConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '전세 월세 전환 계산기', description: '전세↔월세 전환율 기준 변환', url: 'https://toolhub.ai.kr/rent-converter', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['전세→월세 변환', '월세→전세 변환', '전환율 계산', '연간 비용 비교'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '전월세 전환율이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '전월세 전환율은 전세 보증금을 월세로, 또는 월세를 전세금으로 환산할 때 적용하는 비율입니다. 법적 상한은 \"기준금리 + 2%\"로 한국은행 기준금리에 따라 변동됩니다. 예를 들어 기준금리 3.5%일 때 전환율 상한은 5.5%이며, 전세 1억 원 감소 시 월세 약 45.8만 원(1억 × 5.5% ÷ 12)이 적정합니다.' } },
      { '@type': 'Question', name: '전세와 월세 중 어떤 것이 유리한가요?', acceptedAnswer: { '@type': 'Answer', text: '전세는 보증금 전액을 맡기므로 월 주거비가 없고 퇴거 시 돌려받지만, 전세 사기 위험과 기회비용이 있습니다. 월세는 매월 고정 비용이 발생하지만 목돈 부담이 적습니다. 보증금 운용 수익률이 전환율보다 높으면 전세가, 낮으면 월세가 유리할 수 있습니다. 세액공제(월세 15~17%)도 고려하세요.' } },
      { '@type': 'Question', name: '적정 전월세 전환율은 어떻게 확인하나요?', acceptedAnswer: { '@type': 'Answer', text: '국토교통부 실거래가 공개시스템(rt.molit.go.kr)에서 지역별 전월세 전환율을 확인할 수 있습니다. 2024년 기준 전국 평균 전환율은 약 4.5~5.5%이며, 서울은 약 4.0~4.5%로 낮고 지방은 5~7%로 높은 편입니다. 법정 상한(기준금리+2%)을 초과하면 임차인이 초과분 반환을 청구할 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><RentConverter /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
