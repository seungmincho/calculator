import { Metadata } from 'next'
import { Suspense } from 'react'
import InstallmentCalc from '@/components/InstallmentCalc'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '카드 할부 계산기 - 할부 수수료, 월 납부금 계산 | 툴허브',
  description: '카드 할부 계산기 - 신용카드 할부 결제 시 월 납부금액과 수수료를 계산합니다. 무이자 할부, 납부 스케줄 제공.',
  keywords: '카드 할부 계산기, 할부 수수료 계산, 할부 이자 계산, installment calculator, 월 납부금',
  openGraph: { title: '카드 할부 계산기 | 툴허브', description: '할부 수수료 및 월 납부금 계산', url: 'https://toolhub.ai.kr/installment-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '카드 할부 계산기 | 툴허브', description: '할부 수수료 및 월 납부금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/installment-calculator/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><InstallmentCalc />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            카드 할부 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            카드 할부 계산기는 신용카드로 물품 구매 시 할부 기간별 월 납부금액과 총 할부 수수료를 미리 계산해볼 수 있는 도구입니다. 무이자 할부와 유이자 할부를 비교하고, 납부 스케줄을 확인하여 합리적인 결제 방법을 선택하는 데 도움이 됩니다. 고가 가전, 여행 패키지, 의료비 등 큰 지출 전에 반드시 확인해보세요.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            카드 할부 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>무이자 할부 찾기:</strong> 카드사별 무이자 할부 이벤트를 확인하세요. 동일한 구매라도 카드에 따라 무이자 기간이 다릅니다.</li>
            <li><strong>할부 기간과 수수료:</strong> 할부 기간이 길수록 월 부담은 줄지만 총 수수료가 증가합니다. 6개월 이내 단기 할부를 권장합니다.</li>
            <li><strong>포인트·적립 고려:</strong> 일부 카드는 할부 결제에도 포인트가 동일하게 적립되므로 실질 혜택을 비교해보세요.</li>
            <li><strong>선납 할인 확인:</strong> 카드사에 따라 할부 잔액을 조기 상환 시 남은 수수료를 환급받을 수 있습니다.</li>
            <li><strong>부분 무이자 주의:</strong> '6개월 무이자'라도 처음 1~2개월만 무이자인 경우가 있으니 조건을 꼼꼼히 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
