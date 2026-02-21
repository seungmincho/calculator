import { Metadata } from 'next'
import { Suspense } from 'react'
import ShippingCalc from '@/components/ShippingCalc'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '배송비 계산기 - 택배 요금 비교, 무게별 배송료 | 툴허브',
  description: '배송비 계산기 - 택배사별 배송 요금을 비교하고 무게, 크기별 배송료를 계산합니다. CJ대한통운, 한진, 로젠 등.',
  keywords: '배송비 계산기, 택배 요금 계산, 택배비 비교, shipping calculator, 배송료 계산',
  openGraph: { title: '배송비 계산기 | 툴허브', description: '택배사별 배송 요금 비교 계산', url: 'https://toolhub.ai.kr/shipping-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '배송비 계산기 | 툴허브', description: '택배사별 배송 요금 비교 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/shipping-calculator' },
}

export default function ShippingCalcPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '배송비 계산기', description: '택배사별 배송 요금 비교 계산', url: 'https://toolhub.ai.kr/shipping-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['택배사별 요금', '무게별 계산', '크기별 계산', '요금 비교'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '택배 요금은 어떻게 결정되나요?', acceptedAnswer: { '@type': 'Answer', text: '택배 요금은 실제 무게와 부피 무게 중 큰 값을 기준으로 책정됩니다. 부피 무게(kg) = 가로(cm) × 세로(cm) × 높이(cm) ÷ 6,000입니다. 예를 들어 60×40×40cm 박스의 부피 무게는 16kg입니다. 일반 택배(CJ대한통운, 한진 등)는 5kg 이하 약 3,500~4,000원, 10kg 이하 약 5,000~6,000원, 20kg 이하 약 6,000~8,000원 수준입니다.' } },
      { '@type': 'Question', name: '택배사별 요금 차이가 있나요?', acceptedAnswer: { '@type': 'Answer', text: 'CJ대한통운, 한진, 롯데택배, 로젠 등 주요 택배사의 개인 발송 요금은 비슷한 수준이지만, 계약 택배(편의점 택배)가 일반적으로 저렴합니다. 편의점 택배는 GS25(CJ), CU(대한통운) 등에서 5kg 이하 약 3,000~3,500원에 발송 가능합니다. 대량 발송 시 택배사와 월 계약을 하면 40~60% 할인받을 수 있습니다.' } },
      { '@type': 'Question', name: '해외 배송비는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '해외 배송비는 목적지, 무게, 배송 방법에 따라 크게 다릅니다. EMS 기준 일본/중국 0.5kg 약 15,000원, 미국 약 22,000원입니다. K-Packet(소형포장물)은 2kg 이하 약 8,000~15,000원으로 저렴합니다. 해외직구 역직구 시 무게와 관세를 함께 고려해야 하며, 미국은 $200, 한국은 $150 이하 면세입니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ShippingCalc /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
