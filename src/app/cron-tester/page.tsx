import { Metadata } from 'next'
import { Suspense } from 'react'
import CronTester from '@/components/CronTester'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'Cron 표현식 테스터 | 툴허브 - 크론 스케줄 검증 및 분석 도구',
  description: 'Cron 표현식을 실시간으로 테스트하고 분석하세요. 다음 실행 시간 예측, 한국어 설명, 일반적인 패턴 제공으로 스케줄 관리를 쉽게 할 수 있습니다.',
  keywords: 'Cron, 크론, 표현식, 스케줄러, 작업스케줄, 정기실행, Linux, Unix, 개발도구, 시간관리, 자동화',
  openGraph: {
    title: 'Cron 표현식 테스터 | 툴허브',
    description: 'Cron 표현식 테스터 - 실시간 검증 + 다음 실행시간 예측 + 한국어 설명',
    url: 'https://toolhub.ai.kr/cron-tester',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cron 표현식 테스터 - 크론 스케줄 검증 및 분석 도구',
    description: 'Cron 표현식을 실시간으로 테스트하고 분석하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cron-tester',
  },
}

export default function CronTesterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Cron 표현식 테스터',
    description: 'Cron 표현식을 실시간으로 테스트하고 분석하는 도구',
    url: 'https://toolhub.ai.kr/cron-tester',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'Cron 표현식 실시간 검증',
      '다음 실행 시간 예측',
      '한국어 설명 제공',
      '일반적인 패턴 프리셋',
      '실행 이력 시뮬레이션',
      '오류 검사 및 제안'
    ]
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
              <CronTester />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}