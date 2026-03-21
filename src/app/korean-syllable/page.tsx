import { Metadata } from 'next'
import { Suspense } from 'react'
import KoreanSyllable from '@/components/KoreanSyllable'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '한글 초성 추출기 - 자음/모음 분리, 초성 검색 | 툴허브',
  description: '한글 초성 추출기 - 한글 텍스트의 초성, 중성, 종성을 분리합니다. 초성만 추출, 자모 분리, 자모 합치기 기능.',
  keywords: '초성 추출, 한글 자모 분리, 초성 변환, 한글 분리, korean syllable decompose, 자음 모음 분리',
  openGraph: { title: '한글 초성 추출기 | 툴허브', description: '한글 초성/자모 분리', url: 'https://toolhub.ai.kr/korean-syllable', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '한글 초성 추출기 | 툴허브', description: '한글 초성 추출, 자모 분리' },
  alternates: { canonical: 'https://toolhub.ai.kr/korean-syllable/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><KoreanSyllable />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            한글 초성 추출기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            한글 초성 추출기는 한글 텍스트의 초성(첫소리), 중성(홀소리), 종성(받침)을 분리하거나 초성만 추출하는 도구입니다. '안녕하세요'를 입력하면 'ㅇㄴㅎㅅㅇ'와 같이 초성만 추출하거나, 자모를 완전히 분리할 수 있습니다. 초성 검색 기능 구현, 한글 정렬 알고리즘 개발, 언어학 연구 등에 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            한글 초성 추출기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>초성 검색 구현:</strong> 앱·웹에서 'ㄱㄴ'으로 '강남'을 찾는 초성 검색 기능 개발 시 초성 추출 로직을 참고하세요.</li>
            <li><strong>한글 정렬:</strong> 이름 목록을 가나다순으로 정렬할 때 초성 기준 정렬 알고리즘에 이 도구의 분리 원리를 적용할 수 있습니다.</li>
            <li><strong>자모 합치기:</strong> 분리된 자모(ㅎ, ㅏ, ㄴ)를 다시 합쳐 완성형 한글 '한'으로 조합하는 기능도 제공합니다.</li>
            <li><strong>유니코드 한글 원리:</strong> 한글 유니코드는 가(0xAC00)를 시작으로 초성 19개×중성 21개×종성 28개 = 11,172개의 완성형이 연속 배치됩니다.</li>
            <li><strong>한국어 NLP 전처리:</strong> 자연어 처리(NLP) 모델 학습을 위해 한글 텍스트를 자모 단위로 분해할 때 초성 추출이 핵심 전처리 단계입니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
