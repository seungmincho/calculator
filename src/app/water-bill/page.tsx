import { Metadata } from 'next'
import { Suspense } from 'react'
import WaterBillCalculator from '@/components/WaterBillCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '수도요금 계산기 - 수도 사용량별 요금 계산 | 툴허브',
  description: '수도요금 계산기 - 월 수도 사용량(m³)을 입력하면 누진제 기준으로 수도요금을 계산합니다. 하수도요금, 물이용부담금, 부가세 포함.',
  keywords: '수도요금 계산기, 수도요금 계산, 수도세 계산, 물값 계산, water bill calculator',
  openGraph: { title: '수도요금 계산기 | 툴허브', description: '수도 사용량별 요금 계산', url: 'https://toolhub.ai.kr/water-bill', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '수도요금 계산기 | 툴허브', description: '수도요금 누진제 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/water-bill' },
}

export default function WaterBillPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '수도요금 계산기', description: '수도 사용량별 요금 누진제 계산', url: 'https://toolhub.ai.kr/water-bill', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['누진제 수도요금', '하수도요금', '물이용부담금', '절약 팁'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '수도요금 누진제 구간은 어떻게 되나요?', acceptedAnswer: { '@type': 'Answer', text: '주택용 수도요금은 사용량에 따라 4~5단계 누진제가 적용됩니다. 서울 기준 1단계(0~30m³)는 m³당 360원, 2단계(31~50m³) 550원, 3단계(51m³ 이상) 790원입니다. 여기에 하수도 요금(사용량의 100%), 물이용부담금(m³당 170원), 부가가치세(10%)가 추가됩니다. 지역별로 단가가 다릅니다.' } },
      { '@type': 'Question', name: '수도요금에 하수도 요금이 포함되나요?', acceptedAnswer: { '@type': 'Answer', text: '네, 수도 고지서에는 상수도 요금과 하수도 요금이 함께 부과됩니다. 하수도 요금은 상수도 사용량을 기준으로 계산되며, 보통 상수도 요금과 비슷한 수준입니다. 추가로 물이용부담금(한강 수질 개선 용도)도 포함되어 실제 납부액은 순수 수도요금의 2~2.5배 수준입니다.' } },
      { '@type': 'Question', name: '수도 요금을 절약하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '수도요금 절약법: ① 절수 샤워헤드 교체(최대 40% 절감) ② 양변기 절수 부속 설치 ③ 세탁기 모아서 돌리기 ④ 설거지 시 물 받아서 사용 ⑤ 세차 시 양동이 사용. 4인 가구 기준 월 평균 사용량은 약 15~20m³이며, 절수 습관으로 월 3~5m³ 절약이 가능합니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><WaterBillCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
