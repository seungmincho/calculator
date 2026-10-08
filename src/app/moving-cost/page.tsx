import { Metadata } from 'next'
import MovingCost from '@/components/MovingCost'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import movingCostMessages from '../../../messages/generated/ko/ns/movingCost.json'

export const metadata: Metadata = {
  title: '이사 비용 계산기 - 포장이사/일반이사 견적 | 툴허브',
  description: '이사 비용 계산기 - 평수, 이사 유형, 거리, 층수별 이사 비용을 계산하세요. 포장이사, 일반이사, 반포장이사 견적 비교.',
  keywords: '이사 비용 계산기, 포장이사 비용, 일반이사 비용, 반포장이사, 이사 견적, 사다리차 비용, 이사비 계산',
  openGraph: {
    title: '이사 비용 계산기 | 툴허브',
    description: '평수, 이사 유형, 거리, 층수별 이사 비용을 계산하세요. 포장이사, 일반이사, 반포장이사 견적 비교.',
    url: 'https://toolhub.ai.kr/moving-cost/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/moving-cost.png', width: 1200, height: 630, alt: '이사 비용 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '이사 비용 계산기 | 툴허브',
    description: '포장이사, 일반이사, 반포장이사 견적 비교',
    images: ['https://toolhub.ai.kr/og/moving-cost.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/moving-cost/',
  },
}

export default function MovingCostPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이사 비용 계산기',
    description: '평수, 이사 유형, 거리, 층수별 이사 비용 견적 계산',
    url: 'https://toolhub.ai.kr/moving-cost/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '포장이사/일반이사/반포장이사 비용 비교',
      '평수별 기본 이사비 계산',
      '거리별 추가비용',
      '층수/엘리베이터 추가비용',
      '에어컨, 피아노 등 추가 서비스',
      '성수기/주말 할증 계산',
      '용달·보관이사 포함 최소~최대 범위 추정',
      '손 없는 날 달력(음력 표시)',
      '업체 견적 3곳 비교',
      'D-30부터 전입신고까지 일정 체크리스트',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={movingCostMessages.movingCost.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <MovingCost />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            이사 비용 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            이사 비용 계산기는 평수, 이사 유형(포장이사·반포장이사·일반이사), 이동 거리, 층수, 엘리베이터 유무 등을 입력하면 예상 이사 비용을 자동으로 계산해주는 무료 온라인 견적 도구입니다. 에어컨 이전 설치, 피아노, 사다리차 추가 비용과 성수기·주말 할증까지 반영하여 실제 이사 업체 견적에 가까운 금액을 확인할 수 있습니다. 이사 준비 전 예산 계획에 활용하세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이사 비용 절감 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>비수기 평일 이사:</strong> 이사철(3·9월)과 주말·월말·손 없는 날을 피한 평일은 상대적으로 저렴하며, 이사 업체 선택의 폭도 넓어집니다.</li>
            <li><strong>반포장이사 고려:</strong> 소형 짐은 본인이 포장하고 대형 가구·가전만 업체에 맡기는 반포장이사로 포장이사 대비 비용을 줄일 수 있습니다.</li>
            <li><strong>복수 견적 비교:</strong> 최소 3곳 이상의 이사 업체에서 현장 견적을 받아 비교하고, 파손 보상 기준도 함께 확인하세요.</li>
            <li><strong>불필요한 짐 정리:</strong> 이사 전 중고 거래나 버리기로 짐을 줄이면 차량 규모가 줄어 비용을 절감할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
