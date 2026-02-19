import { Metadata } from 'next'
import { Suspense } from 'react'
import KeyboardConverter from '@/components/KeyboardConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '한영 타자 변환기 - 영타를 한글로, 한타를 영문으로 | 툴허브',
  description: '한영 타자 변환기 - 영문 타자를 한글로, 한글 타자를 영문으로 변환합니다. 실시간 변환, 양방향 지원.',
  keywords: '한영 타자 변환, 영타 한글 변환, 한타 영문 변환, dkssudgktpdy, keyboard converter',
  openGraph: { title: '한영 타자 변환기 | 툴허브', description: '영문 타자를 한글로, 한글 타자를 영문으로 변환', url: 'https://toolhub.ai.kr/keyboard-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '한영 타자 변환기 | 툴허브', description: '영문 타자를 한글로, 한글 타자를 영문으로 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/keyboard-converter' },
}

export default function KeyboardConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '한영 타자 변환기', description: '영문 타자를 한글로, 한글 타자를 영문으로 변환', url: 'https://toolhub.ai.kr/keyboard-converter', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['영타→한글 변환', '한타→영문 변환', '실시간 변환', '양방향 지원'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><KeyboardConverter /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
