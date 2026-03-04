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
  alternates: { canonical: 'https://toolhub.ai.kr/world-clock/' },
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

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            세계 시계란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            세계 시계는 뉴욕, 런던, 도쿄, 베이징, 시드니 등 전 세계 주요 도시의 현재 시간을 실시간으로 표시하고 시차를 한눈에 비교할 수 있는 도구입니다. 한국 시간(KST, UTC+9)을 기준으로 미국·유럽·동남아 등 주요 시간대를 동시에 확인하며, 서머타임(DST) 적용 국가의 시간도 자동으로 반영합니다. 해외 출장 일정 조율, 글로벌 팀 화상 회의 시간 설정, 해외 가족·친구와의 통화 시간 확인에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            세계 시계 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>주요 시차 기준:</strong> 한국(KST)은 UTC+9입니다. 뉴욕(EST)은 한국보다 14시간, 런던(GMT)은 9시간, 파리(CET)는 8시간 느립니다. 서머타임 기간에는 1시간씩 달라집니다.</li>
            <li><strong>글로벌 팀 미팅:</strong> 서울 오후 2시에 미팅 시 뉴욕은 새벽 1시, 런던은 오전 6시입니다. 모든 참가자가 업무 시간인 황금 시간대를 찾는 데 세계 시계를 활용하세요.</li>
            <li><strong>서머타임 자동 반영:</strong> 미국·유럽은 봄·가을에 서머타임 전환으로 시차가 1시간 변동됩니다. 세계 시계는 이를 자동으로 반영하여 정확한 현지 시간을 표시합니다.</li>
            <li><strong>도시 추가:</strong> 기본 제공 도시 외에 원하는 도시를 추가하여 자주 확인하는 시간대를 맞춤 설정할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
