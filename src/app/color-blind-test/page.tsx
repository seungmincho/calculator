import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorBlindTest from '@/components/ColorBlindTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '색약 테스트 - 색각 이상 검사, 이시하라 테스트 | 툴허브',
  description: '색약 테스트 - 이시하라 색각 검사를 통해 색각 이상 여부를 확인합니다. 적녹색약, 청황색약 판별.',
  keywords: '색약 테스트, 색맹 검사, 색각 이상, color blind test, 이시하라 테스트',
  openGraph: { title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-blind-test/' },
}

export default function ColorBlindTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '색약 테스트', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', applicationCategory: 'GameApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['색약 검사', '이시하라 테스트', '적녹색약', '결과 분석'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '색맹과 색약의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '색맹(Color Blindness)은 특정 색상을 전혀 구분하지 못하는 상태이고, 색약(Color Weakness)은 구분은 되지만 정상보다 약하게 인식하는 상태입니다. 가장 흔한 유형: 적록 색약(남성 8%, 여성 0.5%) - 빨강과 초록 구분 어려움. 청황 색약 - 파랑과 노랑 구분 어려움. 전색맹 - 모든 색을 회색으로 인식(매우 드묾). X염색체 연관 유전이므로 남성에게 훨씬 많습니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ColorBlindTest /></I18nWrapper></Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              색약 테스트란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              색약 테스트는 <strong>이시하라(Ishihara) 색각 검사를 통해 적록 색약·청황 색약 등 색각 이상 여부를 간편하게 확인</strong>하는 도구입니다. 점들로 이루어진 원판 속에 숨겨진 숫자나 선을 얼마나 잘 인식하는지 테스트하며, 결과를 통해 색각 유형을 분류합니다. 운전면허 취득, 특수 직업 지원, 디자인·그래픽 작업 전 색각 상태를 확인하는 데 활용할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              색약 테스트 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>정확한 환경:</strong> 밝은 자연광 또는 적절한 조명 아래서 테스트해야 가장 정확한 결과를 얻습니다.</li>
              <li><strong>화면 밝기:</strong> 모니터 밝기를 적정 수준(50~70%)으로 설정하고 테스트하세요.</li>
              <li><strong>스크리닝 용도:</strong> 이 테스트는 참고용이며 정확한 진단은 안과 전문의에게 받아야 합니다.</li>
              <li><strong>디자이너 활용:</strong> 색각 이상자를 위한 접근성 디자인을 고려할 때 색약 시뮬레이터와 함께 활용하세요.</li>
              <li><strong>어린이 검사:</strong> 만 4세 이상 어린이도 테스트할 수 있으며 조기 발견이 교육에 도움이 됩니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
