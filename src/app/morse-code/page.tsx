import { Metadata } from 'next'
import { Suspense } from 'react'
import MorseCode from '@/components/MorseCode'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '모스부호 변환기 - 텍스트↔모스부호 변환 | 툴허브',
  description: '모스부호 변환기 - 텍스트를 모스부호로, 모스부호를 텍스트로 변환합니다. 소리 재생, 모스부호 표 제공.',
  keywords: '모스부호 변환기, morse code converter, 모스부호 변환, 모스코드, SOS 모스부호',
  openGraph: { title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/morse-code' },
}

export default function MorseCodePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '모스부호 변환기', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['모스부호 변환', '소리 재생', '모스부호 표', 'SOS'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><MorseCode /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
