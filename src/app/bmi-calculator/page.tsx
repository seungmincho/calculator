import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import BMICalculator from '@/components/BMICalculator'

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
    canonical: 'https://toolhub.ai.kr/bmi-calculator',
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
      </I18nWrapper>
    </>
  )
}