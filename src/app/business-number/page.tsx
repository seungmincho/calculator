import { Metadata } from 'next'
import { Suspense } from 'react'
import BusinessNumber from '@/components/BusinessNumber'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '사업자등록번호 검증기 - 유효성 확인, 형식 검증 | 툴허브',
  description: '사업자등록번호 검증기 - 10자리 사업자등록번호의 유효성을 검증합니다. 체크섬 알고리즘으로 올바른 번호인지 즉시 확인하세요.',
  keywords: '사업자등록번호 검증, 사업자번호 확인, 사업자등록번호 유효성, business number validator, 사업자번호 검증기',
  openGraph: { title: '사업자등록번호 검증기 | 툴허브', description: '사업자등록번호 유효성 검증', url: 'https://toolhub.ai.kr/business-number', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '사업자등록번호 검증기 | 툴허브', description: '사업자등록번호 유효성 검증' },
  alternates: { canonical: 'https://toolhub.ai.kr/business-number' },
}

export default function BusinessNumberPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '사업자등록번호 검증기', description: '사업자등록번호 유효성 검증', url: 'https://toolhub.ai.kr/business-number', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['사업자번호 검증', '체크섬 알고리즘', '형식 확인', '검증 이력'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><BusinessNumber /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
