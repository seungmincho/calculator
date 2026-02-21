import { Metadata } from 'next'
import { Suspense } from 'react'
import CompoundCalculator from '@/components/CompoundCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '복리 계산기 - 복리 이자, 투자 수익률 계산 | 툴허브',
  description: '복리 계산기 - 원금, 이율, 기간을 입력하여 복리 이자와 투자 수익을 계산하세요. 월 적립식 투자, 단리 vs 복리 비교, 연도별 성장 그래프를 제공합니다.',
  keywords: '복리 계산기, 복리 이자 계산, 투자 수익률, 적립식 투자, compound interest calculator, 72법칙',
  openGraph: { title: '복리 계산기 | 툴허브', description: '복리 이자 계산, 투자 수익률 시뮬레이션', url: 'https://toolhub.ai.kr/compound-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '복리 계산기 | 툴허브', description: '복리 이자 계산, 투자 수익률 시뮬레이션' },
  alternates: { canonical: 'https://toolhub.ai.kr/compound-calculator' },
}

export default function CompoundCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '복리 계산기', description: '복리 이자 계산, 투자 수익률 시뮬레이션, 단리 vs 복리 비교', url: 'https://toolhub.ai.kr/compound-calculator', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['복리 이자 계산', '월 적립식 투자', '단리 vs 복리 비교', '연도별 성장 그래프'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '단리와 복리의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단리는 원금에만 이자가 붙고, 복리는 원금+이자에 이자가 붙습니다. 예를 들어 1,000만 원을 연 5%로 10년간 투자하면, 단리는 1,500만 원(이자 500만 원), 복리는 약 1,629만 원(이자 629만 원)이 됩니다. 기간이 길수록 복리 효과는 기하급수적으로 커집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '72법칙이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '72법칙은 투자 원금이 2배가 되는 데 걸리는 대략적인 시간을 계산하는 공식입니다. 72 ÷ 연이율(%) = 원금 2배 소요 연수입니다. 예를 들어 연 6% 수익률이면 72 ÷ 6 = 12년이면 원금이 2배가 됩니다. 연 3%면 24년, 연 12%면 6년이 소요됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '매월 적립식 투자가 왜 유리한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '매월 적립식 투자는 시간 분산 효과(Dollar Cost Averaging)로 시장 변동 위험을 줄여줍니다. 또한 복리 효과가 매월 새로 투입되는 금액에도 적용되어 장기적으로 큰 차이를 만듭니다. 예를 들어 매월 50만 원을 연 7% 수익률로 20년간 투자하면, 투입 원금 1.2억 원이 약 2.6억 원으로 성장합니다.',
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
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><CompoundCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
