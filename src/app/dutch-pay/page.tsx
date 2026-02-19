import { Metadata } from 'next'
import { Suspense } from 'react'
import DutchPay from '@/components/DutchPay'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '더치페이 계산기 - N/1 정산, 회식비 나누기 | 툴허브',
  description: '더치페이(N빵) 계산기로 회식비, 모임비를 정확하게 나눠보세요. 균등 분배와 각자 낸 금액 기반 차액 계산을 지원합니다.',
  keywords: '더치페이, 더치페이 계산기, N빵 계산기, 회식비 나누기, 정산 계산기, 1/N 계산',
  openGraph: {
    title: '더치페이 계산기 | 툴허브',
    description: '회식비/모임비를 정확하게 나누세요! 균등분배 & 커스텀 정산.',
    url: 'https://toolhub.ai.kr/dutch-pay',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '더치페이 계산기 | 툴허브', description: '회식비를 정확하게 나누세요!' },
  alternates: { canonical: 'https://toolhub.ai.kr/dutch-pay' },
}

export default function DutchPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '더치페이 계산기', description: '회식비, 모임비를 정확하게 나누는 더치페이 계산기',
    url: 'https://toolhub.ai.kr/dutch-pay', applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['균등 분배', '커스텀 정산', '최소 이체 횟수 계산', '결과 복사'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><DutchPay /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
