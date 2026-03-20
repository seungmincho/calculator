import type { Metadata } from 'next'
import CarTaxCalculator from '@/components/CarTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '자동차 취등록세 계산기 - 취득세, 등록세, 공채매수 계산',
  description: '자동차 구매 시 필요한 취등록세를 정확하게 계산하세요. 차량가격, 배기량, 차종에 따른 취득세, 등록세, 공채매수비를 자동 계산합니다.',
  keywords: '자동차 취등록세, 취득세, 등록세, 공채매수, 자동차세, 차량 취득세, 신차 등록비용',
  openGraph: {
    title: '자동차 취등록세 계산기 - 취득세, 등록세, 공채매수 계산',
    description: '자동차 구매 시 필요한 취등록세를 정확하게 계산하세요.',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/car-tax-calculator/',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/car-tax-calculator/',
  },
}

export default function CarTaxCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '자동차 취등록세 계산기',
    description: '자동차 취득세, 등록세, 공채매수비를 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/car-tax-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    permissions: 'browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    }
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '자동차 취득세율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '승용차 취득세율은 차량 가격의 7%입니다. 경차(1000cc 이하)는 4%, 화물차·승합차는 5%가 적용됩니다. 영업용 차량은 4%이며, 전기차·하이브리드차는 취득세 감면 혜택(최대 140만원)이 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '공채매입 비용이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '자동차 등록 시 지역개발공채 또는 도시철도채권을 의무 매입해야 합니다. 공채 매입률은 지역과 차량 종류에 따라 차량가의 4~12%이며, 즉시 할인 매도하면 공채 금액의 3~5%를 부담하게 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '중고차 취득세는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중고차 취득세는 실거래가가 아닌 국세청 과세표준액(시가표준액)을 기준으로 계산합니다. 시가표준액은 차량 연식에 따라 감가되며, 신차가의 약 10~70% 수준입니다. 실거래가가 시가표준액보다 높으면 실거래가 기준으로 부과됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <I18nWrapper>
        <div className="container mx-auto px-4 py-8">
          <CarTaxCalculator />
        </div>
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            자동차 취등록세 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            자동차 취등록세 계산기는 <strong>차량 구매 시 납부해야 하는 취득세·등록세·공채매입 비용을 자동으로 계산</strong>하는 도구입니다. 신차 가격과 차종(승용·화물·승합, 경차·전기차)을 입력하면 취득세율 적용 후 정확한 세금 합계를 즉시 확인할 수 있어 차량 구매 예산 계획에 필수적입니다. 딜러 견적과 비교해 세금 항목이 정확한지 검증하는 데도 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            자동차 취등록세 절감 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>경차 혜택:</strong> 배기량 1,000cc 이하 경차는 취득세율이 4%로 일반 승용차(7%)보다 낮습니다.</li>
            <li><strong>전기차 감면:</strong> 전기차·하이브리드차는 취득세 최대 140만 원 감면 혜택이 있습니다.</li>
            <li><strong>공채 즉시 매도:</strong> 의무 매입 공채는 즉시 할인 매도하면 차액만 부담해 비용을 최소화합니다.</li>
            <li><strong>지역별 공채율 확인:</strong> 공채 매입률은 등록 지역에 따라 다르므로 관할 시·도를 확인하세요.</li>
            <li><strong>중고차 시가표준액:</strong> 중고차는 실거래가와 시가표준액 중 높은 값 기준이니 차액을 미리 파악하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}