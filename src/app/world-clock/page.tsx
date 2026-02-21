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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '세계 시간대(타임존)는 어떻게 나뉘나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '세계는 경도 15도마다 1시간 차이가 나는 24개 시간대로 나뉩니다. 기준은 영국 그리니치 천문대(GMT/UTC)이며, 동쪽으로 갈수록 시간이 빠릅니다. 한국(KST)은 UTC+9, 일본(JST)은 UTC+9, 미국 동부(EST)는 UTC-5, 서부(PST)는 UTC-8입니다. 일부 지역은 30분(인도 UTC+5:30) 또는 45분(네팔 UTC+5:45) 단위도 있습니다. 서머타임 적용 국가는 계절에 따라 1시간 변동됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '서머타임(DST)이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '서머타임(Daylight Saving Time)은 여름철에 시계를 1시간 앞당기는 제도로, 일조 시간을 효율적으로 활용하기 위함입니다. 미국, 유럽, 호주 등 약 70개국이 시행합니다. 보통 3-4월에 시작하여 10-11월에 끝납니다. 한국, 일본, 중국 등 아시아 대부분은 서머타임을 시행하지 않습니다. EU는 2021년 서머타임 폐지를 결의했으나 아직 시행되지 않았습니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><WorldClock /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
