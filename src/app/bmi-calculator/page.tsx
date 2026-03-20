import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import BMICalculator from '@/components/BMICalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'BMI 계산기 | 체질량지수 계산 | 툴허브',
  description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인해보세요. 키와 몸무게로 간단하게 비만도를 측정하고 건강 관리에 도움이 되는 정보를 제공합니다.',
  keywords: 'BMI, 체질량지수, 비만도, 건강, 체중관리, 다이어트, 표준체중, BMI계산기',
  openGraph: {
    title: 'BMI 계산기 - 체질량지수 계산 | 툴허브',
    description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인해보세요. 키와 몸무게로 간단하게 비만도를 측정하고 건강 관리에 도움이 되는 정보를 제공합니다.',
    url: 'https://toolhub.ai.kr/bmi-calculator',
    siteName: '툴허브',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BMI 계산기 - 체질량지수 계산 | 툴허브',
    description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인해보세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/bmi-calculator/',
  },
}

export default function BMICalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BMI 계산기',
    description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인하는 도구',
    url: 'https://toolhub.ai.kr/bmi-calculator',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'BMI 계산',
      '비만도 판정',
      '표준 체중 계산',
      '건강 상태 분석'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'BMI 정상 범위는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'WHO 기준 BMI 18.5~24.9가 정상 범위입니다. 한국(대한비만학회) 기준으로는 BMI 18.5~22.9가 정상, 23~24.9가 과체중, 25 이상이 비만으로 분류됩니다. 아시아인은 같은 BMI에서도 체지방률이 높아 더 엄격한 기준을 적용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'BMI 계산 공식은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'BMI = 체중(kg) ÷ 키(m)²입니다. 예를 들어 키 170cm, 체중 70kg이면 BMI = 70 ÷ (1.7)² = 24.2입니다. 근육량이 많은 사람은 BMI가 높게 나올 수 있어 체지방률도 함께 확인하는 것이 좋습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '표준 체중은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국에서 주로 사용하는 브로카 변법: 표준 체중 = (키 - 100) × 0.9입니다. BMI 기준으로는 키(m)² × 22가 표준 체중입니다. 예를 들어 키 170cm이면 표준 체중은 약 63.6kg(브로카) 또는 63.6kg(BMI 22)입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '어린이 BMI는 어떻게 판정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '어린이와 청소년은 성인과 달리 같은 나이·성별 집단에서의 백분위수로 판정합니다. 85~94 백분위가 과체중, 95 백분위 이상이 비만입니다. 성장기에는 체중보다 성장 패턴과 체성분을 함께 고려해야 합니다.',
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
      <I18nWrapper>
        <div className="container mx-auto px-4 py-8">
          <BMICalculator />
        </div>
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            BMI(체질량지수) 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            BMI 계산기는 키와 몸무게를 입력하면 체질량지수(BMI, Body Mass Index)를 계산하고 저체중·정상·과체중·비만 여부를 자동으로 판정하는 무료 온라인 건강 도구입니다. 대한비만학회 기준(정상: 18.5~22.9, 과체중: 23~24.9, 비만: 25 이상)을 적용하며, 표준 체중과 함께 현재 건강 상태를 한눈에 확인할 수 있습니다. 다이어트 목표 설정, 건강검진 사전 준비, 체중 관리에 널리 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            BMI 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>아시아인 기준 주의:</strong> WHO 국제 기준(25 이상 비만)과 달리 한국을 포함한 아시아에서는 23 이상을 과체중, 25 이상을 비만으로 더 엄격하게 적용합니다.</li>
            <li><strong>BMI의 한계:</strong> BMI는 근육량을 반영하지 않아 운동선수처럼 근육이 많으면 비만으로 오분류될 수 있으므로 체지방률과 함께 확인하세요.</li>
            <li><strong>표준 체중 목표:</strong> 표준 체중(BMI 22 기준) = 키(m)² × 22 공식으로 건강한 목표 체중을 설정하고 단계적으로 달성하세요.</li>
            <li><strong>어린이 BMI:</strong> 18세 미만은 성별·연령별 백분위수로 판정해야 하며, 성인 기준 BMI 수치를 그대로 적용해서는 안 됩니다.</li>
            <li><strong>복부비만 함께 확인:</strong> BMI와 함께 허리둘레(남성 90cm, 여성 85cm 이상 복부비만)를 체크하면 심혈관 질환 위험을 더 정확히 평가할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}