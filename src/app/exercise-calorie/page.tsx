import { Metadata } from 'next'
import { Suspense } from 'react'
import ExerciseCalorie from '@/components/ExerciseCalorie'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '운동 칼로리 계산기 - 운동별 소모 칼로리, MET 기반 계산 | 툴허브',
  description: '40가지 이상 운동의 소모 칼로리를 MET(대사당량) 기반으로 정확하게 계산합니다. 걷기, 달리기, 자전거, 수영, 헬스 등 체중과 운동시간에 따른 칼로리를 확인하세요.',
  keywords: '운동 칼로리 계산기, 소모 칼로리, MET 계산, 달리기 칼로리, 걷기 칼로리, 수영 칼로리, 자전거 칼로리, 운동별 칼로리',
  openGraph: {
    title: '운동 칼로리 계산기 | 툴허브',
    description: '40+ 운동별 소모 칼로리를 MET 기반으로 정확하게 계산.',
    url: 'https://toolhub.ai.kr/exercise-calorie',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '운동 칼로리 계산기 | 툴허브',
    description: '운동별 소모 칼로리 MET 기반 계산.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/exercise-calorie',
  },
}

const faqData = [
  {
    question: 'MET(대사당량)이란 무엇인가요?',
    answer: 'MET(Metabolic Equivalent of Task)는 운동 강도를 나타내는 단위입니다. 안정시 산소 소비량을 1 MET로 정의하며, MET 값이 클수록 강도가 높은 운동입니다. 예를 들어 걷기는 약 3.5 MET, 달리기는 7~14 MET, 줄넘기는 약 11 MET입니다.',
  },
  {
    question: '소모 칼로리 계산 공식은?',
    answer: '소모 칼로리(kcal) = MET × 체중(kg) × 운동시간(시간)으로 계산됩니다. 예를 들어 70kg인 사람이 30분간 조깅(MET 7.0)을 하면: 7.0 × 70 × 0.5 = 245kcal을 소모합니다.',
  },
  {
    question: '체지방 1kg을 빼려면 얼마나 운동해야 하나요?',
    answer: '체지방 1kg은 약 7,700kcal에 해당합니다. 70kg인 사람이 매일 30분 조깅(245kcal)을 하면 약 31일, 60분 빠른 걷기(350kcal)를 하면 약 22일이 소요됩니다. 다만 실제 체중 감량은 식단, 기초대사량 등 여러 요인에 영향을 받습니다.',
  },
]

export default function ExerciseCaloriePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '운동 칼로리 계산기',
    description: '운동별 소모 칼로리를 MET 기반으로 계산하는 온라인 도구',
    url: 'https://toolhub.ai.kr/exercise-calorie',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '40+ 운동별 MET 기반 칼로리 계산',
      '복수 운동 조합 지원',
      '밥공기·체지방 환산',
      '카테고리별 운동 분류',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <ExerciseCalorie />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
