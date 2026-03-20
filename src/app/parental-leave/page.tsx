import { Metadata } from 'next'
import { Suspense } from 'react'
import ParentalLeaveCalculator from '@/components/ParentalLeaveCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '육아휴직급여 계산기 2025 - 6+6 부모육아휴직제 반영 | 툴허브',
  description: '2025년 육아휴직급여를 자동 계산합니다. 6+6 부모육아휴직제, 월별 급여 상세, 부부 시뮬레이션, 육아기 근로시간 단축 급여까지 한번에 확인하세요. 사후지급금 폐지, 상한액 인상 등 최신 제도 반영.',
  keywords: '육아휴직급여 계산기, 육아휴직 급여, 6+6 부모육아휴직제, 육아휴직 계산, 육아휴직 상한액, 육아휴직 기간, 부부 육아휴직, 육아기 근로시간 단축, 사후지급금 폐지, 2025 육아휴직',
  openGraph: {
    title: '육아휴직급여 계산기 2025 - 6+6 부모육아휴직제 | 툴허브',
    description: '2025년 육아휴직급여 자동 계산. 6+6 부모육아휴직제, 월별 급여, 부부 시뮬레이션 지원.',
    url: 'https://toolhub.ai.kr/parental-leave/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '육아휴직급여 계산기 2025 | 툴허브',
    description: '2025년 6+6 부모육아휴직제 반영 육아휴직급여 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/parental-leave/',
  },
}

export default function ParentalLeavePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '육아휴직급여 계산기',
    description: '2025년 육아휴직급여를 자동 계산합니다. 6+6 부모육아휴직제, 월별 급여 상세, 부부 시뮬레이션 지원.',
    url: 'https://toolhub.ai.kr/parental-leave/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2025년 육아휴직급여 상한액 반영',
      '6+6 부모육아휴직제 자동 계산',
      '월별 급여 상세 테이블',
      '부부 시뮬레이션 (타임라인 시각화)',
      '육아기 근로시간 단축 급여 계산',
      '사후지급금 폐지 안내',
      '소득대체율 분석',
      'URL 공유 기능',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2025년 육아휴직급여는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 기준 육아휴직급여는 1~3개월 통상임금 100%(상한 250만원), 4~6개월 100%(상한 200만원), 7개월 이후 80%(상한 160만원)입니다. 하한액은 월 70만원입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '6+6 부모육아휴직제란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '부모 모두 생후 18개월 이내 자녀에 대해 육아휴직을 사용하면, 각 부모의 처음 6개월간 상한액이 월별로 250만~450만원까지 인상됩니다. 1~2개월 250만, 3개월 300만, 4개월 350만, 5개월 400만, 6개월 450만원입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '육아휴직 사후지급금이 폐지되었나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 2025년부터 사후지급금(25%) 제도가 폐지되어 육아휴직 기간 중 급여 전액을 수령할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '육아기 근로시간 단축 급여는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단축한 시간 중 첫 10시간분은 통상임금의 100%(상한 55만원), 나머지 단축분은 80%(상한 150만원)가 지급됩니다. 여기에 단축 후 근무시간에 대한 회사 급여가 추가됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <ParentalLeaveCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
