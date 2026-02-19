import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorBlindTest from '@/components/ColorBlindTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '색약 테스트 - 색각 이상 검사, 이시하라 테스트 | 툴허브',
  description: '색약 테스트 - 이시하라 색각 검사를 통해 색각 이상 여부를 확인합니다. 적녹색약, 청황색약 판별.',
  keywords: '색약 테스트, 색맹 검사, 색각 이상, color blind test, 이시하라 테스트',
  openGraph: { title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-blind-test' },
}

export default function ColorBlindTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '색약 테스트', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', applicationCategory: 'GameApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['색약 검사', '이시하라 테스트', '적녹색약', '결과 분석'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ColorBlindTest /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
