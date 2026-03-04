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
  alternates: { canonical: 'https://toolhub.ai.kr/rent-converter/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><RentConverter /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            전세 월세 전환 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            전세 월세 전환 계산기는 전세 보증금과 월세 간의 적정 전환 금액을 법정 전월세 전환율 기준으로 계산해 주는 임대차 계산 도구입니다. 집주인이 전세를 월세로 전환하거나, 세입자가 보증금 일부를 올리는 대신 월세를 낮추고 싶을 때 협상의 기준이 되는 금액을 빠르게 산출하고 연간 주거비용을 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            전세 월세 전환 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>법정 상한 전환율 확인:</strong> 전월세 전환율 법정 상한은 &quot;기준금리 + 2%&quot;입니다. 집주인이 이를 초과하는 전환을 요구하면 임차인이 초과분 반환을 요청할 수 있습니다.</li>
            <li><strong>연간 비용 비교:</strong> 전세 보증금 운용 기회비용(이자 수익)과 월세 연간 납부액을 비교하면 어느 방식이 실제로 유리한지 판단할 수 있습니다.</li>
            <li><strong>월세 세액공제 고려:</strong> 무주택 세대주 근로자는 월세의 15~17%를 세액공제 받을 수 있습니다. 이를 반영하면 월세의 실질 부담이 줄어들어 전세보다 유리해지는 경우도 있습니다.</li>
            <li><strong>보증금 조정 협상:</strong> 갱신 계약 시 전환율을 적용해 보증금 증액분에 대응하는 월세 감액분을 계산하면 협상 근거를 명확히 제시할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
