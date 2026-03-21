import { Metadata } from 'next'
import { Suspense } from 'react'
import ReactionTest from '@/components/ReactionTest'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '반응속도 테스트 - 반응 시간 측정 | 툴허브',
  description: '반응속도 테스트 - 화면이 초록색으로 변할 때 클릭하여 반응 속도를 측정합니다. 평균, 최고 기록 제공.',
  keywords: '반응속도 테스트, reaction time test, 반응 속도 측정, 반응 테스트, 클릭 속도',
  openGraph: { title: '반응속도 테스트 | 툴허브', description: '반응 속도 측정 테스트', url: 'https://toolhub.ai.kr/reaction-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '반응속도 테스트 | 툴허브', description: '반응 속도 측정 테스트' },
  alternates: { canonical: 'https://toolhub.ai.kr/reaction-test/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ReactionTest />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            반응속도 테스트란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            반응속도 테스트는 시각 자극에 대한 반응 시간을 밀리초(ms) 단위로 정확하게 측정하는 도구입니다. 화면이 신호 색상으로 바뀌는 순간 클릭하여 나의 반응 속도를 측정하고, 평균·최고 기록과 함께 등급을 확인할 수 있습니다. e스포츠 훈련, 운동 능력 평가, 수면 상태 점검 등 다양한 용도로 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            반응속도 테스트 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>정확한 측정 조건:</strong> 마우스 클릭이 키보드 입력보다 약 20ms 빠릅니다. 같은 조건에서 여러 번 측정해 평균값을 기록하면 일관성 있는 기준을 얻을 수 있습니다.</li>
            <li><strong>피로도 확인:</strong> 수면 부족이나 과로 상태에서는 반응 속도가 눈에 띄게 느려집니다. 일정 주기로 측정하면 자신의 컨디션 변화를 객관적으로 파악하는 데 도움이 됩니다.</li>
            <li><strong>e스포츠 훈련:</strong> FPS 게임에서 목표물 반응은 150~200ms 수준이 경쟁력 있는 구간입니다. 꾸준한 훈련과 측정으로 반응 속도를 향상시킬 수 있습니다.</li>
            <li><strong>예측 클릭 주의:</strong> 신호가 오기 전에 미리 클릭하면 측정값이 비정상적으로 낮게 나옵니다. 신호를 보고 반응하는 진짜 반응 시간을 측정하는 것이 중요합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
