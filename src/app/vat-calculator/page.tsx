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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><VatCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
