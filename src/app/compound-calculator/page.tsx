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
  alternates: { canonical: 'https://toolhub.ai.kr/compound-calculator/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><CompoundCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            복리 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            복리 계산기는 원금에 이자가 붙고, 그 이자에 다시 이자가 붙는 복리 효과를 시뮬레이션하는 투자 분석 도구입니다. 적립식 펀드, 예금, 주식 투자 등 장기 재테크를 계획 중인 분들에게 복리의 힘을 직관적으로 이해할 수 있도록 도와줍니다. 단리와 복리를 비교하거나, 월 적립액과 기대 수익률을 조정하며 은퇴 자금이나 목돈 마련 계획을 세워보세요.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            복리 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>72법칙 활용:</strong> 72를 연이율로 나누면 원금이 2배 되는 기간을 빠르게 추정할 수 있습니다. 연 6%면 약 12년, 연 9%면 약 8년입니다.</li>
            <li><strong>월 적립식 투자:</strong> 목돈이 없어도 매월 일정액을 적립하면 복리 효과가 누적되어 장기적으로 큰 차이를 만듭니다. 적립 금액과 기간을 바꿔가며 목표 금액을 역산해보세요.</li>
            <li><strong>단리 vs 복리 비교:</strong> 단기(1~3년)에는 차이가 미미하지만 10년 이상 장기 투자에서는 복리가 압도적으로 유리합니다. 그래프로 그 차이를 확인하세요.</li>
            <li><strong>인플레이션 고려:</strong> 명목 수익률에서 물가상승률(연 2~3%)을 빼면 실질 수익률이 됩니다. 실질 수익률을 기준으로 장기 계획을 세우는 것이 정확합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
