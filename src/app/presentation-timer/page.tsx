import { Metadata } from 'next'
import { Suspense } from 'react'
import PresentationTimer from '@/components/PresentationTimer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '프레젠테이션 타이머 - 발표·회의용 카운트다운 | 툴허브',
  description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음, 프리셋으로 시간 관리를 도와드립니다.',
  keywords: '프레젠테이션 타이머, 발표 타이머, 회의 타이머, 카운트다운, 전체화면 타이머, 세미나 타이머, presentation timer, countdown timer',
  openGraph: {
    title: '프레젠테이션 타이머 - 발표·회의용 카운트다운 | 툴허브',
    description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음 지원.',
    url: 'https://toolhub.ai.kr/presentation-timer',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '프레젠테이션 타이머 - 발표·회의용 카운트다운',
    description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음 지원.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/presentation-timer/',
  },
}

export default function PresentationTimerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '프레젠테이션 타이머',
    description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음 지원.',
    url: 'https://toolhub.ai.kr/presentation-timer',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '발표 시간 카운트다운',
      '경고/위험 단계 색상 변화',
      '원형 프로그레스 링',
      '전체화면 모드',
      '알림음 (Web Audio API)',
      '시간 프리셋 (3/5/10/15/20/30분)',
      '초과 시간 표시',
      '+1분 / -1분 빠른 조절',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '프레젠테이션 타이머란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '프레젠테이션 타이머는 발표, 회의, 세미나 등에서 시간을 관리하는 도구입니다. 남은 시간에 따라 초록→노랑→빨강으로 색상이 변하여 직관적으로 시간을 확인할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전체화면 모드는 어떻게 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전체화면 버튼을 클릭하면 타이머가 화면 전체에 표시됩니다. 멀리서도 잘 보여 강연장이나 회의실에서 유용합니다. ESC 키로 전체화면을 해제할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '경고 시간과 위험 시간은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '경고 시간에 도달하면 타이머가 노란색으로 바뀌어 마무리를 준비하라는 신호를 줍니다. 위험 시간에 도달하면 빨간색으로 바뀌어 즉시 마무리해야 함을 알립니다. 각각의 시간은 설정에서 조절할 수 있습니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <PresentationTimer />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            프레젠테이션 타이머란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            프레젠테이션 타이머는 발표, 강연, 회의, 세미나에서 시간을 효과적으로 관리할 수 있도록 설계된 무료 온라인 카운트다운 도구입니다. 남은 시간에 따라 초록→노랑→빨강으로 색상이 자동 변화하여 발표자가 한눈에 시간 상황을 파악할 수 있습니다. 전체화면 모드로 청중도 함께 볼 수 있으며, 3·5·10·15·20·30분 프리셋으로 즉시 설정이 가능합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            프레젠테이션 타이머 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>전체화면 모드 활용:</strong> 발표장 노트북에 타이머를 전체화면으로 띄우면 발표자와 청중이 모두 남은 시간을 확인할 수 있어 시간 관리가 용이합니다.</li>
            <li><strong>경고 시간 설정:</strong> 총 발표 시간의 80% 지점을 경고 시간으로, 90% 지점을 위험 시간으로 설정하면 마무리 준비 신호를 체계적으로 받을 수 있습니다.</li>
            <li><strong>+1분/-1분 빠른 조절:</strong> 발표 중 질문이 길어지거나 앞당겨야 할 경우, +1분/-1분 버튼으로 실시간 조절이 가능합니다.</li>
            <li><strong>초과 시간 확인:</strong> 설정 시간을 초과하면 타이머가 초과 시간을 표시하여 얼마나 넘겼는지 정확히 알 수 있습니다. 시간 초과를 최소화하는 연습에 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
