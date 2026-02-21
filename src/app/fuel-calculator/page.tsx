import { Metadata } from 'next'
import { Suspense } from 'react'
import FuelCalculator from '@/components/FuelCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '유류비 계산기 | 툴허브 - 회사 업무용 차량 연료비 정산 도구',
  description: '회사 업무용 차량 유류비를 정확하게 계산하세요. 차종별 연비, 실시간 유가, 주행거리 기반으로 연료비와 감가상각비를 자동 계산합니다.',
  keywords: '유류비계산기, 차량연료비, 업무용차량, 연비계산, 감가상각비, 회사경비, 출장비, 교통비정산, 차량유지비, 기름값계산',
  openGraph: {
    title: '유류비 계산기 | 툴허브',
    description: '회사 업무용 차량 유류비 계산기 - 차종별 연비 + 실시간 유가 + 감가상각비',
    url: 'https://toolhub.ai.kr/fuel-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '유류비 계산기 - 회사 업무용 차량 연료비 정산',
    description: '차종별 연비와 실시간 유가로 정확한 유류비를 계산하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/fuel-calculator',
  },
}

export default function FuelCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '유류비 계산기',
    description: '회사 업무용 차량의 연료비와 감가상각비를 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/fuel-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '차종별 연비 자동 계산',
      '실시간 유가 정보 반영',
      '주행거리 기반 연료비 계산',
      '차량 감가상각비 계산',
      '업무용 차량 경비 정산',
      '출장비 교통비 계산'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '업무용 차량 유류비를 경비 처리하려면 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '업무용 차량의 유류비를 경비 처리하려면 차량운행일지를 작성해야 합니다. 법인 차량은 업무사용비율에 따라 경비 인정되며, 개인사업자는 연간 1,500만원 한도 내에서 차량 관련 비용을 필요경비로 인정받습니다. 주유 영수증과 차량운행일지를 반드시 보관하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '자동차 감가상각비는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '업무용 승용차의 감가상각은 정액법으로 내용연수 5년을 적용합니다. 연간 감가상각 한도는 800만원이며, 취득가액을 5년에 걸쳐 균등하게 비용 처리합니다. 리스·렌트 차량도 연간 800만원 한도가 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '휘발유와 경유의 연비 차이는 어느 정도인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '일반적으로 경유 차량이 휘발유 차량보다 연비가 15~30% 좋습니다. 같은 차종 기준 휘발유차 12km/L라면 경유차는 약 14~16km/L입니다. 다만 경유 가격이 휘발유보다 저렴해 실제 주유비 차이는 20~40%까지 벌어질 수 있습니다. LPG 차량은 연비는 낮지만 연료비가 가장 저렴합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <FuelCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}