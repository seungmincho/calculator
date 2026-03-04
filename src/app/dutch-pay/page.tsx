import { Metadata } from 'next'
import { Suspense } from 'react'
import DutchPay from '@/components/DutchPay'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '더치페이 계산기 - N/1 정산, 회식비 나누기 | 툴허브',
  description: '더치페이(N빵) 계산기로 회식비, 모임비를 정확하게 나눠보세요. 균등 분배와 각자 낸 금액 기반 차액 계산을 지원합니다.',
  keywords: '더치페이, 더치페이 계산기, N빵 계산기, 회식비 나누기, 정산 계산기, 1/N 계산',
  openGraph: {
    title: '더치페이 계산기 | 툴허브',
    description: '회식비/모임비를 정확하게 나누세요! 균등분배 & 커스텀 정산.',
    url: 'https://toolhub.ai.kr/dutch-pay',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '더치페이 계산기 | 툴허브', description: '회식비를 정확하게 나누세요!' },
  alternates: { canonical: 'https://toolhub.ai.kr/dutch-pay/' },
}

export default function DutchPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '더치페이 계산기', description: '회식비, 모임비를 정확하게 나누는 더치페이 계산기',
    url: 'https://toolhub.ai.kr/dutch-pay', applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['균등 분배', '커스텀 정산', '최소 이체 횟수 계산', '결과 복사'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '더치페이 정산을 가장 효율적으로 하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '최소 이체 횟수로 정산하려면 각자 부담액과 실제 지불액의 차이를 계산한 후, 적게 낸 사람이 많이 낸 사람에게 차액을 보내면 됩니다. 예를 들어 A가 10만 원, B가 0원 내고 총 10만 원을 둘이 나누면, B가 A에게 5만 원만 보내면 됩니다. 3인 이상은 알고리즘을 활용해 이체 횟수를 최소화할 수 있습니다.' } },
      { '@type': 'Question', name: '더치페이 시 단위 절사는 어떻게 하나요?', acceptedAnswer: { '@type': 'Answer', text: '총 금액을 인원수로 나누면 소수점이 발생할 수 있습니다. 보통 100원 단위 또는 10원 단위로 반올림하고, 차액은 결제한 사람이 부담합니다. 예를 들어 37,800원을 3명이 나누면 1인당 12,600원이며, 100원 단위 절사 시 12,600원씩, 나머지 0원은 결제자 부담입니다.' } },
      { '@type': 'Question', name: '한국에서 더치페이가 일반적인가요?', acceptedAnswer: { '@type': 'Answer', text: '한국에서는 전통적으로 선배/상급자가 계산하는 문화였으나, 최근 2030세대를 중심으로 더치페이(N빵)가 보편화되고 있습니다. 카카오페이 송금, 토스 정산하기 등 간편 정산 서비스가 활성화되면서 더 편리해졌습니다. 소개팅이나 첫 만남에서는 더치페이에 대한 의견이 나뉘므로 상황에 맞게 결정하세요.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><DutchPay /></I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            더치페이 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            더치페이 계산기는 회식비·여행비·모임비를 여러 명이 공평하게 나누는 N빵 정산 도구입니다. 균등 분배는 물론, 각자 실제로 낸 금액이 다를 때 최소 이체 횟수로 차액을 정산하는 기능도 제공합니다. 카카오페이, 토스 등 간편 결제가 보편화된 시대에 팀 회식, 단체 여행, 친목 모임의 정산을 빠르고 정확하게 처리할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            더치페이 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>최소 이체 정산:</strong> 여러 명이 각각 다른 금액을 냈을 때, 이체 횟수를 최소화하는 최적 정산 방법을 자동으로 계산합니다. 복잡한 계산 없이 결과를 바로 확인하세요.</li>
            <li><strong>단위 절사 처리:</strong> 인원수로 나눌 때 발생하는 소수점 금액을 100원·1,000원 단위로 자동 처리하고, 차액은 결제자가 부담하는 방식으로 계산됩니다.</li>
            <li><strong>결과 공유:</strong> 정산 결과를 복사하여 단톡방에 붙여넣으면 모임 멤버 모두가 자신이 보내야 할 금액을 바로 확인할 수 있습니다.</li>
            <li><strong>직급별 차등 정산:</strong> 선배·상사가 더 내는 문화가 있는 경우, 각자 금액을 직접 입력하여 실제 차액만 계산하는 커스텀 정산 기능을 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
