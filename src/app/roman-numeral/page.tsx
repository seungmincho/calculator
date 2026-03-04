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
  alternates: { canonical: 'https://toolhub.ai.kr/roman-numeral/' },
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            로마 숫자 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            로마 숫자 변환기는 아라비아 숫자(1, 2, 3...)와 로마 숫자(I, II, III...) 간의 변환을 즉시 수행해 주는 온라인 도구입니다. 시계 문자판, 영화·소설 시리즈 번호, 법률 문서, 학술 자료의 챕터 번호, 올림픽·슈퍼볼 등 스포츠 이벤트 번호에 사용되는 로마 숫자를 쉽게 읽고 변환할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            로마 숫자 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>기본 기호 암기:</strong> I(1), V(5), X(10), L(50), C(100), D(500), M(1000) 7개만 알면 어떤 로마 숫자도 읽을 수 있습니다. 작은 수가 큰 수 앞에 오면 뺄셈(IV=4, IX=9)임을 기억하세요.</li>
            <li><strong>연도 표기 변환:</strong> 영화 크레딧이나 건물 준공 연도의 로마 숫자(예: MCMXCIX = 1999)를 변환해 확인하는 데 활용하세요.</li>
            <li><strong>게임·판타지 콘텐츠 참고:</strong> RPG 게임이나 판타지 소설에서 로마 숫자로 표기된 던전 레벨, 왕의 이름 번호 등을 해독하는 데 사용할 수 있습니다.</li>
            <li><strong>학습 도구로 활용:</strong> 로마 숫자 표기 규칙을 학습할 때 숫자를 입력하고 결과를 보며 패턴을 익히면 빠르게 이해할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
