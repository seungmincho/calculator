import { Metadata } from 'next'
import { Suspense } from 'react'
import IncomeTaxCalculator from '@/components/IncomeTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '종합소득세 계산기 2026 (2025년 귀속) - 프리랜서 세금 자동계산 | 툴허브',
  description: '2025년 귀속 종합소득세를 자동으로 계산합니다. 프리랜서 3.3% 원천징수 환급액, 업종별 단순경비율·기준경비율, 사업소득 세액공제까지 단계별로 확인하세요.',
  keywords: '종합소득세 계산기, 종합소득세 2026, 프리랜서 세금, 3.3% 원천징수, 단순경비율, 기준경비율, 사업소득세, 종합소득세 환급, 프리랜서 환급, 5월 종합소득세',
  openGraph: {
    title: '종합소득세 계산기 2026 (2025년 귀속) | 툴허브',
    description: '프리랜서·사업자 종합소득세 자동 계산. 업종별 경비율·세액공제 반영.',
    url: 'https://toolhub.ai.kr/income-tax',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '종합소득세 계산기 2026 | 툴허브',
    description: '프리랜서·사업자 종합소득세 자동계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/income-tax/',
  },
}

export default function IncomeTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '종합소득세 계산기',
    description: '2025년 귀속 프리랜서·사업자 종합소득세 자동 계산. 업종별 경비율·세액공제 반영.',
    url: 'https://toolhub.ai.kr/income-tax/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2025년 귀속 최신 세율 반영',
      '프리랜서 3.3% 원천징수 환급 계산',
      '업종별 단순경비율 자동 적용',
      '기준경비율 vs 단순경비율 비교',
      '인적공제·연금저축·IRP 세액공제',
      '자녀 세액공제 (2025 확대)',
      '지방소득세 포함 최종 세액',
      '단계별 계산 내역 표시',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '종합소득세란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '종합소득세는 개인이 1년간 벌어들인 사업소득, 프리랜서 소득, 기타소득 등을 합산하여 부과하는 세금입니다. 매년 5월 1일~31일에 전년도 소득을 신고·납부합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '프리랜서 3.3% 원천징수란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '프리랜서가 용역 대가를 받을 때 소득세 3%와 지방소득세 0.3%, 합계 3.3%가 미리 원천징수됩니다. 5월 종합소득세 신고 시 실제 세액과 비교하여 차액을 환급받거나 추가 납부합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '단순경비율과 기준경비율의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단순경비율은 수입금액에 일정 비율을 곱해 경비를 인정하는 방식으로, 직전연도 수입이 업종별 기준 미만인 소규모 사업자에게 적용됩니다. 기준경비율은 증빙 가능한 주요경비(매입·임차·인건비)를 먼저 공제한 뒤 나머지에 낮은 비율을 적용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '종합소득세 세율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 귀속 기준 6%~45%의 8단계 누진세율이 적용됩니다. 과세표준 1,400만원 이하 6%, 5,000만원 이하 15%, 8,800만원 이하 24%, 1.5억 이하 35%, 3억 이하 38%, 5억 이하 40%, 10억 이하 42%, 10억 초과 45%입니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '종합소득세 계산하는 방법',
    description: '사업소득과 경비를 입력하면 종합소득세와 환급액을 자동 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '소득 정보 입력', text: '연간 총 수입금액과 업종을 선택합니다. 기납부 원천징수세액(3.3%)도 입력합니다.' },
      { '@type': 'HowToStep', name: '경비율 선택', text: '단순경비율 또는 기준경비율을 선택합니다. 업종별 경비율이 자동 적용됩니다.' },
      { '@type': 'HowToStep', name: '공제 항목 설정', text: '인적공제, 연금저축, IRP 등 해당되는 세액공제 항목을 입력합니다.' },
      { '@type': 'HowToStep', name: '세액 확인', text: '종합소득세, 지방소득세, 환급 예상액을 단계별 계산 내역과 함께 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <IncomeTaxCalculator />
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
