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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '포모도로 기법이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '포모도로 기법은 프란체스코 시릴로가 1980년대 개발한 시간 관리 방법입니다. 25분 집중 작업 후 5분 휴식을 1회(1포모도로)로 하며, 4회 완료 후 15-30분의 긴 휴식을 취합니다. 뇌의 집중력이 25분 정도 유지되는 점을 활용한 것으로, 과학적으로 입증된 생산성 향상 방법입니다. 타이머를 사용하면 시간 감각을 유지하고 과도한 몰입을 방지할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '스톱워치와 타이머의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '스톱워치는 0부터 시간을 측정하는 도구로, 경과 시간을 측정할 때 사용합니다(운동 기록, 요리 시간 측정 등). 타이머는 설정한 시간에서 0까지 카운트다운하며, 시간이 완료되면 알림을 보냅니다(요리, 시험, 회의 시간 관리 등). 웹 브라우저 기반 타이머는 탭이 백그라운드에 있어도 Web API를 통해 정확하게 동작합니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><TimerStopwatch /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
