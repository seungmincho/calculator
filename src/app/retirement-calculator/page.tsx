import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import RetirementCalculator from '@/components/RetirementCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '퇴직금 계산기 - 세후 수령액 | 툴허브',
  description: '입사일·퇴사일과 월급만 넣으면 법정 퇴직금과 평균임금, 2026년 기준 퇴직소득세, 세후 실수령액을 바로 계산합니다. 3개월 상세 입력·통상임금 비교, IRP 과세이연 절세액, 퇴사일을 늦출 때 퇴직금 변화까지 확인하세요.',
  keywords: '퇴직금계산기, 퇴직금 계산기, 퇴직금 계산, 법정 퇴직금, 평균임금 계산, 평균임금, 통상임금, 퇴직소득세, 퇴직소득세 계산, 세후 퇴직금, 퇴직금 실수령액, IRP 퇴직금, 과세이연, 근속연수공제, 1년 미만 퇴직금, 5인 미만 퇴직금',
  openGraph: {
    title: '퇴직금 계산기 | 툴허브',
    description: '법정 퇴직금·평균임금부터 퇴직소득세·세후 실수령액, IRP 절세까지 한 번에',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/retirement-calculator',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/retirement-calculator.png',
        width: 1200,
        height: 630,
        alt: '퇴직금 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '퇴직금 계산기 | 툴허브',
    description: '법정 퇴직금·평균임금부터 퇴직소득세·세후 실수령액, IRP 절세까지 한 번에',
    images: ['https://toolhub.ai.kr/og/retirement-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/retirement-calculator/',
  },
}

export default function RetirementCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퇴직금 계산기',
    description: '입사일·퇴사일과 임금으로 법정 퇴직금, 평균임금, 퇴직소득세, 세후 실수령액, IRP 과세이연 효과를 계산하는 도구',
    url: 'https://toolhub.ai.kr/retirement-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: ['법정 퇴직금 계산', '평균임금 계산(3개월 상세·상여금·연차수당 3/12)', '통상임금 비교 적용', '퇴직소득세·지방소득세 계산(2023년~ 공제)', '세후 실수령 퇴직금', 'IRP 과세이연·연금수령 감면 비교', '퇴사일 연기 시뮬레이션', '1년 미만 남은 일수 표시']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퇴직금은 언제부터 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '근로자퇴직급여 보장법 제4조에 따라 1년 이상 계속 근무하고 4주 평균 주 15시간 이상 일한 근로자는 퇴직금을 받을 수 있습니다. 근속 1년에 30일분의 평균임금을 받으며, 1년에서 하루라도 부족하면 법정 퇴직금이 없습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직소득세는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '퇴직소득세는 퇴직금에서 근속연수공제를 빼고 12배·근속연수로 나눠 환산급여를 구한 뒤, 환산급여공제를 빼고 기본세율을 적용해 다시 근속연수/12를 곱해 계산합니다(소득세법 제48조·제55조). 근속연수공제는 2023년 이후 5년 이하 100만원×근속연수, 10년 이하 500만원+200만원×(근속연수-5), 20년 이하 1,500만원+250만원×(근속연수-10), 20년 초과 4,000만원+300만원×(근속연수-20)입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'DC형과 DB형 퇴직연금의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DB형(확정급여형)은 퇴직 시 평균임금×근속연수로 퇴직금이 확정됩니다. DC형(확정기여형)은 회사가 매년 연간 임금총액의 1/12 이상을 납입하고(제20조), 운용 수익에 따라 수령액이 달라집니다. 임금 인상이 큰 경우 DB형이, 투자 수익이 높으면 DC형이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직금 중간정산은 가능한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2012년 이후 퇴직금 중간정산은 원칙적으로 금지되었지만, 무주택자 주택 구입·전세금, 6개월 이상 요양, 5년 내 파산·개인회생, 임금피크제, 근로시간 단축, 재난 등 법정 사유(근로자퇴직급여 보장법 시행령 제3조)에 해당하면 중간정산이 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직금(평균임금)은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '퇴직금 = 1일 평균임금 × 30일 × 재직일수 ÷ 365(근로자퇴직급여 보장법 제8조). 1일 평균임금은 퇴직 전 3개월 임금총액에 직전 1년 상여금·연차수당의 3/12을 더해 그 3개월 달력 일수(89~92일)로 나눕니다. 통상임금보다 적으면 통상임금을 씁니다(근로기준법 제2조 ②).',
        },
      },
      {
        '@type': 'Question',
        name: '5인 미만 사업장도 퇴직금을 받나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네. 근로자를 1명 이상 사용하는 모든 사업장에 적용되며(근로자퇴직급여 보장법 제3조), 5인 미만 사업장도 2013년부터 100% 지급 대상입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퇴직금 지급 기한은 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '퇴직 후 14일 이내에 지급해야 하며(근로자퇴직급여 보장법 제9조), 늦어지면 연 20%의 지연이자가 붙습니다(근로기준법 제37조). 미지급 시 5년 이하 징역 또는 5천만원 이하 벌금 대상입니다(근로자퇴직급여 보장법 제43조, 2026.9.18 시행).',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '퇴직금 계산하는 방법',
    description: '입사일, 퇴사일, 평균임금을 입력하면 법정 퇴직금과 퇴직소득세를 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '근무기간 입력', text: '입사일과 퇴사일을 입력하여 총 근속기간을 산정합니다.' },
      { '@type': 'HowToStep', name: '평균임금 입력', text: '월급(기본) 또는 퇴직 전 3개월 구간별 임금(상세)과 상여금·연차수당을 입력합니다.' },
      { '@type': 'HowToStep', name: '퇴직금 확인', text: '법정 퇴직금, 퇴직소득세, 실수령 퇴직금을 단계별로 확인합니다.' },
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
        <RetirementCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            퇴직금 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            퇴직금 계산기는 평균임금과 근무기간을 입력해 법정 퇴직금 금액과 퇴직소득세를 자동으로 계산해 주는 근로자 필수 금융 도구입니다. 근로자퇴직급여 보장법에 따라 1년 이상 근속한 모든 근로자(정규직·계약직·아르바이트)에게 퇴직금이 지급되며, 이 계산기로 세후 실수령 퇴직금을 미리 파악해 이직이나 퇴직 계획을 세울 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            퇴직금 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>평균임금 정확히 입력:</strong> 퇴직 전 3개월간 지급된 기본급뿐 아니라 직전 1년 상여금과 연차 미사용 수당의 3/12도 평균임금에 포함됩니다. 정확한 금액을 입력해야 실제 퇴직금과 일치합니다.</li>
            <li><strong>DB형 vs DC형 퇴직연금 비교:</strong> 임금 인상이 많을 경우 DB형(확정급여형)이, 운용 수익에 자신 있다면 DC형(확정기여형)이 유리합니다. 두 형태의 예상 수령액을 미리 비교해보세요.</li>
            <li><strong>IRP 이체로 세금 절감:</strong> 퇴직금을 IRP(개인형 퇴직연금)로 이체하면 퇴직소득세의 30~50%(2026년부터 연금수령 21년차 이후 50%)를 절감할 수 있습니다. 55세 이후 연금으로 수령하면 더 낮은 세율이 적용됩니다.</li>
            <li><strong>이직 시기 전략:</strong> 근속연수에 따라 퇴직금 공제액이 커지므로, 근속연수는 1년 미만 끝수를 1년으로 보므로 만 N년을 하루만 넘겨도 공제가 커집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}