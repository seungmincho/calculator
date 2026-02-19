import { Metadata } from 'next'
import { Suspense } from 'react'
import BaseConverter from '@/components/BaseConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '진법 변환기 - 2진수, 8진수, 10진수, 16진수 변환 | 툴허브',
  description: '진법 변환기 - 2진수(Binary), 8진수(Octal), 10진수(Decimal), 16진수(Hex)를 실시간으로 변환합니다. 비트 시각화 제공.',
  keywords: '진법 변환기, 2진수 변환, 16진수 변환, 8진수 변환, binary converter, hex converter, 진법 계산기',
  openGraph: {
    title: '진법 변환기 | 툴허브',
    description: '2진수, 8진수, 10진수, 16진수 실시간 변환',
    url: 'https://toolhub.ai.kr/base-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '진법 변환기 | 툴허브', description: '2/8/10/16진수 실시간 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/base-converter' },
}

export default function BaseConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '진법 변환기', description: '2진수, 8진수, 10진수, 16진수 실시간 변환',
    url: 'https://toolhub.ai.kr/base-converter', applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['10진수 ↔ 2진수 변환', '10진수 ↔ 16진수 변환', '비트 시각화', '자주 쓰는 값 참조'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><BaseConverter /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
