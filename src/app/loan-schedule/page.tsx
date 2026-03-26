import { Metadata } from 'next'
import { Suspense } from 'react'
import LoanSchedule from '@/components/LoanSchedule'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '대출 상환 스케줄러 - 원리금균등/원금균등 상환 계획표 | 툴허브',
  description: '대출 상환 스케줄러 - 원리금균등, 원금균등, 만기일시상환 방식별 상세 상환 계획표를 생성하세요. 거치기간, 조기상환 시뮬레이션 지원.',
  keywords: '대출 상환 스케줄, 원리금균등상환, 원금균등상환, 만기일시상환, 상환 계획표, 대출 이자 계산, 조기상환, 거치기간, loan schedule',
  openGraph: {
    title: '대출 상환 스케줄러 | 툴허브',
    description: '원리금균등, 원금균등, 만기일시상환 방식별 상세 상환 계획표 생성',
    url: 'https://toolhub.ai.kr/loan-schedule',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '대출 상환 스케줄러 | 툴허브',
    description: '상환 방식별 상세 상환 계획표 생성 및 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/loan-schedule/',
  },
}

export default function LoanSchedulePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '대출 상환 스케줄러',
    description: '원리금균등, 원금균등, 만기일시상환 방식별 상세 상환 계획표를 생성하고 비교합니다. 거치기간, 조기상환 시뮬레이션 지원.',
    url: 'https://toolhub.ai.kr/loan-schedule',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '원리금균등상환 계획표',
      '원금균등상환 계획표',
      '만기일시상환 계획표',
      '거치기간 설정',
      '조기상환 시뮬레이션',
      '대출 조건 비교',
      'CSV 다운로드',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '원리금균등상환과 원금균등상환의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '원리금균등상환은 매월 동일한 금액(원금+이자)을 납부하여 계획적 상환이 가능합니다. 원금균등상환은 원금을 균등하게 나누고 잔액에 이자를 더해 초기 부담이 크지만 총 이자가 적습니다. 예를 들어 1억 원을 연 4%, 30년 상환 시 원리금균등은 총 이자 약 7,187만 원, 원금균등은 약 6,017만 원으로 약 1,170만 원 차이가 납니다.' } },
      { '@type': 'Question', name: '거치기간이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '거치기간은 원금 상환 없이 이자만 납부하는 기간입니다. 예를 들어 \"거치 1년, 상환 29년\"이면 처음 1년은 이자만 내고 이후 29년간 원금+이자를 상환합니다. 초기 부담이 줄지만 총 이자가 증가합니다. 1억 원, 연 4% 기준 거치 1년 시 총 이자가 약 400만 원 더 발생합니다.' } },
      { '@type': 'Question', name: '조기상환 수수료는 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '조기상환 수수료 = 조기상환금액 × 수수료율 × (잔여 약정일수 ÷ 총 약정일수)입니다. 일반적으로 수수료율은 대출 후 3년 이내 1.0~1.5%, 3년 초과 시 면제되는 경우가 많습니다. 2024년부터 은행권은 조기상환 수수료 상한이 인하되어 0.5~0.7% 수준입니다. 대출 잔여 기간이 짧을수록 수수료도 줄어듭니다.' } },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <LoanSchedule />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              대출 상환 스케줄러란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              대출 상환 스케줄러는 대출 원금, 금리, 기간, 상환 방식을 입력하면 매월 원금·이자·잔액을 항목별로 정리한 상환 계획표를 자동 생성합니다. 원리금균등, 원금균등, 만기일시상환 방식을 비교하고 거치기간·조기상환 시뮬레이션까지 지원해, 실제 은행 거래 전에 상환 계획을 꼼꼼히 점검할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              상환 스케줄 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>월별 계획 확인:</strong> 매월 납부 금액, 원금 비중, 이자 비중을 한눈에 확인해 가계 예산을 정확히 편성하세요.</li>
              <li><strong>조기상환 효과 분석:</strong> 특정 시점에 일부 상환 시 이자 절감액과 기간 단축 효과를 미리 파악하세요.</li>
              <li><strong>상환 방식 총액 비교:</strong> 같은 조건에서 원리금균등과 원금균등의 총 이자를 비교해 최적의 방식을 선택하세요.</li>
              <li><strong>CSV 다운로드:</strong> 생성된 상환 계획표를 CSV로 저장해 엑셀에서 추가 분석하거나 보관할 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
