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
    canonical: 'https://toolhub.ai.kr/nutrition-calculator/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            영양소 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            영양소 계산기는 한국 음식의 칼로리, 탄수화물, 단백질, 지방(탄단지) 비율을 계산해주는 무료 식단 관리 도구입니다. 밥, 면, 국, 반찬, 간식 등 40여 종의 한국 음식 데이터베이스를 내장하고 있어 한 끼 식단의 총 칼로리와 영양 균형을 쉽게 확인할 수 있습니다. 다이어트, 운동, 건강 관리를 위한 식단 계획 수립에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            영양소 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>탄단지 비율 확인:</strong> 균형 잡힌 식단의 권장 탄단지 비율은 탄수화물 50~60%, 단백질 15~20%, 지방 20~30%입니다. 계산기로 실제 비율을 확인하세요.</li>
            <li><strong>다이어트 식단 설계:</strong> 하루 권장 칼로리(성인 여성 1800~2000kcal, 남성 2200~2600kcal)를 목표로 세 끼 식단을 조절하면 효과적인 체중 관리가 가능합니다.</li>
            <li><strong>단백질 섭취 점검:</strong> 근육 증가를 목표로 한다면 체중(kg) × 1.5~2g의 단백질 섭취를 권장합니다. 닭가슴살, 두부, 계란이 단백질 대표 식품입니다.</li>
            <li><strong>식단 기록 습관:</strong> 매 끼 식사 후 영양소를 기록하는 습관을 들이면 열량 섭취 패턴을 파악하고 건강한 식습관을 형성하는 데 도움이 됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
