import { Metadata } from 'next'
import { Suspense } from 'react'
import VatCalculator from '@/components/VatCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '부가세 계산기 - 부가가치세 10% 계산, 역산 | 툴허브',
  description: '부가세 계산기 - 공급가액에서 부가가치세(10%) 계산, 합계금액에서 부가세 역산. 세금계산서 작성, 사업자 부가세 신고에 유용.',
  keywords: '부가세 계산기, 부가가치세 계산, VAT 계산, 부가세 역산, 공급가액 계산, 세금계산서',
  openGraph: { title: '부가세 계산기 | 툴허브', description: '부가가치세 10% 계산, 역산', url: 'https://toolhub.ai.kr/vat-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '부가세 계산기 | 툴허브', description: '부가가치세 계산, 역산' },
  alternates: { canonical: 'https://toolhub.ai.kr/vat-calculator/' },
}

export default function VatCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '부가세 계산기', description: '부가가치세 10% 계산, 역산', url: 'https://toolhub.ai.kr/vat-calculator', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['부가세 계산', '부가세 역산', '세금계산서 양식', '빠른 금액 입력'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '부가가치세율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국의 부가가치세율은 10%입니다. 공급가액에 10%를 곱하면 부가세가 산출됩니다. 예를 들어 공급가액이 100만 원이면 부가세는 10만 원, 합계금액은 110만 원이 됩니다. 면세 대상(농산물, 의료, 교육 등)은 부가세가 부과되지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '합계금액에서 부가세를 역산하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '합계금액(부가세 포함 금액)에서 역산할 때는 합계금액 ÷ 1.1로 공급가액을 구합니다. 부가세는 합계금액 - 공급가액 또는 합계금액 ÷ 11로 계산할 수 있습니다. 예를 들어 합계금액이 110만 원이면 공급가액 100만 원, 부가세 10만 원입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '간이과세자와 일반과세자의 부가세 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '일반과세자는 매출세액(매출의 10%)에서 매입세액을 차감하여 부가세를 납부합니다. 간이과세자는 연매출 1억 400만 원 미만의 소규모 사업자로, 업종별 부가가치율(5~30%)을 적용하여 세금이 줄어듭니다. 연매출 4,800만 원 미만이면 부가세 납부가 면제됩니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><VatCalculator /></I18nWrapper></Suspense>
        </div>
      </div>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            부가세 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            부가세 계산기는 한국 부가가치세(VAT) 10%를 빠르게 계산하거나 역산하는 도구입니다. 공급가액(세전 금액)을 입력하면 부가세와 합계금액을 자동 산출하고, 반대로 부가세 포함 합계금액을 입력하면 공급가액을 역산합니다. 세금계산서 발행, 사업자 부가세 신고, 견적서 및 계약서 금액 계산, 소비자 가격에서 공급가 환산 등 비즈니스 실무에 필수적인 도구입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            부가세 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>부가세 역산:</strong> 소비자가격(부가세 포함)에서 공급가를 구하려면 합계금액을 1.1로 나누세요. 예를 들어 110만 원 → 공급가 100만 원, 부가세 10만 원입니다.</li>
            <li><strong>세금계산서 작성:</strong> 공급가액, 부가세, 합계금액 세 항목이 정확해야 전자세금계산서를 오류 없이 발행할 수 있습니다.</li>
            <li><strong>면세 품목 확인:</strong> 농·수·축·임산물, 의료 서비스, 교육비, 금융 서비스 등은 부가세가 면제됩니다. 해당 품목 거래 시 부가세를 별도 청구하면 안 됩니다.</li>
            <li><strong>부가세 신고:</strong> 일반과세자는 연 2회(1월, 7월), 간이과세자는 연 1회(1월) 부가가치세를 신고·납부합니다. 매출세액에서 매입세액을 공제하면 납부세액이 산출됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
