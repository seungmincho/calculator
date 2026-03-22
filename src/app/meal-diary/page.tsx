import { Metadata } from 'next'
import { Suspense } from 'react'
import MealDiary from '@/components/MealDiary'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '식단/칼로리 일지 - 매일 기록 | 툴허브',
  description: '매일 식단을 기록하고 칼로리·영양소(탄수화물·단백질·지방) 트렌드를 추적하세요. 한국 음식 데이터베이스 기반, 90일 기록 보관, CSV 내보내기 지원.',
  keywords: '식단 일지, 칼로리 기록, 영양소 추적, 다이어트 일지, 식사 기록, 칼로리 트래커',
  openGraph: {
    title: '식단/칼로리 일지 | 툴허브',
    description: '매일 식단 기록, 칼로리·영양소 트렌드 추적',
    url: 'https://toolhub.ai.kr/meal-diary',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '식단/칼로리 일지',
    description: '매일 식단 기록, 칼로리·영양소 트렌드 추적',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/meal-diary',
  },
}

export default function MealDiaryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '식단/칼로리 일지',
    description: '매일 식단을 기록하고 칼로리와 영양소 트렌드를 추적하는 도구',
    url: 'https://toolhub.ai.kr/meal-diary',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '한국 음식 데이터베이스 기반 식단 기록',
      '칼로리·탄수화물·단백질·지방 자동 계산',
      '주간/월간 트렌드 차트',
      '90일 기록 보관 (localStorage)',
      'CSV 내보내기/가져오기',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <MealDiary />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
