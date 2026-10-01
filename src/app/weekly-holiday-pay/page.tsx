import { Metadata } from 'next'
import WeeklyHolidayPay from '@/components/WeeklyHolidayPay'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '주휴수당 계산기 - 아르바이트 주휴수당 자동계산 | 툴허브',
  description: '알바 주휴수당을 자동으로 계산합니다. 시급, 근무시간, 근무일수를 입력하면 주휴수당 포함 주급·월급·연봉을 확인할 수 있습니다. 2026년 최저시급 기준.',
  keywords: '주휴수당 계산기, 알바 주휴수당, 주휴수당 계산, 주휴수당 포함 시급, 아르바이트 급여, 주급 계산, 월급 계산',
  openGraph: {
    title: '주휴수당 계산기 | 툴허브',
    description: '알바 주휴수당 포함 주급·월급·연봉을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/weekly-holiday-pay',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/weekly-holiday-pay.png', width: 1200, height: 630, alt: '주휴수당 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '주휴수당 계산기',
    description: '아르바이트 주휴수당 포함 급여 자동계산',
    images: ['https://toolhub.ai.kr/og/weekly-holiday-pay.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/weekly-holiday-pay/',
  },
}

export default function WeeklyHolidayPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '주휴수당 계산기',
    description: '알바 주휴수당을 자동으로 계산합니다. 시급, 근무시간, 근무일수 입력으로 주급·월급·연봉을 확인하세요.',
    url: 'https://toolhub.ai.kr/weekly-holiday-pay',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['주휴수당 자동계산', '요일별 근무시간·휴게시간 입력', '209시간 방식 월급·주휴 포함 실질 시급', '주 15시간 쪼개기 비교', '3.3%·4대보험 공제 후 실수령액']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: "주휴수당은 몇 시간부터 받나요?", acceptedAnswer: { '@type': 'Answer', text: "1주 소정근로시간이 15시간 이상이면 받습니다. 주 15시간이면 주휴 3시간(15÷40×8), 주 20시간이면 4시간, 주 40시간 이상이면 최대 8시간분이 나옵니다." } },
      { '@type': 'Question', name: "결근한 주에도 주휴수당이 나오나요?", acceptedAnswer: { '@type': 'Answer', text: "아니요. 출근하기로 한 날 중 하루라도 결근하면 그 주 주휴수당은 생기지 않습니다(근로기준법 시행령 제30조 제1항). 다만 일한 날의 임금은 그대로 받습니다. 연차휴가처럼 회사가 승인한 휴가는 결근이 아닙니다." } },
      { '@type': 'Question', name: "퇴사하는 마지막 주에도 주휴수당을 받나요?", acceptedAnswer: { '@type': 'Answer', text: "받을 수 있습니다. 고용노동부는 2021년 8월 행정해석을 바꿔, 다음 주 근로 예정이 없어도 1주(7일) 동안 근로관계가 유지되고 그 주 소정근로일을 개근했다면 주휴수당을 줘야 한다고 봅니다. 예를 들어 월~금 근무 후 그다음 월요일 이후에 퇴사하면 마지막 주 주휴가 발생하지만, 금요일까지만 근로관계가 있으면 발생하지 않습니다." } },
      { '@type': 'Question', name: "주 14시간으로 쪼개서 계약하는 건 합법인가요?", acceptedAnswer: { '@type': 'Answer', text: "주 15시간 미만 계약 자체는 위법이 아닙니다. 하지만 실제로 15시간 이상 일하는 주가 이어진다면 실제 근로시간을 기준으로 주휴수당을 청구할 수 있습니다. 위의 쪼개기 비교에서 월 차이를 확인해 보세요." } },
      { '@type': 'Question', name: "주휴수당 포함 시급이라고 하면 최저임금 위반인가요?", acceptedAnswer: { '@type': 'Answer', text: "주 40시간 근무자라면 주휴수당을 포함한 시급이 12,384원(10,320 × 1.2) 이상이어야 최저임금 위반이 아닙니다. 그보다 적다면 기본 시급이 최저임금에 못 미치는 것이니 계약서를 확인하세요." } },
      { '@type': 'Question', name: "3.3% 떼는 알바도 주휴수당을 받나요?", acceptedAnswer: { '@type': 'Answer', text: "사장의 지시를 받아 정해진 시간에 일한다면 3.3%로 처리했더라도 근로자로 인정될 수 있고, 주휴수당·퇴직금 대상입니다. 근로자인지는 계약 형식이 아니라 실제 일하는 방식으로 판단합니다." } }
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <WeeklyHolidayPay />
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
            주휴수당 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            주휴수당 계산기는 아르바이트·파트타임 근로자의 주휴수당을 자동으로 계산해 드리는 도구입니다. 시급, 일주일 근무시간, 근무일수를 입력하면 주휴수당 포함 주급, 월급, 연봉 환산금액을 확인할 수 있습니다. 2026년 최저시급(10,320원) 기준으로 계산되며, 주 15시간 이상 근무 시 주휴수당 발생 여부와 금액을 즉시 확인할 수 있어 알바 계약 전 급여 협상에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            주휴수당 핵심 정보
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>발생 조건:</strong> 1주 소정근로시간이 15시간 이상이고, 계약된 근무일을 모두 출근한 경우 주 1회 유급 휴일(주휴일)에 대한 수당이 발생합니다.</li>
            <li><strong>계산 공식:</strong> 주휴수당 = (1주 소정근로시간 ÷ 40시간) × 8시간 × 시급. 예를 들어 주 20시간, 시급 10,320원이면 주휴수당은 41,280원입니다.</li>
            <li><strong>사업주 의무:</strong> 주휴수당은 근로기준법에서 정한 사업주의 법적 의무입니다. 15시간 이상 근무하는 알바생에게 주휴수당을 지급하지 않으면 임금 체불에 해당합니다.</li>
            <li><strong>실수령액 확인:</strong> 주휴수당이 포함된 실제 월급에서 4대보험 근로자 부담(약 9.7%: 국민연금 4.75%·건강 3.595%·장기요양·고용 0.9%)이 공제되므로, 실수령액은 계산된 총급여보다 약간 적습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
