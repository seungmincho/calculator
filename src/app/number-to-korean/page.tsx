import { Metadata } from 'next'
import { Suspense } from 'react'
import NumberToKorean from '@/components/NumberToKorean'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '숫자 한글 변환 - 금액 한글 표기, 수표 작성 | 툴허브',
  description: '숫자 한글 변환 - 숫자를 한글 금액으로 변환합니다. 수표, 계약서, 영수증 작성 시 유용. 한자 금액 표기도 지원합니다.',
  keywords: '숫자 한글 변환, 금액 한글 표기, 수표 금액 한글, number to korean, 한글 숫자, 금일봉',
  openGraph: { title: '숫자 한글 변환 | 툴허브', description: '숫자를 한글 금액 표기로 변환', url: 'https://toolhub.ai.kr/number-to-korean', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '숫자 한글 변환 | 툴허브', description: '숫자를 한글 금액으로 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/number-to-korean' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><NumberToKorean /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
