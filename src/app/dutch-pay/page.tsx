import { Metadata } from 'next'
import DutchPay from '@/components/DutchPay'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '더치페이 계산기 - N/1 정산, 회식비 나누기 | 툴허브',
  description: '더치페이(N빵) 계산기로 회식비·여행비를 나누고 단톡방 공지까지 한 번에. 100원·1,000원 단위 올림, 술 안 마신 사람 제외, 선배 1.5배, 여러 명이 결제한 여행 경비 최소 송금 정산을 지원합니다.',
  keywords: '더치페이, 더치페이 계산기, N빵 계산기, 회식비 나누기, 정산 계산기, 1/N 계산, 여행 경비 정산, 총무 정산, 모임 정산',
  openGraph: {
    title: '더치페이 계산기 | 툴허브',
    description: '회식비·여행비 N빵부터 여러 명 결제 정산, 단톡방 공지까지.',
    url: 'https://toolhub.ai.kr/dutch-pay',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dutch-pay.png', width: 1200, height: 630, alt: '더치페이 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '더치페이 계산기 | 툴허브', description: '회식비를 정확하게 나누세요!', images: ['https://toolhub.ai.kr/og/dutch-pay.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/dutch-pay/' },
}

export default function DutchPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '더치페이 계산기', description: '회식비, 모임비를 정확하게 나누는 더치페이 계산기',
    url: 'https://toolhub.ai.kr/dutch-pay', applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['N빵 균등 분배', '100원·1,000원 단위 올림/내림', '항목별 참가자 제외', '부담 비율(가중치)', '여러 명 결제 최소 송금 정산', '단톡방 공지 복사', '읽기 전용 정산 링크 공유'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '더치페이 정산을 가장 효율적으로 하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '최소 이체 횟수로 정산하려면 각자 부담액과 실제 지불액의 차이를 계산한 후, 적게 낸 사람이 많이 낸 사람에게 차액을 보내면 됩니다. 예를 들어 A가 10만 원, B가 0원 내고 총 10만 원을 둘이 나누면, B가 A에게 5만 원만 보내면 됩니다. 3인 이상은 알고리즘을 활용해 이체 횟수를 최소화할 수 있습니다.' } },
      { '@type': 'Question', name: '더치페이 시 단위 절사는 어떻게 하나요?', acceptedAnswer: { '@type': 'Answer', text: '총 금액을 인원수로 나누면 소수점이 발생할 수 있습니다. 보통 100원 또는 1,000원 단위로 올림·내림하고, 차액은 결제한 총무가 부담합니다. 예를 들어 100,000원을 3명이 나누면 1인당 33,333.3원인데, 100원 단위 올림 시 두 명이 33,400원씩 보내고 총무는 33,200원을 부담해 합계가 정확히 100,000원이 됩니다.' } },
      { '@type': 'Question', name: '한국에서 더치페이가 일반적인가요?', acceptedAnswer: { '@type': 'Answer', text: '한국에서는 전통적으로 선배/상급자가 계산하는 문화였으나, 최근 2030세대를 중심으로 더치페이(N빵)가 보편화되고 있습니다. 카카오페이 송금, 토스 정산하기 등 간편 정산 서비스가 활성화되면서 더 편리해졌습니다. 소개팅이나 첫 만남에서는 더치페이에 대한 의견이 나뉘므로 상황에 맞게 결정하세요.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper><DutchPay />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            더치페이 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            더치페이 계산기는 회식비·여행비·모임비를 여러 명이 공평하게 나누는 N빵 정산 도구입니다. 총무 한 명이 결제한 N빵은 물론, 여행처럼 여러 명이 번갈아 결제했을 때 최소 송금 횟수로 정산하는 기능도 제공합니다. 카카오페이, 토스 등 간편 결제가 보편화된 시대에 팀 회식, 단체 여행, 친목 모임의 정산을 빠르고 정확하게 처리할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            더치페이 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>최소 이체 정산:</strong> 여러 명이 각각 다른 금액을 냈을 때, 순잔액을 먼저 계산해 이체 횟수를 줄인 정산 방법(최대 인원−1건)을 자동으로 계산합니다. 복잡한 계산 없이 결과를 바로 확인하세요.</li>
            <li><strong>단위 절사 처리:</strong> 인원수로 나눌 때 발생하는 소수점 금액을 100원·1,000원 단위로 자동 처리하고, 차액은 결제자가 부담하는 방식으로 계산됩니다.</li>
            <li><strong>단톡방 공지:</strong> 항목별 내역·송금 목록·계좌번호가 담긴 공지를 복사해 붙여 넣고, 정산 링크를 보내면 멤버가 같은 결과를 보기 전용으로 열어 볼 수 있습니다.</li>
            <li><strong>직급별 차등 정산:</strong> 선배·상사가 더 내는 문화가 있다면 부담 비율을 1.5배·2배로 바꾸세요. 술을 안 마신 사람은 술 항목에서만 뺄 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
