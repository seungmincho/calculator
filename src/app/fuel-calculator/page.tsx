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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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