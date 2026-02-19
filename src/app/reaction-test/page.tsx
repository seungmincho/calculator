import { Metadata } from 'next'
import { Suspense } from 'react'
import ReactionTest from '@/components/ReactionTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '반응속도 테스트 - 반응 시간 측정 | 툴허브',
  description: '반응속도 테스트 - 화면이 초록색으로 변할 때 클릭하여 반응 속도를 측정합니다. 평균, 최고 기록 제공.',
  keywords: '반응속도 테스트, reaction time test, 반응 속도 측정, 반응 테스트, 클릭 속도',
  openGraph: { title: '반응속도 테스트 | 툴허브', description: '반응 속도 측정 테스트', url: 'https://toolhub.ai.kr/reaction-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '반응속도 테스트 | 툴허브', description: '반응 속도 측정 테스트' },
  alternates: { canonical: 'https://toolhub.ai.kr/reaction-test' },
}

export default function ReactionTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '반응속도 테스트', description: '반응 속도 측정 테스트', url: 'https://toolhub.ai.kr/reaction-test', applicationCategory: 'GameApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['반응 속도 측정', '평균 기록', '최고 기록', '등급 평가'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ReactionTest /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
