import { Metadata } from 'next'
import { Suspense } from 'react'
import NumberToKorean from '@/components/NumberToKorean'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '숫자 한글 변환 - 금액 한글 표기, 수표 작성 | 툴허브',
  description: '숫자 한글 변환 - 숫자를 한글 금액으로 변환합니다. 수표, 계약서, 영수증 작성 시 유용. 한자 금액 표기도 지원합니다.',
  keywords: '숫자 한글 변환, 금액 한글 표기, 수표 금액 한글, number to korean, 한글 숫자, 금일봉',
  openGraph: { title: '숫자 한글 변환 | 툴허브', description: '숫자를 한글 금액 표기로 변환', url: 'https://toolhub.ai.kr/number-to-korean', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '숫자 한글 변환 | 툴허브', description: '숫자를 한글 금액으로 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/number-to-korean/' },
}

export default function NumberToKoreanPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '숫자 한글 변환', description: '숫자를 한글 금액 표기로 변환', url: 'https://toolhub.ai.kr/number-to-korean', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한글 금액 변환', '한자 금액 변환', '수표용 표기', '실시간 변환'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '한국어 숫자 표기 체계는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국어에는 두 가지 숫자 체계가 있습니다. 한자어 수사: 일(1), 이(2), 삼(3)... 날짜, 금액, 전화번호에 사용. 고유어 수사: 하나, 둘, 셋... 나이, 시간(시), 개수에 사용. 금액 표기: 만(10,000) 단위로 구분하며, 1억 2345만 6789원처럼 표기합니다. 수표, 계약서에서는 위변조 방지를 위해 \'금 일억이천삼백사십오만육천칠백팔십구원정\'처럼 한글로 표기합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><NumberToKorean />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            숫자 한글 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            숫자 한글 변환기는 아라비아 숫자를 한글 금액 표기로 자동 변환해주는 무료 온라인 도구입니다. 수표, 계약서, 영수증, 청구서 작성 시 위변조 방지를 위해 금액을 한글로 적어야 할 때 유용합니다. 예를 들어 123,456,789원을 입력하면 '일억이천삼백사십오만육천칠백팔십구원'으로 즉시 변환하며, 한자 금액 표기(壹億貳千...)도 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            숫자 한글 변환 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>수표 작성:</strong> 수표에는 '금 ○○○원정' 형식으로 한글 금액을 기재해야 합니다. 변환기로 정확한 표기를 확인한 뒤 작성하세요.</li>
            <li><strong>계약서·각서:</strong> 계약서의 금액란에는 숫자와 한글을 병기하는 것이 원칙입니다. 한글 표기가 틀리면 법적 분쟁 시 불리할 수 있습니다.</li>
            <li><strong>한자 표기 활용:</strong> 공식 문서나 경조사 봉투에는 한자 금액 표기(壹, 貳, 參...)가 격식을 갖춘 표현으로 사용됩니다.</li>
            <li><strong>만 단위 구분:</strong> 한국어 금액 표기는 만·억·조 단위로 구분하므로, 숫자를 4자리씩 끊어 읽는 연습을 하면 큰 금액도 쉽게 읽을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
