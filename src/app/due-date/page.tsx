import { Metadata } from 'next'
import { Suspense } from 'react'
import DueDateCalculator from '@/components/DueDateCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '출산 예정일 계산기 - 임신 주수, 예정일 계산 | 툴허브',
  description: '출산 예정일 계산기 - 마지막 생리일(LMP) 또는 배란일 기준으로 출산 예정일과 현재 임신 주수를 계산합니다. 삼분기별 주요 일정도 확인하세요.',
  keywords: '출산 예정일 계산, 임신 주수 계산, 출산일 계산기, due date calculator, 임신 계산기',
  openGraph: { title: '출산 예정일 계산기 | 툴허브', description: '출산 예정일 및 임신 주수 계산', url: 'https://toolhub.ai.kr/due-date', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '출산 예정일 계산기 | 툴허브', description: '출산 예정일 및 임신 주수 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/due-date' },
}

export default function DueDatePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '출산 예정일 계산기', description: '출산 예정일 및 임신 주수 계산', url: 'https://toolhub.ai.kr/due-date', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['출산 예정일', '임신 주수', '삼분기 정보', '주요 일정'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><DueDateCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
