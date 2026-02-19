import { Metadata } from 'next'
import { Suspense } from 'react'
import WorldClock from '@/components/WorldClock'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '세계 시계 - 전 세계 주요 도시 현재 시간, 시차 확인 | 툴허브',
  description: '세계 시계 - 뉴욕, 런던, 도쿄 등 전 세계 주요 도시의 현재 시간과 시차를 확인하세요. 미국 시간, 유럽 시간, 일본 시간 확인.',
  keywords: '세계 시간, 세계 시계, 미국 시간, 시차 계산, world clock, 뉴욕 시간, 런던 시간',
  openGraph: { title: '세계 시계 | 툴허브', description: '전 세계 주요 도시 현재 시간, 시차 확인', url: 'https://toolhub.ai.kr/world-clock', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '세계 시계 | 툴허브', description: '세계 주요 도시 현재 시간' },
  alternates: { canonical: 'https://toolhub.ai.kr/world-clock' },
}

export default function WorldClockPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '세계 시계', description: '전 세계 주요 도시 현재 시간, 시차 확인', url: 'https://toolhub.ai.kr/world-clock', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주요 도시 시간', '시차 확인', '도시 추가', '12/24시간 형식'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><WorldClock /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
