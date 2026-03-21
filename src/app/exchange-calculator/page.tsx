import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import ExchangeRateCalculator from '@/components/ExchangeRateCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
  description: '실시간 환율로 원화·달러·유로·엔화·위안 등 주요 통화를 즉시 환산합니다. 해외여행, 직구, 해외송금 전 환전 금액을 미리 계산하세요.',
  keywords: '환율계산기, 환전계산기, 실시간환율, 달러환율, 엔화환율, 유로환율, 원화환전, 환율변환, 통화계산기',
  openGraph: {
    title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
    description: '원화·달러·유로·엔화 등 주요 통화를 실시간 환율로 즉시 환산',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/exchange-calculator',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '환율 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
    description: '원화·달러·유로·엔화 등 주요 통화를 실시간 환율로 즉시 환산',
    images: ['/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/exchange-calculator/',
  },
}

export default function ExchangeCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '환율 계산기',
    description: '실시간 환율 데이터를 사용하여 정확한 환전 금액을 계산하는 도구',
    url: 'https://toolhub.ai.kr/exchange-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '실시간 환율 계산',
      '12개 주요 통화 지원',
      '환율 히스토리',
      '통화 변환',
      '환전 수수료 안내'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '환전할 때 매매기준율과 현찰매도율의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '매매기준율은 은행 간 거래 기준 환율이고, 현찰매도율은 고객에게 외화를 팔 때 적용하는 환율입니다. 현찰매도율에는 1.5~2% 수준의 환전 수수료(스프레드)가 포함되어 있어 매매기준율보다 높습니다. 송금 시에는 전신환매도율이 적용되어 수수료가 더 낮습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '환전 수수료를 줄이는 방법이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '인터넷뱅킹/모바일뱅킹으로 환전하면 50~90% 환율 우대를 받을 수 있습니다. 또한 환율 우대쿠폰 사용, 거래실적에 따른 우대, 대량 환전 시 협상 등의 방법이 있습니다. 시중은행보다 공항 환전소가 수수료가 높으므로 미리 환전하는 것이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '환율이 높으면 해외여행이 불리한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 원화 약세(환율 상승)일 때는 같은 달러를 사려면 더 많은 원화가 필요하므로 해외여행 비용이 증가합니다. 반대로 수출 기업이나 해외에서 돈을 버는 경우에는 유리합니다. 환율 변동이 크면 분할 환전으로 위험을 줄일 수 있습니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '환율 계산하는 방법',
    description: '통화를 선택하고 금액을 입력하면 실시간 환율로 환전 금액을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '통화 선택', text: '변환할 출발 통화(예: KRW)와 도착 통화(예: USD)를 선택합니다.' },
      { '@type': 'HowToStep', name: '금액 입력', text: '환전하려는 금액을 입력합니다. 실시간 환율이 자동으로 적용됩니다.' },
      { '@type': 'HowToStep', name: '환전 결과 확인', text: '환전 금액과 적용 환율, 환전 수수료 정보를 확인합니다.' },
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
        <Breadcrumb />
        <ExchangeRateCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            환율 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            환율 계산기는 실시간 환율 데이터를 기반으로 원화(KRW), 미국 달러(USD), 유로(EUR), 일본 엔(JPY) 등 주요 통화 간 환전 금액을 정확하게 계산하는 도구입니다. 해외여행 전 환전 금액 예측, 해외 직구 시 실제 원화 금액 확인, 외화 송금 계획 수립 등에 활용할 수 있습니다. 환율 우대율과 수수료 정보도 함께 제공하여 가장 유리한 환전 방법을 찾을 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            환율 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>환전 수수료 비교:</strong> 공항 환전소보다 시중은행 인터넷뱅킹이 50~90% 환율 우대를 받을 수 있어 유리합니다. 환전 금액이 클수록 우대율 차이가 큰 영향을 미칩니다.</li>
            <li><strong>분할 환전 전략:</strong> 환율 변동이 클 때는 한 번에 모두 환전하지 않고 여러 번에 나눠 환전하면 평균 환율로 위험을 분산할 수 있습니다.</li>
            <li><strong>해외 직구 계산:</strong> 상품 가격에 현재 환율을 곱하고 관세(일반 8%)와 부가세(10%)를 추가하면 실제 수령 비용을 예측할 수 있습니다. 150달러 이하 면세 한도도 확인하세요.</li>
            <li><strong>외화 통장 활용:</strong> 환율이 낮을 때 외화 통장에 미리 달러를 사두면 환율 상승 시 환차익을 얻거나 해외여행 시 유리한 환율로 활용할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}