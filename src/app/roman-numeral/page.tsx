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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '로마 숫자 읽는 법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기본 기호: I(1), V(5), X(10), L(50), C(100), D(500), M(1000). 규칙: ① 왼쪽에서 오른쪽으로 더함 (VI=6, XII=12) ② 작은 수가 큰 수 앞에 오면 뺌 (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900). 예: MMXXVI = 2000+20+6 = 2026. 시계, 영화 시리즈(Rocky III), 슈퍼볼(Super Bowl LVIII), 왕의 이름(Elizabeth II) 등에 사용됩니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><RomanNumeral /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
