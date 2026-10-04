import { Metadata } from 'next'
import Link from 'next/link'
import PensionCalculator from '@/components/PensionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { A_VALUE } from '@/utils/nationalPension'

// 간편 계산(나이·월 소득 → 예상 연금 + 월 보험료). 조기·연기·크레딧 상세는 /national-pension
const DESC = `나이와 월 소득만 넣으면 국민연금 예상 수령액과 매달 내는 보험료(본인 ${pct(INSURANCE.pensionRate)}·회사 ${pct(INSURANCE.pensionRate)}), 소득대체율을 바로 계산합니다. ${INSURANCE.year}년 연금개혁(보험료율 ${pct(INSURANCE.pensionRateTotal)})·A값 ${A_VALUE.toLocaleString('ko-KR')}원 반영.`

export const metadata: Metadata = {
  title: '국민연금 수령액 계산기 - 예상 연금액, 납부액 | 툴허브',
  description: DESC,
  keywords: '국민연금 계산기, 국민연금 수령액, 국민연금 납부액, 국민연금 보험료, 국민연금 예상액, 연금 계산, 노후 준비, 국민연금공단, 소득대체율',
  openGraph: {
    title: '국민연금 수령액 계산기 | 툴허브',
    description: '나이·월 소득만으로 국민연금 예상 수령액과 월 보험료(본인·회사 몫)를 바로 계산. 2026년 연금개혁·A값 반영.',
    url: 'https://toolhub.ai.kr/pension-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/pension-calculator.png', width: 1200, height: 630, alt: '국민연금 수령액 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '국민연금 수령액 계산기 | 툴허브',
    description: '나이·월 소득만으로 국민연금 예상 수령액과 월 보험료를 바로 계산하세요.',
    images: ['https://toolhub.ai.kr/og/pension-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/pension-calculator/',
  },
}

export default function PensionCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '국민연금 수령액 계산기',
    description: '나이와 월 소득만으로 국민연금 예상 수령액, 월 보험료(본인·회사 몫), 소득대체율을 계산하는 무료 간편 계산기',
    url: 'https://toolhub.ai.kr/pension-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '나이·월 소득만으로 국민연금 예상 수령액 계산',
      '월 보험료(본인·회사 부담) 계산',
      '총 납부액(본인 부담) 계산',
      '소득대체율 분석',
      '연금/납부 비율 계산',
      '상세 계산기(조기·연기 수령 비교)로 입력값 이어가기',
    ],
    inLanguage: 'ko',
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '국민연금 수령액은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기본연금액은 계수 × (A값 + B값) × (1 + 20년 초과 1년마다 5%)로 계산합니다. 계수는 가입연도별로 다르며 2026년 이후 가입기간은 1.29(40년 가입 시 소득대체율 43%)입니다. A값은 수급 전 3년간 전체 가입자 평균소득월액(2025.12~2026.11 적용 3,193,511원), B값은 본인 가입기간 평균 기준소득월액입니다. 가입기간 10~20년이면 기본연금액의 50%에 10년 초과 1년마다 5%를 더합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '국민연금 보험료는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 보험료율은 소득의 9.5%로 2033년 13%까지 매년 0.5%p 오릅니다. 직장가입자는 근로자·회사가 4.75%씩, 지역가입자는 9.5% 전액을 냅니다. 기준소득월액 상한은 659만원(2026년 7월~2027년 6월)으로 이를 넘는 소득에는 보험료가 부과되지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '국민연금 수령 나이는 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '출생연도에 따라 국민연금 수령 개시 연령이 다릅니다. 1969년 이후 출생자는 65세부터 노령연금을 수령할 수 있습니다. 최소 가입 기간은 10년(120개월)이며, 가입 기간이 길수록 수령액이 증가합니다. 조기노령연금 신청 시 60세부터 수령 가능하나 수령액이 감액됩니다.',
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
              <PensionCalculator />
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
            국민연금 수령액 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-4">
            국민연금 수령액 계산기는 현재 나이, 월 소득, 가입 시작 나이, 은퇴 나이 네 가지만 넣으면 예상 국민연금 월 수령액과 매달 내는 보험료(본인·회사 몫), 총 납부액, 소득대체율을 바로 보여주는 간편 계산기입니다. 2026년 연금개혁과 2026년 적용 A값을 반영한 국민연금법 계산식(A값·B값)을 적용하며, 은퇴 나이를 바꿔 가며 수령액이 어떻게 달라지는지 빠르게 확인할 수 있습니다.
          </p>
          <p className="text-body leading-relaxed mb-6">
            조기수령·연기수령 비교, 출산·군복무 크레딧, 부양가족연금, 추납 효과까지 따져 보려면{' '}
            <Link href="/national-pension/" className="text-primary font-semibold hover:underline">상세 국민연금 계산기</Link>
            를 이용하세요. 계산 결과 아래 버튼을 누르면 입력한 값이 그대로 이어집니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            국민연금 수령액 늘리는 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>가입 기간 연장:</strong> 국민연금은 가입 기간이 길수록 수령액이 비례해서 증가합니다. 직장 이직 공백기에 임의계속가입을 신청하면 수령액을 높일 수 있습니다.</li>
            <li><strong>임의가입 활용:</strong> 전업주부나 소득이 없는 기간에도 임의가입(월 최소 9만 원대)으로 국민연금에 납부하면 수령액과 가입 기간을 늘릴 수 있습니다.</li>
            <li><strong>연금 수령 시기 조절:</strong> 65세 이후로 수령을 연기하면 매 1년마다 7.2%씩 연금액이 증가합니다. 5년 연기 시 36% 증가 효과가 있습니다.</li>
            <li><strong>추납 제도 활용:</strong> 과거 미납 기간이 있다면 추후납부(추납) 제도를 통해 납부하고 가입 기간을 채워 수령액을 높일 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
