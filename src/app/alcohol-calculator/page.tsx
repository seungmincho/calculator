import { Metadata } from 'next'
import { Suspense } from 'react'
import AlcoholCalculator from '@/components/AlcoholCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '혈중알코올 계산기 - 음주 후 BAC 농도 추정 | 툴허브',
  description: '혈중알코올 계산기 - 위드마크 공식으로 음주 후 혈중알코올 농도(BAC)를 추정합니다. 소주, 맥주, 와인 등 주류별 계산, 음주운전 기준 확인.',
  keywords: '혈중알코올 계산기, 음주 측정, BAC 계산, 혈중알코올 농도, 음주운전 기준, 위드마크 공식',
  openGraph: { title: '혈중알코올 계산기 | 툴허브', description: '음주 후 혈중알코올 농도 추정', url: 'https://toolhub.ai.kr/alcohol-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '혈중알코올 계산기 | 툴허브', description: '음주 후 BAC 농도 추정' },
  alternates: { canonical: 'https://toolhub.ai.kr/alcohol-calculator' },
}

export default function AlcoholCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '혈중알코올 계산기', description: '위드마크 공식으로 혈중알코올 농도(BAC) 추정', url: 'https://toolhub.ai.kr/alcohol-calculator', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['BAC 계산', '주류별 입력', '음주운전 기준', '분해 시간 추정'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><AlcoholCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
