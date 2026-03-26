import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import RealEstateCalculator from '@/components/RealEstateCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '부동산 계산기 - 대출·취득세 계산 | 툴허브',
  description: '전세자금대출, 주택담보대출 월 상환금액과 취득세를 정확하게 계산해보세요. LTV 계산 및 한국 부동산 세법 기준 적용.',
  keywords: '부동산계산기, 전세자금대출, 주택담보대출, 취득세계산, LTV계산, 부동산세금, 대출계산기',
  openGraph: {
    title: '부동산 계산기 - 전세자금대출, 주택담보대출, 취득세',
    description: '부동산 관련 모든 계산을 한 곳에서 쉽게 해결하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/real-estate-calculator',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '부동산 계산기 - 전세자금대출, 주택담보대출, 취득세',
    description: '전세자금대출, 주택담보대출 월 상환금액과 취득세를 정확하게 계산해보세요. LTV 계산 및 한국 부동산 세법 기준 적용.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/real-estate-calculator/',
  },
}

export default function RealEstateCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '부동산 계산기',
    description: '전세자금대출, 주택담보대출 월 상환금액과 취득세를 정확하게 계산해보세요',
    url: 'https://toolhub.ai.kr/real-estate-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    author: {
      '@type': 'Organization',
      name: '툴허브'
    },
    featureList: [
      '전세자금대출 계산',
      '주택담보대출 계산',
      '취득세 계산',
      'LTV 계산'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '취득세율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주택 취득세율은 주택 가격과 보유 주택 수에 따라 다릅니다. 1주택자 기준 6억원 이하 1%, 6~9억원 1~3%, 9억원 초과 3%입니다. 다주택자는 8~12%의 중과세율이 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'LTV(담보인정비율)란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LTV는 주택 가격 대비 대출 가능한 비율입니다. 규제지역 여부와 주택 가격에 따라 40~70%까지 적용됩니다. 예를 들어 LTV 50%이면 5억 주택에 최대 2.5억 대출이 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전세자금대출 한도는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전세자금대출 한도는 전세보증금의 80% 이내이며, 최대 3억원(수도권)~2억원(비수도권)까지 가능합니다. 소득과 신용도에 따라 실제 한도는 달라질 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '부동산 중개수수료는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '부동산 중개수수료는 거래 금액에 따라 요율이 달라집니다. 매매 기준 5천만원 미만 0.6%, 5천만~2억 0.5%, 2~9억 0.4%, 9~12억 0.5%, 12억 초과 0.9% 이하 협의입니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '부동산 중개수수료 계산하는 방법',
    description: '거래 유형과 금액을 입력하면 중개수수료, 취득세, 대출 상환액을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '거래 유형 선택', text: '전세자금대출, 주택담보대출, 취득세 중 계산할 항목을 선택합니다.' },
      { '@type': 'HowToStep', name: '부동산 정보 입력', text: '거래 금액, 주택 면적, 보유 주택 수 등 부동산 관련 정보를 입력합니다.' },
      { '@type': 'HowToStep', name: '비용 내역 확인', text: '중개수수료, 취득세, 대출 월 상환금 등 거래에 필요한 총 비용을 확인합니다.' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <I18nWrapper>
        <RealEstateCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            부동산 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            부동산 계산기는 전세자금대출, 주택담보대출 월 상환금액, 취득세, LTV 등 부동산 거래에 필요한 핵심 수치를 한 번에 계산해 주는 종합 금융 계산 도구입니다. 한국 부동산 세법과 대출 규정을 반영해 내 집 마련 전 예산 계획을 세우거나 이사 비용을 미리 파악하는 데 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            부동산 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>취득세 미리 파악:</strong> 주택 매매 계약 전에 취득세를 계산해두면 계약금·잔금 외의 추가 비용을 정확히 준비할 수 있습니다. 주택 수와 가격에 따라 세율이 크게 다릅니다.</li>
            <li><strong>LTV 확인으로 대출 한도 예측:</strong> 내 주택의 LTV(담보인정비율)와 DSR(총부채원리금상환비율)을 파악하면 실제 받을 수 있는 대출 한도를 사전에 예측할 수 있습니다.</li>
            <li><strong>전세자금대출 이자 비교:</strong> 대출 금리와 상환 기간을 바꾸어 가며 월 상환액을 비교하면 가장 부담이 적은 조건을 찾을 수 있습니다.</li>
            <li><strong>중개수수료 확인:</strong> 거래 금액에 따른 법정 중개수수료 상한을 미리 계산하면 과도한 수수료 요구에 대응할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}