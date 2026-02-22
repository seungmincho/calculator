import { Metadata } from 'next'
import { Suspense } from 'react'
import BusinessNumber from '@/components/BusinessNumber'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '사업자등록번호 검증기 - 유효성 확인, 형식 검증 | 툴허브',
  description: '사업자등록번호 검증기 - 10자리 사업자등록번호의 유효성을 검증합니다. 체크섬 알고리즘으로 올바른 번호인지 즉시 확인하세요.',
  keywords: '사업자등록번호 검증, 사업자번호 확인, 사업자등록번호 유효성, business number validator, 사업자번호 검증기',
  openGraph: { title: '사업자등록번호 검증기 | 툴허브', description: '사업자등록번호 유효성 검증', url: 'https://toolhub.ai.kr/business-number', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '사업자등록번호 검증기 | 툴허브', description: '사업자등록번호 유효성 검증' },
  alternates: { canonical: 'https://toolhub.ai.kr/business-number' },
}

export default function BusinessNumberPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '사업자등록번호 검증기', description: '사업자등록번호 유효성 검증', url: 'https://toolhub.ai.kr/business-number', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['사업자번호 검증', '체크섬 알고리즘', '형식 확인', '검증 이력'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사업자등록번호 구조는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사업자등록번호는 10자리 숫자로 구성됩니다: XXX-XX-XXXXX. 앞 3자리는 세무서 코드(지방청코드 + 세무서 코드), 다음 2자리는 개인/법인 구분(01-79: 개인, 81-99: 법인), 마지막 5자리 중 4자리는 일련번호, 1자리는 검증번호입니다. 검증번호는 앞 9자리에 가중치(1,3,7,1,3,7,1,3,5)를 곱한 합으로 계산합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '사업자등록번호 진위 확인 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 국세청 홈택스: \'사업자등록번호 조회\' 서비스에서 실시간 진위 확인 가능 ② 공정거래위원회: 통신판매업 등록 여부 조회 ③ 이 도구: 검증 알고리즘으로 번호 형식의 유효성을 확인합니다. 사업자등록 상태(계속/휴업/폐업)는 홈택스에서만 확인 가능합니다. 온라인 거래 시 사업자번호를 확인하는 것은 사기 방지에 중요합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><BusinessNumber /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
