import { Metadata } from 'next'
import { Suspense } from 'react'
import PyeongCalculator from '@/components/PyeongCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '평수 계산기 - 평↔제곱미터 면적 변환, 아파트 평수 | 툴허브',
  description: '평수 계산기 - 평(坪)과 제곱미터(m²) 간 면적 변환. 아파트 평수 계산, 부동산 면적 환산에 유용합니다. 평방피트(ft²) 변환도 지원.',
  keywords: '평수 계산기, 평 제곱미터 변환, 평수 계산, 아파트 평수, 면적 환산, pyeong calculator',
  openGraph: { title: '평수 계산기 | 툴허브', description: '평↔m² 면적 변환, 아파트 평수 계산', url: 'https://toolhub.ai.kr/pyeong-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '평수 계산기 | 툴허브', description: '평↔m² 면적 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/pyeong-calculator' },
}

export default function PyeongCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '평수 계산기', description: '평(坪)↔제곱미터(m²) 면적 변환', url: 'https://toolhub.ai.kr/pyeong-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['평→m² 변환', 'm²→평 변환', 'ft² 변환', '아파트 면적 참고'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><PyeongCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
