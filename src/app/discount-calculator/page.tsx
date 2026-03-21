import { Metadata } from 'next'
import { Suspense } from 'react'
import DiscountCalculator from '@/components/DiscountCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '할인 계산기 - 할인율, 할인가, 원가 계산 | 툴허브',
  description: '할인 계산기 - 할인율로 최종 가격 계산, 원가에서 할인 금액 확인, 중복 할인 계산. 쇼핑, 세일 시 유용한 할인 계산기.',
  keywords: '할인 계산기, 할인율 계산, 할인가 계산, 세일 계산, discount calculator, 퍼센트 할인',
  openGraph: { title: '할인 계산기 | 툴허브', description: '할인율, 할인가, 원가 간편 계산', url: 'https://toolhub.ai.kr/discount-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '할인 계산기 | 툴허브', description: '할인율, 할인가 간편 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/discount-calculator/' },
}

export default function DiscountCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '할인 계산기', description: '할인율, 할인가, 원가 계산기', url: 'https://toolhub.ai.kr/discount-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['할인율 계산', '할인가 계산', '중복 할인', '빠른 할인율'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '할인율은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '할인율 = (원가 - 할인가) ÷ 원가 × 100(%)입니다. 예를 들어 원가 50,000원 상품을 35,000원에 구매했다면 할인율은 (50,000 - 35,000) ÷ 50,000 × 100 = 30%입니다. 할인가 = 원가 × (1 - 할인율/100)로도 계산할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '중복 할인(추가 할인)은 어떻게 적용되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중복 할인은 순차적으로 적용됩니다. 30% 할인 후 추가 20% 할인이면 원가 × 0.7 × 0.8 = 원가 × 0.56이므로 실제 할인율은 44%입니다(50%가 아님). 10만 원 상품이라면 최종가 56,000원입니다. 쿠폰과 카드 할인이 동시 적용될 때도 같은 원리입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '1+1 행사와 50% 할인 중 어떤 것이 더 이득인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1+1은 2개를 1개 가격에 구매하는 것이므로 개당 50% 할인과 동일합니다. 하지만 실제로는 차이가 있습니다. 2개가 필요하다면 동일하지만, 1개만 필요하다면 50% 할인이 더 이득입니다. 또한 유통기한이 있는 식품의 경우 1+1으로 사도 소비하지 못하면 손해이므로 실제 사용량을 고려해야 합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><DiscountCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            할인 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            할인 계산기는 세일·할인 행사에서 최종 결제 금액을 빠르게 계산하는 생활 편의 도구입니다. 원가에서 할인율을 적용한 할인가 계산, 판매가에서 원가를 역산하는 할인율 계산, 쿠폰과 카드 할인을 동시에 적용하는 중복 할인 계산 등을 지원합니다. 쇼핑몰 세일 시즌, 블랙프라이데이, 백화점 정기세일 등에서 실제 얼마나 절약되는지 즉시 확인할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            할인 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>할인율 역산:</strong> 정가와 세일가를 입력하면 실제 할인율이 몇 %인지 자동으로 계산됩니다. 광고의 &apos;50% 할인&apos;이 실제인지 확인할 때 유용합니다.</li>
            <li><strong>중복 할인 주의:</strong> 30% 할인 + 추가 20% 할인은 합계 50%가 아니라 44% 할인입니다. 중복 할인은 순차 적용되므로 반드시 계산기로 확인하세요.</li>
            <li><strong>카드 즉시할인 포함:</strong> 쇼핑몰 할인과 특정 카드 즉시할인이 중복 적용될 때 최종 결제금액을 미리 계산하여 가장 유리한 카드를 선택하세요.</li>
            <li><strong>1+1 vs 50% 할인:</strong> 두 개를 모두 소비할 경우 동일하지만, 하나만 필요하거나 유통기한이 있다면 단순 50% 할인이 더 유리할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
