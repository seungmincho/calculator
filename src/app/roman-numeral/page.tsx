import { Metadata } from 'next'
import { Suspense } from 'react'
import RomanNumeral from '@/components/RomanNumeral'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '로마 숫자 변환기 - 아라비아↔로마 숫자 변환 | 툴허브',
  description: '로마 숫자 변환기 - 아라비아 숫자를 로마 숫자로, 로마 숫자를 아라비아 숫자로 변환합니다. I, V, X, L, C, D, M 기호 학습.',
  keywords: '로마 숫자 변환, 로마 숫자 변환기, roman numeral converter, 로마 숫자 표, 로마자 변환',
  openGraph: { title: '로마 숫자 변환기 | 툴허브', description: '아라비아↔로마 숫자 변환', url: 'https://toolhub.ai.kr/roman-numeral', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '로마 숫자 변환기 | 툴허브', description: '로마 숫자 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/roman-numeral' },
}

export default function RomanNumeralPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '로마 숫자 변환기', description: '아라비아↔로마 숫자 변환', url: 'https://toolhub.ai.kr/roman-numeral', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['숫자→로마 변환', '로마→숫자 변환', '표기 규칙', '빠른 참조표'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><RomanNumeral /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
