import { Metadata } from 'next'
import { Suspense } from 'react'
import PomodoroTimer from '@/components/PomodoroTimer'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '포모도로 타이머 - 25분 집중, 생산성 향상 | 툴허브',
  description: '포모도로 기법으로 25분 집중 후 5분 휴식. 집중력과 생산성을 높이는 온라인 타이머. 사용자 정의 시간, 자동 시작, 알림음 지원.',
  keywords: '포모도로, 포모도로 타이머, 집중 타이머, 생산성 타이머, 25분 타이머, Pomodoro, 뽀모도로, 집중력, 시간 관리',
  openGraph: {
    title: '포모도로 타이머 - 25분 집중, 생산성 향상 | 툴허브',
    description: '포모도로 기법으로 25분 집중 후 5분 휴식. 집중력과 생산성을 높이는 온라인 타이머.',
    url: 'https://toolhub.ai.kr/pomodoro',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '포모도로 타이머 - 25분 집중, 생산성 향상',
    description: '포모도로 기법으로 25분 집중 후 5분 휴식. 집중력과 생산성을 높이는 온라인 타이머.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/pomodoro',
  },
}

export default function PomodoroPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '포모도로 타이머',
    description: '포모도로 기법으로 25분 집중 후 5분 휴식. 집중력과 생산성을 높이는 온라인 타이머.',
    url: 'https://toolhub.ai.kr/pomodoro',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '25분 집중 타이머',
      '5분 짧은 휴식',
      '15분 긴 휴식',
      '자동 다음 단계 시작',
      '알림음 (Web Audio API)',
      '세션 통계',
      '사용자 정의 시간 설정',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '포모도로 기법이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '포모도로 기법은 25분 집중 작업 후 5분 휴식을 반복하는 시간 관리 방법입니다. 4회 작업 후에는 15-30분의 긴 휴식을 취합니다. 집중력 향상과 번아웃 방지에 효과적입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '포모도로 타이머 시간을 변경할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 설정 아이콘을 눌러 작업 시간(15-60분), 짧은 휴식(3-10분), 긴 휴식(10-30분)을 자유롭게 조정할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '포모도로 기법의 효과는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '포모도로 기법은 집중력 향상, 멀티태스킹 감소, 작업 예측 정확도 향상, 번아웃 방지에 도움을 줍니다. 정기적인 휴식을 통해 뇌를 재충전해 장시간 생산성을 유지할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <PomodoroTimer />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
