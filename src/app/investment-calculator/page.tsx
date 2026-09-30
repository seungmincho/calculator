import { Metadata } from 'next'
import InvestmentCalculator from '@/components/InvestmentCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '투자 수익률 계산기 - CAGR, 적립식·거치식 비교 | 툴허브',
  description: '월 적립식·거치식 투자의 미래 가치, 목표 금액 역산(필요 월 적립액·수익률·기간), 보수·중립·공격 시나리오, 일반·ISA·연금저축 계좌 세후 비교, 물가 반영 실질 가치를 계산하세요.',
  keywords: '투자 수익률 계산기, 적립식 투자 계산기, 거치식 투자, 복리 계산기, 목표 금액 계산, ISA 세금, 연금저축 세액공제, 4% 규칙, 인플레이션 보정, 투자 시뮬레이션',
  openGraph: {
    title: '투자 수익률 계산기 | 툴허브',
    description: '적립식·거치식 미래 가치, 목표 역산, 계좌별 세후 비교, 실질 가치.',
    url: 'https://toolhub.ai.kr/investment-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/investment-calculator.png', width: 1200, height: 630, alt: '투자 수익률 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '투자 수익률 계산기 | 툴허브',
    description: '적립식·거치식 투자, 목표 역산, ISA·연금 세후 비교',
    images: ['https://toolhub.ai.kr/og/investment-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/investment-calculator/',
  },
}

export default function InvestmentCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '투자 수익률 계산기',
    description: '적립식·거치식 투자 미래 가치, 목표 금액 역산, 수익률 시나리오, 일반·ISA·연금저축 세후 비교, 실질 가치 계산',
    url: 'https://toolhub.ai.kr/investment-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '적립식·거치식 투자 시뮬레이션 (적립액 연 증가율)',
      '목표 금액 역산: 필요 월 적립액·수익률·기간',
      '보수·중립·공격 수익률 시나리오 차트',
      '일반 계좌·ISA·연금저축+IRP 세후 비교 (2026년 세법)',
      '인플레이션 보정 실질 가치',
      '4% 규칙·분할 인출 월 수령액',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '월 50만원씩 20년 투자하면 얼마가 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연 7% 수익률이 매년 유지된다고 가정하면 원금 1.2억원이 약 2.6억원이 됩니다. 수익률 4%면 약 1.8억원, 10%면 약 3.6억원입니다. 실제 수익률은 변동하며 원금 손실이 날 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'ISA와 연금저축은 세금이 얼마나 다른가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '일반 계좌는 이자·배당에 15.4%가 붙습니다. ISA는 3년 이상 유지하면 순이익 200만원(서민형 400만원)까지 비과세, 초과분은 9.9% 분리과세입니다. 연금저축·IRP는 연 900만원까지 13.2~16.5% 세액공제를 받고 55세 이후 연금으로 받을 때 3.3~5.5% 연금소득세를 냅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '인플레이션 보정 실질 수익률은 왜 중요한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '명목 수익률이 높아도 물가가 오르면 실제 구매력은 덜 늘어납니다. 연 7% 수익에 물가 2%면 실질 수익률은 약 4.9%이고, 20년 뒤 2.6억원은 현재 돈 가치로 약 1.7억원입니다.',
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <InvestmentCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            투자 수익률 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            투자 수익률 계산기는 월 적립식·거치식 투자가 N년 뒤 얼마가 되는지, 목표 금액을 모으려면 매달 얼마·연 몇 %·몇 년이 필요한지를 계산하는 도구입니다. 수익률 시나리오별 결과, 일반 계좌·ISA·연금저축의 세후 차이, 물가를 반영한 실질 가치, 모은 돈을 매달 얼마씩 꺼내 쓸 수 있는지까지 한 화면에서 확인할 수 있습니다. 결과는 일정한 수익률을 가정한 시뮬레이션이며 투자 권유가 아닙니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            투자 수익률 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>복리의 힘:</strong> 연 7% 수익률로 10년 투자 시 원금이 약 2배 되는 복리 효과를 계산기로 직접 확인해보세요.</li>
            <li><strong>적립식 vs 거치식 비교:</strong> 목돈이 있다면 거치식이, 매달 여유 자금이 생긴다면 적립식이 현실적입니다. 두 방식의 결과를 비교해보세요.</li>
            <li><strong>인플레이션 보정 필수:</strong> 명목 수익률만 보지 말고 물가상승률(한국은행 목표 2%)을 차감한 실질 가치로 자산 증가를 평가하세요.</li>
            <li><strong>계좌 선택:</strong> 같은 수익이라도 ISA(비과세 200만원·초과 9.9%)나 연금저축·IRP(세액공제 13.2~16.5%)를 쓰면 세후 금액이 달라집니다. 연금저축은 55세 이후 연금 수령이 조건입니다.</li>
            <li><strong>72의 법칙:</strong> 원금이 2배 되는 기간 = 72 ÷ 수익률(%). 예: 연 6% 투자 시 약 12년 후 2배.</li>
            <li><strong>현실적 수익률 설정:</strong> 과거 수익률은 미래를 보장하지 않습니다. 예금 금리 수준(2~3%)부터 주식형 기대수익률까지 보수·중립·공격 시나리오로 폭을 두고 보세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
