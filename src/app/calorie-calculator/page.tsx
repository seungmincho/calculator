import { Metadata } from 'next'
import CalorieCalculator from '@/components/CalorieCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '칼로리 계산기 | 기초대사율, 활동대사율, 다이어트 칼로리 계산 | 툴허브',
  description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량, 유지를 위한 일일 칼로리 목표를 설정하세요. 음식 칼로리와 운동 소모 칼로리도 함께 확인할 수 있습니다.',
  keywords: [
    '칼로리 계산기',
    '기초대사율',
    'BMR',
    'TDEE',
    '활동대사율',
    '다이어트 칼로리',
    '체중 감량',
    '체중 증량',
    '칼로리 목표',
    '음식 칼로리',
    '운동 칼로리',
    '대사량 계산',
    '일일 칼로리',
    '건강 관리',
    '체중 관리'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '칼로리 계산기 | 기초대사율, 활동대사율, 다이어트 칼로리 계산',
    description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량, 유지를 위한 일일 칼로리 목표를 설정하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/calorie-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '칼로리 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '칼로리 계산기 | 기초대사율, 활동대사율, 다이어트 칼로리 계산',
    description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량, 유지를 위한 일일 칼로리 목표를 설정하세요.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/calorie-calculator',
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

export default function CalorieCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '칼로리 계산기',
    description: '기초대사율(BMR)과 활동대사율(TDEE)을 계산하여 다이어트, 체중 증량 목표 칼로리를 설정하는 도구',
    url: 'https://toolhub.ai.kr/calorie-calculator',
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
        name: '기초대사율(BMR)과 활동대사율(TDEE)의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기초대사율(BMR)은 아무것도 하지 않고 가만히 누워있을 때 생명 유지에 필요한 최소 칼로리입니다. 활동대사율(TDEE)은 BMR에 일상적인 활동량을 곱한 총 에너지 소비량으로, 실제 하루에 소비하는 칼로리를 의미합니다. 다이어트 시 TDEE보다 300~500kcal 적게 먹으면 건강하게 체중을 감량할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '다이어트를 위한 적정 칼로리는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '다이어트 적정 칼로리는 TDEE에서 300~500kcal을 뺀 값입니다. 예를 들어 TDEE가 2000kcal이면 1500~1700kcal을 목표로 합니다. 단, 여성은 최소 1200kcal, 남성은 최소 1500kcal 이상 섭취해야 영양결핍을 예방할 수 있습니다. 급격한 칼로리 감소는 요요현상의 원인이 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '근육량을 늘리려면 칼로리를 얼마나 더 먹어야 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '근육 증가를 위해서는 TDEE보다 200~500kcal 더 섭취하는 것이 권장됩니다. 이때 단백질을 체중 1kg당 1.6~2.2g 섭취하고, 규칙적인 근력 운동을 병행해야 합니다. 너무 많은 잉여 칼로리는 체지방으로 전환되므로 주 0.25~0.5kg 증가를 목표로 하는 것이 적절합니다.',
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
            <CalorieCalculator />
          </div>
        </div>
      </I18nWrapper>
    </>
  )
}