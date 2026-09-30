import { Metadata } from 'next'
import StockCalculator from '@/components/StockCalculator'

export const metadata: Metadata = {
  title: '주식 수익률 계산기 | 툴허브 - 매수가 대비 수익률 및 손익 계산',
  description: '주식 매수가·매도가로 수수료와 2026년 증권거래세(0.20%)를 뺀 순수익률, 손익분기 매도가, 목표가, 물타기 평단, 미국 주식 환차익·양도세까지 계산하세요.',
  keywords: '주식수익률계산기, 주식손익계산, 주식수수료계산기, 증권거래세, 손익분기점, 물타기계산기, 평단가계산기, 미국주식양도세, 해외주식세금계산',
  openGraph: {
    title: '주식 수익률 계산기 | 툴허브',
    description: '수수료·증권거래세 뺀 순수익률, 손익분기 매도가, 물타기 평단, 미국 주식 양도세까지 한 번에 계산하세요',
    url: 'https://toolhub.ai.kr/stock-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/stock-calculator.png', width: 1200, height: 630, alt: '주식 수익률 계산기' }],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/stock-calculator/',
  },
}

export default function StockCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '주식 수익률 계산기',
    description: '수수료·증권거래세를 반영한 주식 순수익률, 손익분기 매도가, 목표가, 물타기 평균단가, 미국 주식 양도소득세 계산',
    url: 'https://toolhub.ai.kr/stock-calculator',
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
      '수수료·증권거래세 반영 순수익률',
      '손익분기 매도가(호가단위 반영)',
      '목표 수익률 매도가 역산',
      '물타기 평균단가·필요 수량',
      '미국 주식 환차익·양도소득세 22%',
      '계산 이력 저장·링크 공유'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '주식 수익률은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단순 수익률은 (매도가 - 매수가) ÷ 매수가 × 100입니다. 실제 순수익률은 매도 금액에서 매수·매도 수수료와 증권거래세를 뺀 순손익을 (매수 금액 + 매수 수수료)로 나눠 계산하므로 단순 수익률보다 약간 낮습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주식 거래 수수료는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '온라인 거래 수수료는 증권사·이벤트에 따라 다르며 국내 주식은 대체로 0.01~0.015% 안팎입니다. 매도 시에는 2026년 1월 1일 양도분부터 증권거래세가 코스피 0.20%(거래세 0.05% + 농어촌특별세 0.15%), 코스닥 0.20%, 코넥스 0.10% 부과되고 국내 ETF는 면제입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주식 양도소득세는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '국내 상장주식은 대주주에게만 양도소득세가 부과됩니다. 해외 주식은 1년간 손익을 합산해 기본공제 250만원을 뺀 금액에 22%(양도소득세 20% + 지방소득세 2%)가 부과되며, 다음 해 5월에 직접 신고·납부합니다. 원화 환산 시 환차익도 과세 대상에 포함됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '물타기로 평단을 낮추려면 몇 주를 더 사야 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '추가 수량 = 보유 수량 × (현재 평단 - 목표 평단) ÷ (목표 평단 - 현재가)입니다. 예를 들어 평단 80,000원에 100주, 현재가 60,000원에서 평단을 70,000원으로 만들려면 100주를 더 사야 합니다. 현재가가 목표 평단보다 낮을 때만 가능합니다.',
        },
      },
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
      <StockCalculator />
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            주식 수익률 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            주식 수익률 계산기는 매수가·매도가·수량을 입력하면 증권사 수수료와 증권거래세를 뺀 순수익과 순수익률, 손익분기 매도가를 바로 계산해 주는 도구입니다. 목표 수익률에 필요한 매도가, 분할 매수 평균단가와 물타기 필요 수량, 미국 주식의 환차익과 양도소득세까지 함께 계산할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            주식 수익률 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>수수료·세금 포함 계산:</strong> 2026년부터 코스피·코스닥 매도 시 0.20%의 세금이 붙습니다. 증권사 수수료까지 빼야 실제 남는 금액을 알 수 있습니다.</li>
            <li><strong>손익분기점 계산:</strong> 매수 금액과 매수 수수료를 매도 수수료·증권거래세를 빼고도 회수하는 가격이 손익분기 매도가입니다. 보통 매수가보다 0.2~0.25% 높습니다.</li>
            <li><strong>분할 매수 평균 단가:</strong> 여러 번에 나눠 매수했다면 총 투자 금액을 총 수량으로 나눠 평균 매수 단가를 계산한 뒤 수익률을 산출하세요.</li>
            <li><strong>해외 주식 세금:</strong> 해외 주식은 연간 250만원 초과 수익에 대해 양도소득세 22%(지방세 포함)가 부과되므로 세후 수익률도 함께 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}