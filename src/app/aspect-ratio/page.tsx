import { Metadata } from 'next'
import { Suspense } from 'react'
import AspectRatio from '@/components/AspectRatio'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '화면 비율 계산기 - 종횡비, 해상도 계산 | 툴허브',
  description: '화면 비율 계산기 - 가로세로 비율(종횡비) 계산, 해상도 변환, 비율 유지 리사이즈. 주요 해상도 프리셋 제공.',
  keywords: '화면 비율 계산기, aspect ratio calculator, 종횡비, 해상도 계산, 16:9, 4:3',
  openGraph: { title: '화면 비율 계산기 | 툴허브', description: '종횡비 및 해상도 계산', url: 'https://toolhub.ai.kr/aspect-ratio', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '화면 비율 계산기 | 툴허브', description: '종횡비 및 해상도 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/aspect-ratio' },
}

export default function AspectRatioPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '화면 비율 계산기', description: '종횡비 및 해상도 계산', url: 'https://toolhub.ai.kr/aspect-ratio', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['종횡비 계산', '해상도 변환', '비율 유지 리사이즈', '프리셋 해상도'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><AspectRatio /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
