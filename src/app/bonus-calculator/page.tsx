import { Metadata } from 'next'
import { Suspense } from 'react'
import BonusCalculator from '@/components/BonusCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
// RelatedTools auto-detects current path from URL

export const metadata: Metadata = {
  title: '성과급 계산기 - 세후 실수령액 계산 | 툴허브',
  description: '성과급·인센티브 세후 실수령액을 정확하게 계산합니다. PS, PI, 경영성과급 비율별 시뮬레이션, 4대보험·소득세 공제 분석, 과세구간 변동 확인, 절세 팁까지.',
  keywords: '성과급 계산기, 인센티브 계산, PS 실수령액, PI 계산, 성과급 세금, 성과급 세후, 경영성과급, 보너스 계산기, 성과급 실수령액',
  openGraph: {
    title: '성과급 계산기 - 세후 실수령액 계산 | 툴허브',
    description: '성과급·인센티브 세후 실수령액 계산, 비율별 시뮬레이션, 세금 분석까지 한번에',
    url: 'https://toolhub.ai.kr/bonus-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '성과급 계산기 - 세후 실수령액',
    description: '성과급 세후 실수령액, 비율별 비교, 과세구간 분석',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/bonus-calculator',
  },
}

export default function BonusCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '성과급 계산기',
      description: '성과급·인센티브 세후 실수령액 계산, PS/PI/경영성과급 비율별 시뮬레이션, 세금 분석',
      url: 'https://toolhub.ai.kr/bonus-calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '성과급 세후 실수령액 계산',
        '비율별 시뮬레이션 비교',
        '4대보험·소득세 공제 분석',
        '과세구간 변동 분석',
        '절세 팁 가이드'
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '성과급에도 4대보험이 부과되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네, 성과급도 근로소득에 포함되어 국민연금·건강보험·고용보험이 부과됩니다. 다만 국민연금은 월 상한액(590만원)이 있어 고소득자는 추가 부담이 제한적입니다.'
          }
        },
        {
          '@type': 'Question',
          name: '성과급 세율이 월급보다 높은 이유는?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '성과급 자체의 세율이 높은 것이 아니라, 성과급이 추가되면 연간 총소득이 증가하여 더 높은 과세구간에 진입하기 때문입니다. 한국의 소득세는 6~45% 누진세율입니다.'
          }
        },
        {
          '@type': 'Question',
          name: '성과급을 퇴직연금에 넣으면 얼마나 절세되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'IRP에 연간 최대 900만원까지 납입 가능하며, 총급여 5,500만원 이하 시 16.5%, 초과 시 13.2% 세액공제를 받습니다. 900만원 납입 시 최대 148.5만원 절세 효과.'
          }
        },
        {
          '@type': 'Question',
          name: '성과급과 상여금의 차이는?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '상여금은 연봉에 포함된 금액을 특정 월에 나눠 지급하는 것(총액 불변)이고, 성과급은 연봉 외에 추가로 지급되는 금액입니다. 세금 계산 방식은 동일합니다.'
          }
        }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '성과급 실수령액 계산하는 방법',
      step: [
        { '@type': 'HowToStep', name: '연봉 입력', text: '세전 연봉을 입력합니다' },
        { '@type': 'HowToStep', name: '성과급 설정', text: '성과급 유형과 비율(또는 금액)을 입력합니다' },
        { '@type': 'HowToStep', name: '부양가족 입력', text: '부양가족 수와 자녀 수를 입력합니다' },
        { '@type': 'HowToStep', name: '결과 확인', text: '세후 실수령액, 시뮬레이션, 세금 분석을 확인합니다' }
      ]
    }
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <BonusCalculator />
              <RelatedTools />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
