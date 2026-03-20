import { Metadata } from 'next'
import SalaryCalculator from '@/components/SalaryCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '연봉 실수령액 계산기 | 툴허브 - 2026년 기준 정확한 계산',
  description: '2026년 기준 4대보험, 소득세를 제외한 실제 받을 수 있는 연봉을 계산해보세요. 무료 온라인 연봉 계산기로 월급 실수령액을 확인하세요. 대출, 적금, 세금 등 다양한 금융 계산기도 함께 제공됩니다.',
  keywords: '연봉계산기, 실수령액계산, 월급계산기, 세후연봉, 4대보험계산, 소득세계산, 2026년연봉, 금융계산기, 대출계산기, 적금계산기, 세금계산기, BMI계산기, 개발도구, 정규식추출기',
  openGraph: {
    title: '연봉 실수령액 계산기 | 툴허브 - 종합 금융 도구',
    description: '2026년 기준 정확한 연봉 실수령액 계산 + 대출, 적금, 세금 등 126+ 전문 도구 모음',
    url: 'https://toolhub.ai.kr/salary-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '툴허브 - 종합 계산기 도구',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '연봉 실수령액 계산기 | 툴허브',
    description: '2026년 기준 정확한 연봉 계산 + 126+ 전문 도구',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/salary-calculator/',
  },
}

export default function SalaryCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연봉 실수령액 계산기',
    alternateName: '툴허브 연봉계산기',
    description: '2026년 기준 4대보험, 소득세를 제외한 정확한 연봉 실수령액을 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/salary-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    inLanguage: ['ko-KR', 'en-US'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '연봉 실수령액 계산',
      '월급 실수령액 계산',
      '4대보험 계산 (국민연금, 건강보험, 고용보험, 산재보험)',
      '소득세 및 지방소득세 계산',
      '부양가족공제 적용',
      '2026년 세법 기준 적용',
      '비과세 소득 계산',
      '계산 결과 저장 및 공유',
      '다크모드 지원'
    ],
    creator: {
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr'
    },
    isAccessibleForFree: true,
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '연봉 3000만원의 실수령액은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연봉 3000만원의 월 실수령액은 약 224만원입니다. 4대보험(국민연금, 건강보험, 고용보험, 장기요양보험)과 소득세, 지방소득세를 공제한 금액입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '4대보험 계산은 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '4대보험은 국민연금(4.5%), 건강보험(3.545%), 장기요양보험(건강보험의 12.95%), 고용보험(0.9%)으로 구성됩니다. 월급에서 각 비율을 적용하여 계산합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '연봉과 월급의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연봉은 1년간 받는 총 급여액이고, 월급은 연봉을 12개월로 나눈 세전 월 급여입니다. 실수령액은 4대보험과 소득세를 공제한 후 실제 받는 금액입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '비과세 소득이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '비과세 소득은 식대(월 20만원), 자가운전보조금(월 20만원) 등 세금이 부과되지 않는 소득입니다. 비과세 소득이 있으면 실수령액이 증가합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '2026년 최저임금은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 최저임금은 시간당 10,030원이며, 주 40시간 기준 월 환산액은 약 2,096,270원입니다.',
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
      <I18nWrapper>
        <SalaryCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            연봉 실수령액 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            연봉 실수령액 계산기는 2026년 최신 세법 기준으로 국민연금, 건강보험, 고용보험, 장기요양보험 등 4대보험과 소득세, 지방소득세를 자동으로 공제한 월 실수령액을 정확하게 계산해 주는 무료 온라인 도구입니다. 연봉 협상, 이직 결정, 가계 예산 계획 시 실제 통장에 들어오는 금액을 미리 파악하는 데 필수적으로 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            연봉 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>비과세 수당 입력:</strong> 식대(월 20만원), 자가운전보조금(월 20만원) 등 비과세 항목을 입력하면 과세표준이 낮아져 실수령액이 증가합니다. 회사 급여 명세서에서 비과세 항목을 확인하세요.</li>
            <li><strong>부양가족 공제:</strong> 본인 외 배우자, 자녀, 부모 등 부양가족 수를 입력하면 소득세 공제가 적용되어 실수령액이 달라집니다. 정확한 부양가족 수를 반영하세요.</li>
            <li><strong>연봉 협상 기준 설정:</strong> 이직 제안 연봉의 실수령액을 현재 연봉과 비교하면 실질적인 인상분을 파악하고 협상 목표를 명확히 설정할 수 있습니다.</li>
            <li><strong>4대보험 요율 이해:</strong> 2026년 기준 국민연금 4.5%, 건강보험 3.545%, 장기요양 건강보험료의 12.95%, 고용보험 0.9%가 근로자 부담분입니다. 연봉 인상 시 추가 공제액도 함께 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
