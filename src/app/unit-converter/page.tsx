import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import UnitConverter from '@/components/UnitConverter'

export const metadata: Metadata = {
  title: '단위 변환기 - 길이, 무게, 온도, CSS 단위 변환 | 툴허브',
  description: '길이, 무게, 온도, 면적, 부피, 데이터, CSS 단위를 변환합니다. px/rem/em 변환, 평수 계산 등 실용적인 단위 변환 기능.',
  keywords: '단위변환기, 길이변환, 무게변환, 온도변환, px변환, rem변환, 평수계산, unit converter',
  openGraph: {
    title: '단위 변환기 - 다양한 단위 변환',
    description: '길이, 무게, 온도, CSS 단위 등을 변환하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/unit-converter',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '단위 변환기 - 길이, 무게, 온도, CSS 단위 변환',
    description: '길이, 무게, 온도, 면적, 부피, 데이터, CSS 단위를 변환합니다. px/rem/em 변환, 평수 계산 등 실용적인 단위 변환 기능.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/unit-converter/',
  },
}

export default function UnitConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '단위 변환기',
    description: '길이, 무게, 온도, 면적, 부피, 데이터, CSS 단위를 변환합니다. px/rem/em 변환, 평수 계산 등 실용적인 단위 변환 기능.',
    url: 'https://toolhub.ai.kr/unit-converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['길이 변환', '무게 변환', '온도 변환', '면적 변환', '속도 변환']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '한국에서 사용하는 평(坪)은 몇 제곱미터인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1평은 약 3.3058㎡(정확히 400/121㎡)입니다. 한국 부동산에서는 아직 평 단위가 관행적으로 사용되지만, 2007년부터 법적으로는 ㎡를 사용해야 합니다. 환산 공식: 평 → ㎡ = 평 × 3.3058, ㎡ → 평 = ㎡ × 0.3025. 예를 들어 25평 아파트는 약 82.6㎡, 33평은 약 109.1㎡입니다.'
        }
      },
      {
        '@type': 'Question',
        name: '화씨(°F)와 섭씨(°C) 변환 공식은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '섭씨를 화씨로: °F = (°C × 9/5) + 32. 화씨를 섭씨로: °C = (°F - 32) × 5/9. 주요 기준점: 물의 어는점 0°C = 32°F, 물의 끓는점 100°C = 212°F, 체온 36.5°C = 97.7°F. 미국, 미얀마, 라이베리아만 화씨를 공식 단위로 사용하며, 대부분의 국가는 섭씨를 사용합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '1마일은 몇 킬로미터인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1마일(mile)은 정확히 1.609344km입니다. 반대로 1km는 약 0.6214마일입니다. 미국, 영국, 미얀마 등 일부 국가에서 마일을 사용합니다. 관련 단위: 1해리(nautical mile) = 1.852km, 1피트(foot) = 0.3048m, 1인치(inch) = 2.54cm, 1야드(yard) = 0.9144m입니다.'
        }
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <UnitConverter />
      </I18nWrapper>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            단위 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            단위 변환기는 길이, 무게, 온도, 면적, 부피, 속도, 데이터, CSS 단위 등 다양한 측정 단위를 즉시 변환해 주는 도구입니다. 미터·킬로미터·마일·인치 간 길이 변환, 섭씨·화씨·켈빈 온도 변환, 평·제곱미터 면적 변환, 그리고 웹 개발자를 위한 px·rem·em·vw 변환을 모두 지원합니다. 해외 쇼핑, 요리 레시피 단위 변환, 부동산 평수 계산, 웹 디자인 작업에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            단위 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>부동산 평수 계산:</strong> 1평은 약 3.306㎡입니다. 아파트 분양 광고의 평수를 제곱미터로 변환하거나 등기부등본의 ㎡ 면적을 평으로 환산할 때 활용하세요.</li>
            <li><strong>해외 레시피 단위:</strong> 미국 요리 레시피의 컵(cup), 온스(oz), 파운드(lb)를 그램·리터로 변환하여 정확한 계량이 가능합니다.</li>
            <li><strong>CSS px↔rem 변환:</strong> 기본 폰트 사이즈(16px) 기준으로 픽셀과 rem을 변환하여 반응형 웹 개발 시 일관된 타이포그래피를 설계할 수 있습니다.</li>
            <li><strong>속도 단위 변환:</strong> km/h, mph, m/s, knots 간 변환으로 자동차 속도 표지판 이해, 항공·해양 속도 계산에 활용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
