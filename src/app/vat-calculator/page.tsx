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
  alternates: { canonical: 'https://toolhub.ai.kr/vat-calculator' },
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
    </>
  )
}
