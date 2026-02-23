import { Metadata } from 'next'
import { Suspense } from 'react'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '견적서·세금계산서 생성기 - 인보이스 PDF 출력 | 툴허브',
  description: '견적서, 세금계산서, 인보이스를 쉽게 만들고 PDF로 출력하세요. 공급가액, 부가세(10%) 자동 계산, 거래처 정보 관리, 품목 관리 기능을 제공합니다.',
  keywords: '견적서, 세금계산서, 인보이스, 견적서 만들기, 세금계산서 양식, PDF 견적서, 부가세 계산, 거래처 관리',
  openGraph: {
    title: '견적서·세금계산서 생성기 | 툴허브',
    description: '견적서, 인보이스를 쉽게 만들고 PDF로 출력하세요.',
    url: 'https://toolhub.ai.kr/invoice-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '견적서·세금계산서 생성기',
    description: '인보이스 작성 & PDF 출력',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/invoice-generator',
  },
}

export default function InvoiceGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '견적서·세금계산서 생성기',
    description: '견적서, 세금계산서, 인보이스를 만들고 PDF로 출력합니다. 부가세 자동 계산.',
    url: 'https://toolhub.ai.kr/invoice-generator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['견적서 작성', '세금계산서 생성', '부가세 자동 계산', 'PDF 출력', '인쇄 기능']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <InvoiceGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
