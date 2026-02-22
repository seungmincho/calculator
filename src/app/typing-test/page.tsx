import { Metadata } from 'next'
import { Suspense } from 'react'
import TypingTest from '@/components/TypingTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '타이핑 테스트 - 타자 속도 측정, 한글/영어 연습 | 툴허브',
  description: '타이핑 테스트 - 타자 속도(WPM/CPM) 측정, 한글/영어 타이핑 연습. 난이도별 텍스트, 정확도 분석, 기록 추적 기능.',
  keywords: '타이핑 테스트, 타자 연습, 타자 속도 측정, typing test, 타자 속도, 한글 타자 연습',
  openGraph: { title: '타이핑 테스트 | 툴허브', description: '타자 속도 측정, 한글/영어 타이핑 연습', url: 'https://toolhub.ai.kr/typing-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '타이핑 테스트 | 툴허브', description: '타자 속도 측정, 타이핑 연습' },
  alternates: { canonical: 'https://toolhub.ai.kr/typing-test' },
}

export default function TypingTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '타이핑 테스트', description: '타자 속도 측정, 한글/영어 타이핑 연습', url: 'https://toolhub.ai.kr/typing-test', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['타자 속도 측정', '한글/영어 지원', '정확도 분석', '기록 추적'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '평균 타자 속도는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '일반인 평균 타자 속도는 분당 200-300타(한글 기준)이며, 사무직 권장 속도는 분당 400타 이상입니다. 자격증 기준: 워드프로세서 실기는 분당 400타 이상이 합격 기준입니다. 영문 기준 평균 40WPM(Words Per Minute), 전문 타이피스트는 80-120WPM입니다. 타자 속도 향상 팁: ① 올바른 자세와 손가락 위치 ② 키보드를 보지 않는 터치타이핑 ③ 매일 꾸준한 연습 ④ 정확도를 먼저, 속도는 나중에.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><TypingTest /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
