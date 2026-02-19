import { Metadata } from 'next'
import { Suspense } from 'react'
import TimerStopwatch from '@/components/TimerStopwatch'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '타이머/스톱워치 - 카운트다운, 뽀모도로 타이머 | 툴허브',
  description: '온라인 타이머, 스톱워치, 뽀모도로 타이머 - 랩 기록, 카운트다운 알람, 집중 시간 관리를 한 곳에서.',
  keywords: '타이머, 스톱워치, 뽀모도로, 카운트다운, 온라인 타이머, stopwatch, pomodoro timer',
  openGraph: {
    title: '타이머/스톱워치 | 툴허브',
    description: '스톱워치, 카운트다운 타이머, 뽀모도로 타이머',
    url: 'https://toolhub.ai.kr/timer',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '타이머/스톱워치 | 툴허브', description: '스톱워치, 타이머, 뽀모도로' },
  alternates: { canonical: 'https://toolhub.ai.kr/timer' },
}

export default function TimerPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '타이머/스톱워치', description: '스톱워치, 카운트다운 타이머, 뽀모도로 타이머',
    url: 'https://toolhub.ai.kr/timer', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['스톱워치 (랩 기록)', '카운트다운 타이머', '뽀모도로 타이머'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><TimerStopwatch /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
