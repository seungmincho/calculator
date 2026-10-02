import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import ExchangeRateCalculator from '@/components/ExchangeRateCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
  description: '최신 환율(매일 갱신)로 달러·엔화·유로·위안 등 18개 통화를 즉시 환산합니다. 현찰 살 때·송금 보낼 때 환율, 환율 우대 90% 적용 금액, 여행 예산 환산까지 계산하세요.',
  keywords: '환율계산기, 환전계산기, 실시간환율, 달러환율, 엔화환율, 유로환율, 원화환전, 환율변환, 통화계산기',
  openGraph: {
    title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
    description: '달러·엔화·유로 등 18개 통화 환산, 현찰·송금 환율과 환율 우대 적용 금액',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/exchange-calculator',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/exchange-calculator.png',
        width: 1200,
        height: 630,
        alt: '환율 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '환율 계산기 - 실시간 환전 계산 | 툴허브',
    description: '달러·엔화·유로 등 18개 통화 환산, 현찰·송금 환율과 환율 우대 적용 금액',
    images: ['https://toolhub.ai.kr/og/exchange-calculator.png'],
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
    description: '매일 갱신되는 환율로 현찰·송금·우대 적용 환전 금액을 계산하는 도구',
    url: 'https://toolhub.ai.kr/exchange-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '최신 환율 계산(매일 갱신)',
      '18개 통화 지원',
      '현찰·송금 환율 계산',
      '환율 우대 적용 금액',
      '여행 예산 다중 통화 환산',
      '양방향 입력',
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
          text: '매매기준율은 은행 간 거래 기준 환율이고, 현찰매도율은 고객에게 외화를 팔 때 적용하는 환율입니다. 현찰매도율에는 환전 수수료(스프레드)가 포함되어(주요 통화 기준 대략 1.75~2%, 통화별로 다름) 있어 매매기준율보다 높습니다. 송금 시에는 전신환매도율이 적용되어 수수료가 더 낮습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '환전 수수료를 줄이는 방법이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '은행 앱·인터넷뱅킹 환전 신청, 환율 우대쿠폰, 거래실적 우대 등으로 스프레드의 일부(많게는 90% 이상)를 깎을 수 있습니다. 우대율은 은행·통화·시기마다 다르니 이 계산기의 우대율을 바꿔 가며 절약액을 비교해 보세요. 공항에서 급하게 환전하면 우대를 받기 어려운 경우가 많아 미리 신청해 두는 편이 유리합니다.',
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
    description: '통화를 선택하고 외화 또는 원화 금액을 입력하면 환전 금액을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '통화 선택', text: '환전할 외화(예: USD, JPY)를 빠른 선택 버튼이나 목록에서 고릅니다.' },
      { '@type': 'HowToStep', name: '금액 입력', text: '외화 칸이나 원화 칸 중 아무 곳에 금액을 입력하면 반대쪽이 자동으로 계산됩니다.' },
      { '@type': 'HowToStep', name: '환전 결과 확인', text: '매매기준율 환산 금액과 현찰·송금·환율 우대 적용 금액을 확인합니다.' },
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
        <ExchangeRateCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            환율 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            환율 계산기는 매일 갱신되는 환율 데이터를 기반으로 원화(KRW), 미국 달러(USD), 유로(EUR), 일본 엔(JPY) 등 주요 통화 간 환전 금액을 정확하게 계산하는 도구입니다. 해외여행 전 환전 금액 예측, 해외 직구 시 실제 원화 금액 확인, 외화 송금 계획 수립 등에 활용할 수 있습니다. 환율 우대율과 수수료 정보도 함께 제공하여 가장 유리한 환전 방법을 찾을 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            환율 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>환전 수수료 비교:</strong> 은행 앱으로 미리 환전 신청하면 환율 우대를 받기 쉽습니다. 환전 금액이 클수록 우대율 차이가 큰 영향을 미칩니다.</li>
            <li><strong>분할 환전 전략:</strong> 환율 변동이 클 때는 한 번에 모두 환전하지 않고 여러 번에 나눠 환전하면 평균 환율로 위험을 분산할 수 있습니다.</li>
            <li><strong>해외 직구 계산:</strong> 상품 가격에 현재 환율을 곱하면 원화 금액을 알 수 있습니다. 면세 한도(목록통관 기준 미국발 200달러, 그 외 150달러)를 넘으면 품목별 관세와 부가세가 붙으니 관세청 기준을 확인하세요.</li>
            <li><strong>외화 통장 활용:</strong> 환율이 낮을 때 외화 통장에 미리 달러를 사두면 환율 상승 시 환차익을 얻거나 해외여행 시 유리한 환율로 활용할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}