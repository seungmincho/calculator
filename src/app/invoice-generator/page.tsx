import { Metadata } from 'next'
import { Suspense } from 'react'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/invoice-generator/',
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
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            견적서·세금계산서 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            견적서·세금계산서 생성기는 프리랜서, 소상공인, 개인사업자가 거래처에 발행하는 견적서와 세금계산서를 손쉽게 작성하고 PDF로 출력할 수 있는 도구입니다. 공급가액과 부가세(10%)를 자동으로 계산하며, 거래처 정보와 품목 내역을 입력하면 전문적인 양식의 문서를 즉시 생성합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            견적서·세금계산서 작성 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>견적서와 세금계산서 차이:</strong> 견적서는 거래 전 금액을 안내하는 문서이고, 세금계산서는 거래 완료 후 부가세를 포함한 공식 세금 증빙 서류입니다.</li>
            <li><strong>부가세 별도 표기:</strong> 공급가액과 부가세(10%)를 반드시 분리하여 표기해야 세금계산서로서 효력이 있습니다.</li>
            <li><strong>사업자등록번호 확인:</strong> 거래처 사업자등록번호를 정확히 입력해야 세금 공제 신청 시 문제가 없습니다.</li>
            <li><strong>PDF 출력 활용:</strong> 출력된 PDF를 이메일 첨부 또는 카카오톡으로 거래처에 즉시 전달할 수 있습니다.</li>
            <li><strong>전자세금계산서 주의:</strong> 법적 효력이 있는 공식 세금계산서는 홈택스 전자세금계산서로 발행해야 합니다. 이 도구는 내부용·참고용으로 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
