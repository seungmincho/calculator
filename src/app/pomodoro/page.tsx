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
    canonical: 'https://toolhub.ai.kr/pomodoro/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            포모도로 타이머란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            포모도로 타이머는 이탈리아어로 '토마토'를 뜻하는 포모도로 기법에 기반한 생산성 시간 관리 도구입니다. 25분 집중 작업 후 5분 짧은 휴식, 4회 반복 후 15분 긴 휴식을 자동으로 안내합니다. 뇌가 집중력을 유지할 수 있는 최적의 주기를 활용하여 번아웃 없이 오랜 시간 작업 효율을 높일 수 있으며, 학생·직장인·프리랜서에게 널리 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            포모도로 기법 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>방해 요소 차단:</strong> 포모도로 세션 시작 전 휴대폰 알림을 끄고, 이메일·SNS 탭을 닫아 25분간 완전히 한 가지 작업에만 집중하세요.</li>
            <li><strong>작업 단위 분할:</strong> 큰 프로젝트는 포모도로 단위로 쪼개 계획하세요. '보고서 초안 작성 - 2 포모도로'처럼 구체적으로 정하면 완료감이 높아집니다.</li>
            <li><strong>휴식 시간 활용:</strong> 짧은 휴식 5분은 스트레칭, 물 마시기 등 몸을 움직이는 활동을 하세요. 화면을 계속 보면 뇌가 쉬지 못합니다.</li>
            <li><strong>세션 시간 커스텀:</strong> 집중력이 높은 사람은 작업 시간을 35~45분으로 늘리고, 집중이 어렵다면 15~20분으로 줄여 자신에게 맞는 리듬을 찾아보세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
