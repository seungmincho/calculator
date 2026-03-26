import { Metadata } from 'next'
import { Suspense } from 'react'
import AcquisitionTaxCalculator from '@/components/AcquisitionTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '취득세 계산기 2025 - 부동산 취득세·농특세·지방교육세 | 툴허브',
  description: '2025년 기준 부동산 취득세를 자동 계산합니다. 주택·토지·상가 취득세, 다주택 중과세율, 농어촌특별세, 지방교육세까지 한눈에 확인하세요.',
  keywords: '취득세 계산기, 부동산 취득세, 주택 취득세, 다주택 취득세, 농어촌특별세, 지방교육세, 취득세 중과, 조정대상지역, 2025 취득세',
  openGraph: {
    title: '취득세 계산기 2025 | 툴허브',
    description: '부동산 취득세·농특세·지방교육세 자동 계산. 다주택 중과 반영.',
    url: 'https://toolhub.ai.kr/acquisition-tax',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '취득세 계산기 2025 | 툴허브', description: '부동산 취득세 자동계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/acquisition-tax/' },
}

export default function AcquisitionTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '취득세 계산기',
    description: '2025년 기준 부동산 취득세·농특세·지방교육세 자동 계산. 다주택 중과 반영.',
    url: 'https://toolhub.ai.kr/acquisition-tax/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['주택·토지·상가 취득세', '다주택 중과세율', '6억~9억 선형 보간', '농어촌특별세·지방교육세', '실효세율 표시'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '주택 취득세율은 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '1주택 기준 취득가 6억원 이하 1%, 6~9억원 1~3%(선형 보간), 9억원 초과 3%입니다. 조정대상지역 2주택 8%, 3주택 이상 12%, 법인 12%가 적용됩니다.' } },
      { '@type': 'Question', name: '취득세 외에 추가 세금이 있나요?', acceptedAnswer: { '@type': 'Answer', text: '취득세 외에 농어촌특별세(전용 85㎡ 초과 시 취득세의 10%)와 지방교육세(취득세의 10%)가 별도로 부과됩니다.' } },
      { '@type': 'Question', name: '다주택 중과세율은 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '조정대상지역 2주택 8%, 3주택 이상 12%입니다. 비조정지역은 2주택 1~3%, 3주택 이상 8%입니다. 법인은 지역 무관 12%입니다.' } },
    ],
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '취득세 계산하는 방법',
    description: '부동산 유형과 취득 가격을 입력하면 취득세, 농특세, 지방교육세를 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '부동산 유형 선택', text: '주택, 토지, 상가 등 취득하려는 부동산 유형을 선택합니다.' },
      { '@type': 'HowToStep', name: '취득 정보 입력', text: '취득 가격, 보유 주택 수, 조정대상지역 여부를 입력합니다.' },
      { '@type': 'HowToStep', name: '세금 확인', text: '취득세, 농어촌특별세, 지방교육세와 합계 세액을 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper><AcquisitionTaxCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
