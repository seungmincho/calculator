import { Metadata } from 'next'
import { Suspense } from 'react'
import KoreanSyllable from '@/components/KoreanSyllable'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '한글 초성 추출기 - 자음/모음 분리, 초성 검색 | 툴허브',
  description: '한글 초성 추출기 - 한글 텍스트의 초성, 중성, 종성을 분리합니다. 초성만 추출, 자모 분리, 자모 합치기 기능.',
  keywords: '초성 추출, 한글 자모 분리, 초성 변환, 한글 분리, korean syllable decompose, 자음 모음 분리',
  openGraph: { title: '한글 초성 추출기 | 툴허브', description: '한글 초성/자모 분리', url: 'https://toolhub.ai.kr/korean-syllable', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '한글 초성 추출기 | 툴허브', description: '한글 초성 추출, 자모 분리' },
  alternates: { canonical: 'https://toolhub.ai.kr/korean-syllable' },
}

export default function KoreanSyllablePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '한글 초성 추출기', description: '한글 초성/자모 분리', url: 'https://toolhub.ai.kr/korean-syllable', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['초성 추출', '자모 분리', '자모 합치기', '유니코드 처리'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '한글 자모 조합 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한글은 초성(19개: ㄱㄲㄴㄷ...), 중성(21개: ㅏㅐㅑ...), 종성(27개+없음: ㄱㄲㄳ...)의 조합으로 구성됩니다. 유니코드에서 한글 글자 코드 = 0xAC00 + (초성 인덱스 × 21 × 28) + (중성 인덱스 × 28) + 종성 인덱스. 총 11,172개(19×21×28)의 완성형 한글이 가능합니다. 세종대왕이 창제한 훈민정음은 발음 기관의 모양을 본뜬 과학적 문자 체계입니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><KoreanSyllable /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
