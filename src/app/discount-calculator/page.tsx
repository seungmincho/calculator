import { Metadata } from 'next'
import DiscountCalculator from '@/components/DiscountCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = "할인 계산기 - 수량·쿠폰·배송비 구매 조건 비교 | 툴허브"
const DESCRIPTION = "할인율·할인가·원가와 중복 할인을 계산하고 최대 4개 구매 조건을 비교하세요. 할인 후 개당 가격·수량·금액 쿠폰·배송비로 총액과 개당 평균을 확인하고 요약 복사·TXT·숫자 조건 링크를 이용할 수 있습니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '할인 계산기, 할인율 계산, 할인가 계산, 세일 계산, discount calculator, 퍼센트 할인',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/discount-calculator/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/discount-calculator.png', width: 1200, height: 630, alt: '할인 계산기' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/discount-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/discount-calculator/' },
}

export default function DiscountCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '할인 계산기', description: DESCRIPTION, url: 'https://toolhub.ai.kr/discount-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ["할인율·할인가·원가 계산","최대 3단계 중복 할인","최대 4개 구매 조건 비교","수량·금액 쿠폰·배송비 반영","총액·개당 평균·공동 최저 표시","현재 할인가를 원 단위로 가져오기","요약 복사·TXT·복사 실패 복구","이름을 제외한 숫자 조건 공유 링크"] }
  const faq = [
  {
    "q": "구매 조건의 총액은 어떻게 계산하나요?",
    "a": "할인 후 개당 가격에 수량을 곱하고 상품 합계에서 금액 쿠폰을 차감한 뒤 배송비를 더합니다. 상품 금액은 최소 0원이며 쿠폰은 배송비에 적용하지 않습니다. 카드 혜택이나 판매처별 조건은 자동 추정하지 않습니다."
  },
  {
    "q": "수량이 다르면 총액과 개당 평균 중 무엇을 보나요?",
    "a": "총 결제금액과 배송비를 포함한 개당 평균을 함께 보여 줍니다. 두 기준의 최저 조건이 다를 수 있으며 같은 상품·단위라는 입력 전제로 계산합니다. 값이 같으면 공동 최저로 표시합니다."
  },
  {
    "q": "기존 할인 결과를 비교에 가져올 수 있나요?",
    "a": "현재 할인 결과로 조건 추가를 누르면 클릭 당시 최종 가격을 기존 표시와 같은 원 단위로 반올림해 가져옵니다. 기존 할인 입력이나 모드를 바꾸지 않으며 이후 가격 변화도 비교 조건에 자동 덮어쓰지 않습니다."
  },
  {
    "q": "공유 링크에 조건 이름도 들어가나요?",
    "a": "명시 공유 링크에는 최대 4개의 숫자 조건만 들어가고 직접 입력한 이름은 제외합니다. 이름은 복사하거나 내려받은 TXT 요약에 포함될 수 있습니다. 비교 조건을 새로 장기 저장하지 않습니다."
  },
  {
    "q": "중복 할인율을 단순히 더하면 되나요?",
    "a": "연속 할인은 순차 적용합니다. 30% 할인 뒤20% 할인은 원가×0.7×0.8이므로 합계44% 할인입니다. 판매처의 실제 적용 순서와 입력한 할인 조건을 맞춰 사용하세요."
  }
]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><DiscountCalculator />  <div className="mt-8">
    <ToolFaq items={faq} />
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            할인 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            할인 계산기는 입력한 가격과 할인율로 할인가·원가를 계산하고 연속 할인을 적용하는 도구입니다. 할인 후 개당 가격에 수량·금액 쿠폰·배송비를 더한 최대 4개 조건의 총액과 개당 평균도 비교할 수 있습니다. 같은 상품과 단위라는 입력 전제에서 계산하며 판매처 가격을 조회하거나 구매를 대신 추천하지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            할인 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>할인율 역산:</strong> 정가와 세일가를 입력하면 실제 할인율이 몇 %인지 자동으로 계산됩니다. 광고의 &apos;50% 할인&apos;이 실제인지 확인할 때 유용합니다.</li>
            <li><strong>중복 할인 주의:</strong> 30% 할인 + 추가 20% 할인은 합계 50%가 아니라 44% 할인입니다. 중복 할인은 순차 적용되므로 반드시 계산기로 확인하세요.</li>
            <li><strong>쿠폰과 배송비:</strong> 금액 쿠폰은 상품 합계까지만 차감합니다. 배송비·카드 혜택·적립 등의 실제 적용 조건을 확인한 뒤 필요한 금액을 입력하세요.</li>
            <li><strong>1+1 vs 50% 할인:</strong> 두 개를 모두 소비할 경우 동일하지만, 하나만 필요하거나 유통기한이 있다면 단순 50% 할인이 더 유리할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
