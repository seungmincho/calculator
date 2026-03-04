import { Metadata } from 'next'
import { Suspense } from 'react'
import PyeongCalculator from '@/components/PyeongCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '평수 계산기 - 평↔제곱미터 면적 변환, 아파트 평수 | 툴허브',
  description: '평수 계산기 - 평(坪)과 제곱미터(m²) 간 면적 변환. 아파트 평수 계산, 부동산 면적 환산에 유용합니다. 평방피트(ft²) 변환도 지원.',
  keywords: '평수 계산기, 평 제곱미터 변환, 평수 계산, 아파트 평수, 면적 환산, pyeong calculator',
  openGraph: { title: '평수 계산기 | 툴허브', description: '평↔m² 면적 변환, 아파트 평수 계산', url: 'https://toolhub.ai.kr/pyeong-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '평수 계산기 | 툴허브', description: '평↔m² 면적 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/pyeong-calculator/' },
}

export default function PyeongCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '평수 계산기', description: '평(坪)↔제곱미터(m²) 면적 변환', url: 'https://toolhub.ai.kr/pyeong-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['평→m² 변환', 'm²→평 변환', 'ft² 변환', '아파트 면적 참고'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '1평은 몇 제곱미터(m²)인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1평은 약 3.3058㎡입니다. 정확하게는 1평 = 400/121 ㎡ ≈ 3.305785㎡입니다. 반대로 1㎡는 약 0.3025평입니다. 예를 들어 아파트 전용면적 84㎡는 약 25.4평(84 × 0.3025)이며, 실생활에서는 "25평형"이라고 부릅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전용면적과 공급면적의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전용면적은 실제 거주 공간(방, 거실, 주방, 화장실)만의 면적이고, 공급면적은 전용면적에 주거공용면적(복도, 계단, 엘리베이터)을 더한 면적입니다. 계약면적은 공급면적에 기타공용면적(주차장, 관리사무소 등)까지 포함합니다. 아파트 매매 시 공급면적 기준으로 평형을 표기합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '아파트 "25평형"의 실제 면적은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '아파트 "25평형"은 공급면적 기준 약 82.5㎡(25 × 3.3)이지만, 전용면적은 보통 59~60㎡입니다. 이를 평으로 환산하면 실제 사용 면적은 약 18평 정도입니다. 2007년부터 법적으로 ㎡ 단위를 사용하므로, "전용면적 59㎡"가 공식 표기이며 "국민평형 25평"은 관행적 표현입니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><PyeongCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            평수 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            평수 계산기는 한국 부동산에서 자주 사용하는 평(坪) 단위와 국제 표준 제곱미터(m²) 간의 면적을 즉시 변환해 주는 도구입니다. 아파트 평수 계산, 토지 면적 환산, 상가 임대 면적 비교 등 부동산 거래 시 필수적으로 필요하며, 평방피트(ft²) 변환도 지원하여 해외 부동산 정보와도 손쉽게 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            평수 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>아파트 평수 확인:</strong> 등기부등본이나 분양 공고의 m² 단위 전용면적을 평으로 변환하면 실제 생활 공간 크기를 직관적으로 파악할 수 있습니다.</li>
            <li><strong>공급면적과 전용면적 구분:</strong> 아파트 분양 시 공급면적(계약면적)과 전용면적이 다르므로 각각을 평으로 변환해 실제 사용 공간을 확인하세요.</li>
            <li><strong>임대료 비교:</strong> 상가나 사무실 임대 시 평당 임대료를 구하면 서로 다른 면적의 물건을 객관적으로 비교할 수 있습니다.</li>
            <li><strong>인테리어 견적:</strong> 도배, 장판, 에어컨 등 면적 기준 시공 견적을 받을 때 평수를 정확히 알면 과도한 견적을 방지할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
