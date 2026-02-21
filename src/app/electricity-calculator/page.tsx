import { Metadata } from 'next'
import { Suspense } from 'react'
import ElectricityCalculator from '@/components/ElectricityCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전기요금 계산기 - 한국 주택용 누진제 전기세 계산 | 툴허브',
  description: '전기요금 계산기 - 월 사용량(kWh)을 입력하면 한국 주택용 전기요금을 누진제 기준으로 계산합니다. 계절별 요금, 부가세, 기금까지 포함한 예상 금액.',
  keywords: '전기요금 계산기, 전기세 계산, 전기요금 누진제, 한전 전기요금, 전기세 계산기, electricity bill calculator',
  openGraph: { title: '전기요금 계산기 | 툴허브', description: '한국 주택용 전기요금 누진제 계산', url: 'https://toolhub.ai.kr/electricity-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '전기요금 계산기 | 툴허브', description: '한국 주택용 전기요금 누진제 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/electricity-calculator' },
}

export default function ElectricityCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '전기요금 계산기', description: '한국 주택용 전기요금 누진제 기준 계산기', url: 'https://toolhub.ai.kr/electricity-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['누진제 전기요금 계산', '계절별 요금 차이', '부가세/기금 포함', '절약 팁'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '주택용 전기요금 누진제 구간은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주택용 전기요금은 사용량에 따라 3단계 누진제가 적용됩니다. 1구간(200kWh 이하)은 kWh당 약 120원, 2구간(201~400kWh)은 약 214원, 3구간(400kWh 초과)은 약 307원입니다. 여기에 기본요금, 부가가치세(10%), 전력산업기반기금(3.7%)이 추가됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '여름·겨울 전기요금이 더 비싼 이유는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국전력은 냉방(7~8월)과 난방(12~2월) 시즌에는 전력 수요 급증으로 누진 구간이 동일하지만, 사용량이 급격히 증가하여 높은 누진 구간에 해당하는 경우가 많습니다. 다만 2024년부터 누진제가 완화되어 구간 간 격차가 이전보다 줄었습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전기요금을 절약하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전기요금 절약 팁: ① 에어컨 적정 온도 26도 유지 ② 대기전력 차단(멀티탭 스위치 끄기) ③ LED 조명 교체 ④ 에너지효율 1등급 가전 사용 ⑤ 고효율 냉장고 적정 용량 선택. 또한 에너지캐시백 제도를 활용하면 전년 대비 절감한 전기요금의 일부를 포인트로 돌려받을 수 있습니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ElectricityCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
