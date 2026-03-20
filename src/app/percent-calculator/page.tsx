import { Metadata } from 'next'
import { Suspense } from 'react'
import PercentCalculator from '@/components/PercentCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '퍼센트 계산기 - 비율, 증감률, 할인율 계산 | 툴허브',
  description: '퍼센트 계산기 - X의 Y%는? 비율 계산, 증감률 계산, 퍼센트 추가/차감 (세금, 할인) 등 다양한 퍼센트 계산을 한 곳에서 간편하게 해보세요.',
  keywords: '퍼센트 계산기, 퍼센트 계산, 비율 계산, 증감률 계산, 할인율 계산, 세금 계산, 백분율 계산기, percent calculator',
  openGraph: {
    title: '퍼센트 계산기 | 툴허브',
    description: '퍼센트 계산, 비율 계산, 증감률, 할인율 등 다양한 퍼센트 계산을 한 곳에서 간편하게',
    url: 'https://toolhub.ai.kr/percent-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '퍼센트 계산기 | 툴허브',
    description: '퍼센트 계산, 비율 계산, 증감률, 할인율 등 다양한 퍼센트 계산을 한 곳에서 간편하게',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/percent-calculator/',
  },
}

export default function PercentCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퍼센트 계산기',
    description: '퍼센트 계산, 비율 계산, 증감률 계산, 퍼센트 추가/차감 등 다양한 퍼센트 계산을 한 곳에서 간편하게 해보세요.',
    url: 'https://toolhub.ai.kr/percent-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '기본 퍼센트 계산 (X의 Y%)',
      '비율 계산 (X는 Y의 몇%)',
      '증감률 계산',
      '퍼센트 추가/차감 (세금, 할인)',
      '계산 기록',
      '빠른 퍼센트 버튼',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퍼센트(%)는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기본 퍼센트 계산은 "A의 B% = A × B ÷ 100"입니다. 예를 들어 200의 15%는 200 × 15 ÷ 100 = 30입니다. "A는 B의 몇 %?"는 (A ÷ B) × 100으로 계산합니다. 50은 200의 25%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '증감률은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '증감률 = (변화 후 값 - 변화 전 값) ÷ 변화 전 값 × 100(%)입니다. 양수면 증가율, 음수면 감소율입니다. 예를 들어 100에서 130으로 변했다면 증가율은 (130-100)÷100×100 = 30%이고, 100에서 80으로 변했다면 감소율은 -20%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '할인을 중복 적용하면 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '할인을 중복 적용할 때는 단순히 할인율을 더하지 않고 순차적으로 곱합니다. 예를 들어 30% 할인 후 추가 20% 할인이면, 원가 × 0.7 × 0.8 = 원가 × 0.56이므로 실제 할인율은 44%입니다. 30% + 20% = 50%가 아님에 주의하세요.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '퍼센트 계산하는 방법',
    description: '계산 모드를 선택하고 값을 입력하면 퍼센트, 비율, 증감률을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '계산 모드 선택', text: '기본 퍼센트(X의 Y%), 비율 계산, 증감률, 퍼센트 추가/차감 중 원하는 모드를 선택합니다.' },
      { '@type': 'HowToStep', name: '값 입력', text: '기준값과 퍼센트 또는 비교할 두 값을 입력합니다.' },
      { '@type': 'HowToStep', name: '결과 확인', text: '계산 결과와 함께 계산 과정을 단계별로 확인할 수 있습니다.' },
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <PercentCalculator />
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
            퍼센트 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            퍼센트 계산기는 기본 퍼센트 계산(X의 Y%), 비율 계산(X는 Y의 몇%), 증감률 계산, 퍼센트 추가·차감(세금·할인 적용) 등 다양한 백분율 계산을 한 번에 처리할 수 있는 무료 온라인 계산기입니다. 쇼핑 할인율, 부가세(10%) 계산, 성적 백분위, 투자 수익률 등 일상과 업무에서 자주 만나는 퍼센트 계산을 빠르고 정확하게 수행할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            퍼센트 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>할인율 계산:</strong> 정가 100,000원에서 30% 할인 시 실제 가격은 100,000 × (1 - 0.3) = 70,000원입니다. 중복 할인은 순차적으로 곱해야 정확합니다.</li>
            <li><strong>부가세 포함/제외:</strong> 부가세 포함 금액에서 공급가액을 구하려면 총액 ÷ 1.1로 계산하세요. 퍼센트 차감 기능으로 쉽게 계산할 수 있습니다.</li>
            <li><strong>성과·성장률 분석:</strong> 전월 대비 매출 증가율 = (이번달 - 저번달) ÷ 저번달 × 100. 증감률 계산 기능으로 사업 성과를 빠르게 분석하세요.</li>
            <li><strong>팁 계산:</strong> 식당에서 봉사료 10~15%를 계산할 때도 퍼센트 추가 기능을 사용하면 총 금액을 즉시 확인할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
