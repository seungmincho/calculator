import { Metadata } from 'next'
import { Suspense } from 'react'
import TypingTest from '@/components/TypingTest'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '타이핑 테스트 - 타자 속도 측정, 한글/영어 연습 | 툴허브',
  description: '타이핑 테스트 - 타자 속도(WPM/CPM) 측정, 한글/영어 타이핑 연습. 난이도별 텍스트, 정확도 분석, 기록 추적 기능.',
  keywords: '타이핑 테스트, 타자 연습, 타자 속도 측정, typing test, 타자 속도, 한글 타자 연습',
  openGraph: { title: '타이핑 테스트 | 툴허브', description: '타자 속도 측정, 한글/영어 타이핑 연습', url: 'https://toolhub.ai.kr/typing-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '타이핑 테스트 | 툴허브', description: '타자 속도 측정, 타이핑 연습' },
  alternates: { canonical: 'https://toolhub.ai.kr/typing-test/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><TypingTest />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            타이핑 테스트란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            타이핑 테스트는 분당 타자 속도(WPM/CPM)와 정확도를 측정하여 현재 실력을 진단하고 향상시키는 도구입니다. 한글과 영어 타이핑을 모두 지원하며, 난이도별 텍스트로 꾸준히 연습할 수 있습니다. 워드프로세서 자격증 시험 준비, 사무직 취업 준비, 코딩 속도 향상 등 다양한 목적에 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            타이핑 속도 향상 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>올바른 자세:</strong> 허리를 곧게 펴고 손목을 낮게 유지하며 타이핑해야 장시간 사용 시 부담이 줄어듭니다.</li>
            <li><strong>터치타이핑 연습:</strong> 키보드를 보지 않고 손가락 위치만으로 타이핑하는 습관을 들이면 장기적으로 속도가 크게 향상됩니다.</li>
            <li><strong>정확도 우선:</strong> 처음에는 속도보다 정확도에 집중하세요. 실수 없이 치는 습관이 들면 속도는 자연스럽게 따라옵니다.</li>
            <li><strong>매일 꾸준히:</strong> 하루 10~15분씩 매일 연습하는 것이 한 번에 몰아서 하는 것보다 훨씬 효과적입니다. 1달이면 눈에 띄는 실력 향상을 체감할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
