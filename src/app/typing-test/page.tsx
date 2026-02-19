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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><TypingTest /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
