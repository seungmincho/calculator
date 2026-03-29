import { Metadata } from 'next'
import { Suspense } from 'react'
import EvSubsidyCalculator from '@/components/EvSubsidyCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전기차 보조금 계산기 - 국비·지방비 보조금 계산 | 툴허브',
  description: '2026년 전기차 보조금을 국비·지방비별로 자동 계산하세요. 17개 지역별 지방 보조금, 차종별(승용/SUV/화물) 국비 지원금, 실 구매가격을 한눈에 확인할 수 있습니다.',
  keywords: '전기차 보조금, 전기차 국비, 지방비 보조금, EV 보조금, 전기차 구매, 전기차 지원금, 아이오닉5 보조금, 테슬라 보조금, 2026 전기차',
  openGraph: {
    title: '전기차 보조금 계산기 - 국비·지방비 보조금 계산 | 툴허브',
    description: '2026년 전기차 국비·지방비 보조금 자동 계산, 17개 지역 비교, 실 구매가격 확인',
    url: 'https://toolhub.ai.kr/ev-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '전기차 보조금 계산기',
    description: '2026년 전기차 국비·지방비 보조금 자동 계산, 17개 지역 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ev-subsidy',
  },
}

export default function EvSubsidyPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '전기차 보조금 계산기',
      description: '2026년 전기차 국비·지방비 보조금을 차종 및 지역별로 자동 계산하는 도구',
      url: 'https://toolhub.ai.kr/ev-subsidy',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '2026년 국비 보조금 자동 계산 (성능 점수 기반)',
        '17개 시·도 지방비 보조금 비교',
        '차종별(승용/SUV/화물/승합) 보조금 산정',
        '가격 구간별 보조금 차등 적용 (55M/85M 기준)',
        '인기 전기차 모델 프리셋',
        '실 구매가격 즉시 확인',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '전기차 보조금 계산하는 방법',
      description: '2026년 전기차 보조금을 국비·지방비별로 계산하는 단계별 안내',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: '차종 선택',
          text: '구매할 전기차 차종(승용/SUV/화물/승합)을 선택합니다.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: '차량 정보 입력',
          text: '차량 가격(만원), 배터리 용량(kWh), 주행거리(km)를 입력합니다. 인기 모델 버튼으로 자동 입력도 가능합니다.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: '지역 선택',
          text: '차량을 등록할 시·도를 선택하면 해당 지역 지방비 보조금이 자동으로 반영됩니다.',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: '계산 실행',
          text: '계산하기 버튼을 클릭하면 국비+지방비 총 보조금과 실 구매가격이 표시됩니다.',
        },
        {
          '@type': 'HowToStep',
          position: 5,
          name: '지역별 비교',
          text: '결과 화면 하단의 지역별 비교표에서 17개 지역의 보조금 금액을 비교할 수 있습니다.',
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '전기차 국비 보조금은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '2026년 기준 국비 보조금은 차종과 성능에 따라 다릅니다. 승용차는 최대 680만원, SUV는 최대 500만원, 화물차는 최대 300만원입니다. 차량 가격이 5,500만원 미만이면 전액, 5,500만~8,500만원이면 50%, 8,500만원 초과이면 지원되지 않습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '지방비 보조금은 지역마다 다른가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네, 지방비 보조금은 지역마다 크게 다릅니다. 서울은 승용 기준 200만원인 반면, 제주는 1,100만원으로 가장 높습니다. 일반적으로 도심보다 지방·도서지역 보조금이 더 많습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '전기차 보조금을 가장 많이 받으려면 어디서 등록해야 하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '제주도가 지방비 보조금이 가장 높아 총 보조금이 최대입니다. 그 다음은 전남(800만원), 강원·충북·충남·전북·경북(700만원) 순입니다. 단, 실제 거주지 등록이 원칙이므로 거주 지역의 보조금을 확인하시기 바랍니다.',
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <EvSubsidyCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
