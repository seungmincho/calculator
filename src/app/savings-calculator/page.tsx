import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import SavingsCalculator from '@/components/SavingsCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '적금 계산기 - 적금·복리 비교 | 툴허브',
  description: '적금·예금 만기 수령액과 세전·세후 이자 계산. 일반과세 15.4%·세금우대·비과세, 적금↔예금 실질 수익률, 상품 3개 비교, 목표 금액 역산.',
  keywords: '적금계산기, 적금이자계산기, 예금이자계산기, 예금계산기, 실질수익률, 정기적금, 복리적금, 저축계획, 적금이자계산, 만기수령액계산',
  openGraph: {
    title: '적금 계산기 | 툴허브',
    description: '적금·예금 만기 수령액과 세전·세후 이자 계산. 일반과세 15.4%·세금우대·비과세, 적금↔예금 실질 수익률, 상품 3개 비교, 목표 금액 역산.',
    url: 'https://toolhub.ai.kr/savings-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/savings-calculator.png', width: 1200, height: 630, alt: '적금 계산기' }],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/savings-calculator/',
  },
}

export default function SavingsCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '적금 계산기',
    description: '적금·예금 세전·세후 이자와 만기 수령액 계산기',
    url: 'https://toolhub.ai.kr/savings-calculator',
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
    featureList: ['적금·예금 이자 계산(단리·월복리)', '일반과세·세금우대·비과세 세후 이자', '적금↔예금 실질 연수익률 환산', '상품 3개 비교', '목표 금액 역산(월 납입액)', '월별 적립 잔액표']
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '적금 계산기 사용 방법',
    description: '정기적금, 자유적금, 복리적금 등 다양한 적금 상품의 만기 수령액과 이자를 계산하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '예금/적금 유형 선택',
        text: '적금(매달 적립) 또는 예금(거치)을 선택합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '원금과 기간 입력',
        text: '월 납입액(또는 거치 원금)과 적금 기간(개월 수)을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '금리 입력',
        text: '연 이율과 이자 방식(단리/복리)을 입력합니다. 은행 공시 금리를 참고하세요.',
      },
      {
        '@type': 'HowToStep',
        name: '이자와 만기 수령액 확인',
        text: '계산 결과에서 총 이자, 세전 만기 수령액, 이자소득세(15.4%)를 확인합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '세후 수익 비교',
        text: '비과세·세금우대 적금과 일반 적금의 세후 실수령액을 비교하여 최적의 상품을 선택합니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '단리와 복리의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단리는 원금에만 이자가 붙는 방식이고, 복리는 원금+이자에 다시 이자가 붙는 방식입니다. 같은 금리라면 복리가 더 많은 이자를 받을 수 있으며, 기간이 길수록 차이가 커집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 이자에 세금이 얼마나 붙나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '적금 이자소득에는 15.4%의 이자소득세(소득세 14% + 지방소득세 1.4%)가 원천징수됩니다. 비과세 적금이나 세금우대 적금(9.5%)을 활용하면 세금을 줄일 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 중도해지 시 이자는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중도해지 시 약정금리가 아닌 은행이 정한 중도해지 이율(경과 기간별로 기본금리의 일부, 초기엔 0.1% 수준)이 적용됩니다. 가입기간이 짧을수록 해지 금리가 낮아지므로 만기까지 유지하는 것이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '월 50만원 적금 1년이면 얼마를 받나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연 3.5% 단리 기준 세전 이자 113,750원, 이자소득세 15.4%(17,517원)를 떼면 세후 이자 96,233원으로 만기 수령액은 6,096,233원입니다. 적금 이자는 원금 600만원 × 3.5%가 아니라 매달 넣은 돈마다 이자 기간이 달라 약 절반 수준입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 연 5%는 예금으로 치면 몇 %인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '12개월 적금 연 5%는 같은 원금을 처음부터 예금에 넣은 것과 비교하면 약 연 2.71%입니다(연이율 × (개월수+1) ÷ (2 × 개월수)). 매달 넣은 돈은 남은 기간만큼만 이자가 붙기 때문입니다.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <I18nWrapper>
        <SavingsCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            적금 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            적금 계산기는 정기적금, 자유적금, 복리적금, 목표적금 등 다양한 저축 상품의 만기 수령액과 이자 금액을 미리 계산해 주는 무료 재테크 도구입니다. 월 납입액, 금리, 납입 기간, 이자 방식(단리/복리)을 입력하면 세전·세후 수령액을 즉시 확인하고, 여러 적금 상품을 비교하여 최적의 저축 계획을 세울 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            적금 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>이자소득세 반영:</strong> 적금 이자에는 15.4%의 이자소득세가 원천징수됩니다. 세후 실수령액을 기준으로 적금 상품을 비교해야 실제 이익을 정확히 파악할 수 있습니다.</li>
            <li><strong>복리 적금의 장기 효과:</strong> 단리와 복리의 차이는 단기에는 미미하지만 3년 이상 장기 적금에서 크게 벌어집니다. 복리 상품이 있다면 우선적으로 검토해보세요.</li>
            <li><strong>목표 금액 역산:</strong> 목표 금액이 정해진 경우 역산 기능을 이용하면 월 납입액을 자동으로 계산해 현실적인 저축 계획을 세울 수 있습니다.</li>
            <li><strong>비과세·세금우대 상품 비교:</strong> 청년미래적금(2026년 6월 출시, 비과세)·비과세종합저축은 이자 세금이 0원, 농협·신협·새마을금고 조합 예탁금(3,000만원 이하)은 1.4%만 내 같은 금리라도 세후 이자가 더 많습니다(2026년 이후 가입분은 농·수·산림조합 조합원이거나 총급여 7,000만원 이하일 때만, 그 밖에는 5~9% 분리과세).</li>
          </ul>
        </div>
      </section>
    </>
  )
}