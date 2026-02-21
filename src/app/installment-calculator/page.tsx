import { Metadata } from 'next'
import { Suspense } from 'react'
import InstallmentCalc from '@/components/InstallmentCalc'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '카드 할부 계산기 - 할부 수수료, 월 납부금 계산 | 툴허브',
  description: '카드 할부 계산기 - 신용카드 할부 결제 시 월 납부금액과 수수료를 계산합니다. 무이자 할부, 납부 스케줄 제공.',
  keywords: '카드 할부 계산기, 할부 수수료 계산, 할부 이자 계산, installment calculator, 월 납부금',
  openGraph: { title: '카드 할부 계산기 | 툴허브', description: '할부 수수료 및 월 납부금 계산', url: 'https://toolhub.ai.kr/installment-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '카드 할부 계산기 | 툴허브', description: '할부 수수료 및 월 납부금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/installment-calculator' },
}

export default function InstallmentCalcPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '카드 할부 계산기', description: '할부 수수료 및 월 납부금 계산', url: 'https://toolhub.ai.kr/installment-calculator', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['할부 수수료', '월 납부금', '납부 스케줄', '무이자 계산'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '카드 할부 수수료율은 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '카드 할부 수수료율은 카드사와 할부 기간에 따라 다릅니다. 일반적으로 2~3개월은 연 12~15%, 6개월은 연 13~16%, 12개월은 연 14~17% 수준입니다. 무이자 할부 이벤트를 활용하면 수수료 없이 할부가 가능하지만, 가맹점이 수수료를 부담하므로 무이자 할부 가능 매장이 제한될 수 있습니다.' } },
      { '@type': 'Question', name: '무이자 할부와 유이자 할부의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '무이자 할부는 카드사 이벤트로 할부 수수료가 0%인 결제 방식입니다. 유이자 할부는 결제 금액에 할부 수수료(연 12~17%)가 추가됩니다. 예를 들어 120만 원을 12개월 유이자 할부(연 15%)로 결제하면 월 약 10.8만 원씩 납부하며 총 약 130만 원을 내게 됩니다. 부분 무이자(일부 회차만 면제)도 있으니 조건을 확인하세요.' } },
      { '@type': 'Question', name: '할부와 일시불 중 어떤 것이 유리한가요?', acceptedAnswer: { '@type': 'Answer', text: '일시불이 수수료가 없어 총 비용은 적지만, 목돈 지출 부담이 큽니다. 무이자 할부가 가능하면 현금 흐름 관리에 유리합니다. 유이자 할부는 수수료가 추가되므로 가급적 피하되, 긴급한 경우 단기(2~3개월) 할부가 이자 부담이 적습니다. 카드 실적 기준 달성을 위해 일시불이 유리한 경우도 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><InstallmentCalc /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
