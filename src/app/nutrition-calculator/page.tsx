import { Metadata } from 'next'
import { Suspense } from 'react'
import NutritionCalculator from '@/components/NutritionCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '영양소 계산기 - 음식 칼로리·탄단지 계산 | 툴허브',
  description: '한국 음식 영양소와 칼로리를 계산합니다. 밥, 면, 국, 반찬, 간식 등 40여 종의 음식을 골라 한 끼 총 칼로리와 탄수화물·단백질·지방 비율을 확인하세요.',
  keywords: '영양소 계산기, 칼로리 계산기, 음식 칼로리, 탄단지 비율, 한국 음식 영양성분, 식단 관리, 다이어트 칼로리',
  openGraph: {
    title: '영양소 계산기 | 툴허브',
    description: '한국 음식 영양소와 칼로리를 계산하고 일일 권장량과 비교하세요.',
    url: 'https://toolhub.ai.kr/nutrition-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '영양소 계산기',
    description: '한국 음식 칼로리·탄단지 비율 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/nutrition-calculator',
  },
}

export default function NutritionCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '영양소 계산기',
    description: '한국 음식 영양소와 칼로리를 계산합니다. 40여 종 음식의 탄수화물·단백질·지방 비율을 확인하세요.',
    url: 'https://toolhub.ai.kr/nutrition-calculator',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['한국 음식 영양소 계산', '탄단지 비율 차트', '일일 권장량 비교', '식단 구성 관리']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <NutritionCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
