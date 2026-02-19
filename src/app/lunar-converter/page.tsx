import { Metadata } from 'next'
import { Suspense } from 'react'
import LunarConverter from '@/components/LunarConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '음력 양력 변환기 - 음력 날짜 변환, 띠, 간지 | 툴허브',
  description: '음력 양력 변환기 - 음력을 양력으로, 양력을 음력으로 변환합니다. 음력 생일, 제사일, 명절 날짜 확인. 띠, 간지(60갑자) 정보 제공.',
  keywords: '음력 양력 변환, 음력 변환기, 양력 음력 변환, 음력 생일, 음력 날짜, lunar calendar converter',
  openGraph: { title: '음력 양력 변환기 | 툴허브', description: '음력 ↔ 양력 날짜 변환, 띠, 간지 정보', url: 'https://toolhub.ai.kr/lunar-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '음력 양력 변환기 | 툴허브', description: '음력 ↔ 양력 날짜 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/lunar-converter' },
}

export default function LunarConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '음력 양력 변환기', description: '음력 ↔ 양력 날짜 변환, 띠, 간지(60갑자) 정보', url: 'https://toolhub.ai.kr/lunar-converter', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['양력→음력 변환', '음력→양력 변환', '띠/간지 정보', '윤달 지원'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><LunarConverter /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
