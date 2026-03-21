import { Metadata } from 'next'
import { Suspense } from 'react'
import DdayCalculator from '@/components/DdayCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '디데이 계산기 - D-Day 카운터, 날짜 차이 계산 | 툴허브',
  description: 'D-Day 카운트다운, 두 날짜 사이 차이 계산, 날짜 더하기/빼기를 한 곳에서. 한국 공휴일과 영업일 계산을 지원합니다.',
  keywords: '디데이 계산기, D-Day, 날짜 계산, 날짜 차이, 영업일 계산, 공휴일, 수능 디데이, 디데이 카운터',
  openGraph: {
    title: '디데이 계산기 | 툴허브',
    description: 'D-Day 카운트다운, 날짜 차이 계산, 영업일 계산 도구',
    url: 'https://toolhub.ai.kr/dday-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '디데이 계산기 - D-Day 카운터 & 날짜 계산',
    description: 'D-Day 카운트다운, 날짜 차이, 영업일 계산을 한 곳에서.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dday-calculator/',
  },
}

export default function DdayCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '디데이 계산기',
    description: 'D-Day 카운트다운, 날짜 차이 계산, 날짜 더하기/빼기 도구',
    url: 'https://toolhub.ai.kr/dday-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'D-Day 카운트다운',
      '날짜 차이 계산',
      '날짜 더하기/빼기',
      '영업일 계산',
      '한국 공휴일 반영',
      '인기 D-Day 프리셋',
      'URL 공유'
    ]
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'D-Day는 당일을 포함하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'D-Day는 보통 목표 당일을 D-0으로 세고, 오늘부터 남은 날을 D-N으로 표기합니다. 예를 들어 시험이 3일 후면 D-3입니다. 다만 일상에서는 당일을 D-1로 세는 경우도 있어 혼동이 있으니, "남은 일수"와 "D-Day" 표기를 구분하여 사용하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '영업일 계산이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '영업일 계산은 주말(토·일)과 공휴일을 제외한 근무일만 계산하는 방식입니다. 예를 들어 "서류 접수 후 5영업일 이내 처리"라면 주말과 공휴일을 빼고 5일을 세면 됩니다. 금요일에 접수하면 다음 주 금요일이 아닌, 공휴일이 없다면 다음 주 금요일이 5영업일째입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '한국의 법정 공휴일은 몇 일인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국의 법정 공휴일은 연간 약 15~16일입니다. 신정(1일), 설날(3일), 삼일절, 어린이날, 부처님오신날, 현충일, 광복절, 추석(3일), 개천절, 한글날, 크리스마스가 있으며, 대체공휴일 제도로 공휴일이 주말과 겹치면 다음 평일이 휴일이 됩니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <DdayCalculator />
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
            디데이(D-Day) 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            디데이 계산기는 특정 날짜까지 남은 일수를 카운트다운하거나, 두 날짜 사이의 정확한 차이를 계산하는 날짜 계산 도구입니다. 수능·시험·결혼·군전역·기념일 등 중요한 날까지의 D-Day를 확인하고, 한국 공휴일과 주말을 제외한 영업일 계산도 지원합니다. URL 공유 기능으로 계산 결과를 다른 사람과 손쉽게 나눌 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            디데이 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>수능·시험 D-Day:</strong> 시험 날짜를 입력하면 오늘부터 남은 일수를 자동으로 계산합니다. 프리셋으로 수능·토익·공무원 시험을 빠르게 등록할 수 있습니다.</li>
            <li><strong>영업일 계산:</strong> 계약서 체결 후 '10영업일 이내 지급' 같은 조건을 계산할 때 주말과 법정 공휴일이 자동으로 제외됩니다.</li>
            <li><strong>날짜 더하기/빼기:</strong> 기준일에서 일·주·월·년을 더하거나 빼서 계약 만료일, 보증 기간 종료일 등을 계산할 수 있습니다.</li>
            <li><strong>URL 공유:</strong> 계산 결과를 URL로 공유하여 팀원이나 가족과 중요한 날짜를 함께 확인할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
