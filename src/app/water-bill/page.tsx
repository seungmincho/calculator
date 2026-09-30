import { Metadata } from 'next'
import WaterBillCalculator from '@/components/WaterBillCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '수도요금 계산기 2026 - 서울·부산 수도세 | 툴허브',
  description: '2026년 서울·부산 가정용 수도요금 계산기. 가구원 수와 월 사용량(㎥)으로 상수도·하수도·물이용부담금을 계산하고, 같은 인원 평균 가구와 비교하며 절약 팁별 절감액까지 확인하세요.',
  keywords: '수도요금 계산기, 수도세 계산, 2026 수도요금, 서울 수도요금, 부산 수도요금, 하수도 요금, 물이용부담금, 4인 가구 수도세',
  openGraph: { title: '수도요금 계산기 2026 | 툴허브', description: '서울·부산 2026 요금 기준 수도세 계산 + 평균 가구 비교', url: 'https://toolhub.ai.kr/water-bill', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/water-bill.png', width: 1200, height: 630, alt: '수도요금 계산기 2026' }] },
  twitter: { card: 'summary_large_image', title: '수도요금 계산기 2026 | 툴허브', description: '우리 집 수도세, 같은 인원 평균과 비교', images: ['https://toolhub.ai.kr/og/water-bill.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/water-bill/' },
}

export default function WaterBillPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '수도요금 계산기', description: '2026년 서울·부산 가정용 수도요금(상수도·하수도·물이용부담금) 계산', url: 'https://toolhub.ai.kr/water-bill', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['서울·부산 2026 요금', '고지서 단가 직접 입력', '같은 인원 평균 가구 비교', '절약 팁별 절감액', '결과 이미지 공유'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '2026년 서울 수도요금은 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '서울 가정용은 누진제 없이 상수도 1㎥당 580원, 하수도 1㎥당 480원(2026년 1월부터), 물이용부담금 1㎥당 170원이며 계량기 15mm 기본요금은 월 1,080원입니다. 4인 가구가 월 24㎥를 쓰면 약 30,600원입니다.' } },
      { '@type': 'Question', name: '수도요금에 부가세가 붙나요?', acceptedAnswer: { '@type': 'Answer', text: '아니요. 수돗물과 하수도 사용료는 부가가치세 면세입니다. 고지서 금액은 기본요금, 상수도 사용요금, 하수도 사용료, 물이용부담금의 합계입니다.' } },
      { '@type': 'Question', name: '4인 가족 평균 수도 사용량은 어느 정도인가요?', acceptedAnswer: { '@type': 'Answer', text: '서울시와 부산시는 요금 안내에서 1인당 월 약 6㎥를 기준으로 삼습니다. 4인 가구라면 월 약 24㎥입니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <WaterBillCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">수도요금 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            월 수도 사용량(㎥)과 가구원 수를 넣으면 2026년 요금표 기준으로 기본요금, 상수도 사용요금, 하수도 사용료, 물이용부담금을 더해 예상 고지 금액을 계산합니다.
            서울은 가정용 상수도·하수도 모두 단일요금이고, 부산은 상수도는 단일요금·하수도는 10㎥ 단위 누진 요금입니다. 다른 지역은 고지서에 적힌 단가를 직접 입력해 계산할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">수도요금 절약 팁</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>샤워 1분 줄이기:</strong> 샤워기는 분당 약 12L를 씁니다. 4인 가구가 매일 1분씩 줄이면 한 달에 약 1.4㎥, 서울 기준 월 1,700원 정도가 줄어듭니다.</li>
            <li><strong>양변기 물 아끼기:</strong> 구형 양변기는 1회 약 12L를 씁니다. 절수형 부속이나 절수형 변기로 바꾸면 효과가 큽니다.</li>
            <li><strong>양치컵 사용:</strong> 물을 틀어 놓고 양치하는 대신 컵을 쓰면 1회 수 리터를 아낄 수 있습니다.</li>
            <li><strong>누수 점검:</strong> 모든 수도꼭지를 잠그고 계량기 바늘이 돌면 누수입니다. 변기·수도꼭지의 미세 누수는 한 달에 수 ㎥를 낭비합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
