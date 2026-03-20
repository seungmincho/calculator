import { Metadata } from 'next'
import { Suspense } from 'react'
import CapitalGainsTax from '@/components/CapitalGainsTax'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '양도소득세 계산기 - 부동산 양도세 자동 계산 | 툴허브',
  description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세(12억), 다주택 중과세율, 지방소득세까지 2025년 기준으로 단계별 계산.',
  keywords: '양도소득세 계산기, 양도세 계산, 부동산 양도세, 장기보유특별공제, 1세대1주택 비과세, 다주택 중과세율, 양도차익 계산, 2025 양도소득세',
  openGraph: {
    title: '양도소득세 계산기 | 툴허브',
    description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세, 다주택 중과세율 반영.',
    url: 'https://toolhub.ai.kr/capital-gains-tax/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '양도소득세 계산기 | 툴허브',
    description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세, 다주택 중과세율 반영.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/capital-gains-tax/',
  },
}

export default function CapitalGainsTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '양도소득세 계산기',
    description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세(12억), 다주택 중과세율, 지방소득세까지 2025년 기준 단계별 계산.',
    url: 'https://toolhub.ai.kr/capital-gains-tax',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '양도차익 자동 계산',
      '장기보유특별공제 (최대 80%)',
      '1세대1주택 비과세 (12억 기준)',
      '다주택자 중과세율 (+20%p / +30%p)',
      '지방소득세 포함 총 납부세액',
      '단계별 계산 내역 표시',
      '실효세율 계산',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '양도소득세란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '양도소득세는 부동산, 주식 등 자산을 팔아 발생한 양도차익(시세차익)에 부과되는 세금입니다. 양도가액에서 취득가액과 필요경비를 빼고, 장기보유특별공제와 기본공제 250만원을 공제한 과세표준에 누진세율을 적용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '1세대1주택 비과세 조건은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1세대1주택 비과세는 ① 2년 이상 보유, ② 조정대상지역은 2년 이상 거주, ③ 양도가액 12억 이하 시 전액 비과세입니다. 12억 초과 시 초과분에 해당하는 비율만 과세됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '장기보유특별공제란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '장기보유특별공제는 3년 이상 보유한 부동산의 양도차익에서 일정 비율을 공제하는 제도입니다. 일반 부동산은 3년~15년 이상 보유 시 6%~30% 공제되며, 1세대1주택은 보유기간 최대 40% + 거주기간 최대 40%로 최대 80%까지 공제됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '다주택자 중과세율은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '조정대상지역 내 2주택자는 기본세율에 +20%p, 3주택 이상은 +30%p의 중과세율이 적용됩니다. 2025년 현재 중과 한시 유예 가능성이 있으니 반드시 관할 세무서에 확인하세요.',
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
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <CapitalGainsTax />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
