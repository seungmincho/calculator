import { Metadata } from 'next'
import { Suspense } from 'react'
import HousingSubscription from '@/components/HousingSubscription'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '청약가점 계산기 - 청약 점수 자동 계산 | 툴허브',
  description: '무주택기간, 부양가족 수, 청약통장 가입기간을 입력하면 청약가점 84점 만점을 자동 계산합니다. 2025년 기준 최신 가점 산정 기준 반영.',
  keywords: '청약가점 계산기, 청약 점수 계산, 무주택기간 점수, 부양가족 가점, 청약통장 가점, 아파트 청약, 분양 가점',
  openGraph: {
    title: '청약가점 계산기 | 툴허브',
    description: '무주택기간·부양가족·청약통장 가입기간으로 청약가점 84점 만점을 자동 계산하세요.',
    url: 'https://toolhub.ai.kr/housing-subscription',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '청약가점 계산기',
    description: '무주택기간·부양가족·청약통장 가입기간으로 청약가점 84점 만점 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/housing-subscription',
  },
}

export default function HousingSubscriptionPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '청약가점 계산기',
    description: '무주택기간, 부양가족 수, 청약통장 가입기간을 입력하면 청약가점 84점 만점을 자동 계산합니다.',
    url: 'https://toolhub.ai.kr/housing-subscription',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '무주택기간 자동 계산 (최대 32점)',
      '부양가족 수 가점 계산 (최대 35점)',
      '청약통장 가입기간 계산 (최대 17점)',
      '84점 만점 총 가점 계산',
      '예상 백분위 안내',
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
              <HousingSubscription />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
