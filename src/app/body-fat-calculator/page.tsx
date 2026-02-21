import { Metadata } from 'next'
import BodyFatCalculator from '@/components/BodyFatCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '체지방률 계산기 | Navy, YMCA 공식으로 정확한 체지방 측정 | 툴허브',
  description: 'Navy 공식, YMCA 공식을 사용해 허리, 목, 엉덩이 둘레로 체지방률을 계산하세요. 체성분 분석, 근육량 계산, 이상적인 체지방률 목표 설정까지 한번에!',
  keywords: [
    '체지방률 계산기',
    '체지방률 측정',
    'Navy 공식',
    'YMCA 공식',
    '체성분 분석',
    '허리둘레',
    '목둘레',
    '엉덩이둘레',
    '체지방량',
    '근육량',
    '내장지방',
    '체지방 감량',
    '건강 관리',
    '체성분',
    '몸매 관리'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '체지방률 계산기 | Navy, YMCA 공식으로 정확한 체지방 측정',
    description: 'Navy 공식, YMCA 공식을 사용해 허리, 목, 엉덩이 둘레로 체지방률을 계산하세요. 체성분 분석, 근육량 계산까지!',
    type: 'website',
    url: 'https://toolhub.ai.kr/body-fat-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '체지방률 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '체지방률 계산기 | Navy, YMCA 공식으로 정확한 체지방 측정',
    description: 'Navy 공식, YMCA 공식을 사용해 허리, 목, 엉덩이 둘레로 체지방률을 계산하세요.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/body-fat-calculator',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function BodyFatCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '체지방률 계산기',
    description: 'Navy 공식, YMCA 공식으로 체지방률을 측정하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/body-fat-calculator',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '체지방률의 정상 범위는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '건강한 체지방률은 성별과 연령에 따라 다릅니다. 남성은 10~20%, 여성은 18~28%가 정상 범위입니다. 남성 25% 이상, 여성 32% 이상이면 비만으로 판정합니다. 운동선수는 남성 6~13%, 여성 14~20%를 유지하며, 필수지방은 남성 2~5%, 여성 10~13%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Navy 공식과 YMCA 공식의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Navy 공식은 미 해군에서 개발한 방법으로 허리, 목, 엉덩이(여성) 둘레를 사용합니다. YMCA 공식은 허리둘레와 체중만으로 간단하게 측정합니다. Navy 공식이 더 정확하지만 측정 부위가 많고, YMCA 공식은 간편하지만 정확도가 다소 떨어집니다. 두 결과를 비교하면 더 신뢰할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '체지방을 줄이려면 어떻게 해야 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '체지방 감소를 위해서는 칼로리 적자(TDEE보다 300~500kcal 적게 섭취)와 규칙적인 운동이 필요합니다. 주 3~5회 유산소 운동과 주 2~3회 근력 운동을 병행하면 효과적입니다. 단백질 섭취를 체중 1kg당 1.6g 이상으로 늘리면 근육 손실을 최소화하면서 체지방을 줄일 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
          <div className="container mx-auto px-4">
            <BodyFatCalculator />
          </div>
        </div>
      </I18nWrapper>
    </>
  )
}