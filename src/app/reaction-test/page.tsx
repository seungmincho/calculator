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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '평균 반응 속도는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '시각 자극에 대한 인간의 평균 반응 속도는 약 200-250ms(밀리초)입니다. 게이머는 150-200ms, 프로 게이머는 120-150ms 수준입니다. 청각 자극은 시각보다 약 20-50ms 빠릅니다. 반응 속도에 영향을 주는 요인: ① 나이 (20대가 가장 빠름) ② 피로도와 수면 ③ 카페인 (소량은 향상) ④ 주의 집중도 ⑤ 연습. 운전, e스포츠, 스포츠 등에서 중요한 능력이며 훈련으로 개선할 수 있습니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ReactionTest /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
