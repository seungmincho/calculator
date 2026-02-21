import { Metadata } from 'next'
import { Suspense } from 'react'
import BloodPressure from '@/components/BloodPressure'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '혈압 기록기 - 혈압 측정 기록, 통계 분석 | 툴허브',
  description: '혈압 기록기 - 수축기/이완기 혈압과 맥박을 기록하고 추이를 분석합니다. 혈압 분류, 평균값, 차트 제공.',
  keywords: '혈압 기록기, 혈압 측정, 혈압 관리, blood pressure tracker, 혈압 수첩',
  openGraph: { title: '혈압 기록기 | 툴허브', description: '혈압 측정 기록 및 통계 분석', url: 'https://toolhub.ai.kr/blood-pressure', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '혈압 기록기 | 툴허브', description: '혈압 측정 기록 및 통계 분석' },
  alternates: { canonical: 'https://toolhub.ai.kr/blood-pressure' },
}

export default function BloodPressurePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '혈압 기록기', description: '혈압 측정 기록 및 통계 분석', url: 'https://toolhub.ai.kr/blood-pressure', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['혈압 기록', '맥박 기록', '추이 차트', '혈압 분류'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '정상 혈압 범위는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '대한고혈압학회 기준 정상 혈압은 수축기 120mmHg 미만, 이완기 80mmHg 미만입니다. 주의 혈압은 120~129/80 미만, 고혈압 전단계는 130~139/80~89, 1기 고혈압은 140~159/90~99, 2기 고혈압은 160/100 이상입니다. 혈압은 하루 중에도 변동이 있으므로 같은 시간에 2회 이상 측정하여 평균값을 기록하세요.' } },
      { '@type': 'Question', name: '혈압을 올바르게 측정하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '올바른 혈압 측정법: ① 5분 이상 안정을 취한 후 측정 ② 등을 기대고 앉아 팔을 심장 높이에 놓기 ③ 커프를 팔꿈치 위 2~3cm에 감기 ④ 측정 30분 전 카페인, 흡연, 운동 금지 ⑤ 2분 간격으로 2회 측정하여 평균값 사용 ⑥ 아침(기상 후 1시간 이내, 식전)과 저녁(취침 전) 하루 2회 측정이 권장됩니다.' } },
      { '@type': 'Question', name: '고혈압을 관리하는 생활습관은?', acceptedAnswer: { '@type': 'Answer', text: '고혈압 관리 생활습관: ① 소금 섭취 하루 6g 이하(한국인 평균 12g) ② 규칙적 유산소 운동(주 5회, 30분) ③ 적정 체중 유지(BMI 25 미만) ④ 절주(남성 2잔, 여성 1잔 이하) ⑤ 금연 ⑥ 채소, 과일, 저지방 식단(DASH 식단). 생활습관 개선만으로 수축기 혈압 5~15mmHg 감소 효과가 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><BloodPressure /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
