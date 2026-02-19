import { Metadata } from 'next'
import { Suspense } from 'react'
import CarMaintenance from '@/components/CarMaintenance'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '자동차 유지비 계산기 - 연간 차량 유지 비용 | 툴허브',
  description: '자동차 유지비 계산기 - 보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하세요.',
  keywords: '자동차 유지비, 차량 유지비 계산기, 자동차세, 자동차보험, 유류비, 정비비, 감가상각, 주차비, 연간 차량비용',
  openGraph: {
    title: '자동차 유지비 계산기 - 연간 차량 유지 비용 | 툴허브',
    description: '보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하세요.',
    url: 'https://toolhub.ai.kr/car-maintenance',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '자동차 유지비 계산기 | 툴허브',
    description: '보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/car-maintenance',
  },
}

export default function CarMaintenancePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '자동차 유지비 계산기',
    description: '보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/car-maintenance',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '자동차세 자동 계산 (배기량/차령 기반)',
      '자동차보험료 추정',
      '유류비 계산 (가솔린/디젤/LPG/하이브리드/전기)',
      '정비비 스케줄 관리',
      '감가상각비 추정',
      '대중교통 비용 비교',
      'km당 비용 분석',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <CarMaintenance />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
