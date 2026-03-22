import { Metadata } from 'next'
import { Suspense } from 'react'
import SalaryRank from '@/components/SalaryRank'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '내 연봉 상위 몇 %? - 연봉 순위 계산기 | 툴허브',
  description: '내 연봉이 한국 전체에서 상위 몇 퍼센트인지 확인하세요. 국세청·통계청 공식 데이터 기반, 나이·성별·직업군별 비교. 결과 이미지 공유 가능.',
  keywords: '연봉 순위, 연봉 상위 퍼센트, 소득 분위, 연봉 비교, 평균 연봉, 중위 소득, 연봉 백분위',
  openGraph: {
    title: '내 연봉 상위 몇 %? | 툴허브',
    description: '내 연봉은 한국에서 상위 몇 %일까? 공식 데이터 기반 연봉 순위 계산',
    url: 'https://toolhub.ai.kr/salary-rank',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '내 연봉 상위 몇 %?',
    description: '국세청 데이터 기반 연봉 순위 확인',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/salary-rank',
  },
}

export default function SalaryRankPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연봉 순위 계산기',
    description: '내 연봉이 한국에서 상위 몇 %인지 확인하는 계산기',
    url: 'https://toolhub.ai.kr/salary-rank',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국세청·통계청 공식 데이터 기반 연봉 순위',
      '나이·성별·직업군별 세분화 비교',
      '결과 이미지 공유 (카카오톡/SNS)',
      '익명 데이터 수집으로 실시간 통계 보강',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <SalaryRank />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
