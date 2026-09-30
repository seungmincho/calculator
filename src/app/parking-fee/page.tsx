import { Metadata } from 'next'
import ParkingFee from '@/components/ParkingFee'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '주차 요금 계산기 - 주차장 요금, 시간별 주차비 | 툴허브',
  description: '주차 요금 계산기 - 입·출차 시각이나 주차 시간만 넣으면 기본요금·추가요금·일 최대·회차·마트 영수증 무료·경차 할인까지 반영해 주차비를 계산하고, 주차장 3곳을 비교합니다.',
  keywords: '주차 요금 계산기, 주차비 계산, 주차장 요금, parking fee calculator, 주차 시간 계산',
  openGraph: { title: '주차 요금 계산기 | 툴허브', description: '주차 시간별 요금 계산', url: 'https://toolhub.ai.kr/parking-fee', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/parking-fee.png', width: 1200, height: 630, alt: '주차 요금 계산기' }] },
  twitter: { card: 'summary_large_image', title: '주차 요금 계산기 | 툴허브', description: '주차 시간별 요금 계산', images: ['https://toolhub.ai.kr/og/parking-fee.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/parking-fee/' },
}

export default function ParkingFeePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '주차 요금 계산기', description: '주차 시간별 요금 계산', url: 'https://toolhub.ai.kr/parking-fee', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주차 요금 계산', '입·출차 시각(자정·여러 날 포함)', '일 최대 요금·회차 시간', '구매 금액별 무료 주차', '경차·장애인 할인', '야간·주말 요율', '주차장 3곳 비교', '다음 요금 인상 시점 안내'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '주차 요금은 어떻게 계산되나요?', acceptedAnswer: { '@type': 'Answer', text: '주차 요금은 기본요금(최초 30분 등) + 추가요금(5~10분 단위)으로 계산하며, 추가 단위는 1분만 넘어도 한 단위가 붙습니다. 예를 들어 기본 30분 2,000원, 추가 10분당 1,000원인 주차장에서 2시간 주차하면 2,000원 + (90분 ÷ 10분 × 1,000원) = 11,000원입니다. 일 최대 요금이 있으면 하루 요금이 그 금액을 넘지 않습니다.' } },
      { '@type': 'Question', name: '대형마트/백화점 무료 주차 시간은?', acceptedAnswer: { '@type': 'Answer', text: '대형마트·백화점은 구매 금액에 따라 1~3시간 정도 무료 주차를 주는 곳이 많지만, 기준 금액과 시간은 매장마다 다르고 수시로 바뀝니다. 방문할 매장의 주차 안내를 확인한 뒤 계산기의 구매 금액별 무료 시간에 입력하면 초과 요금을 미리 알 수 있습니다.' } },
      { '@type': 'Question', name: '공영주차장과 민영주차장 요금 차이는?', acceptedAnswer: { '@type': 'Answer', text: '서울시 공영주차장은 급지별로 5분당 1급지 500원, 2급지 250원, 3급지 150원이 기준이며(서울시 공영주차장 현황, 2026.7.30), 개별 주차장은 여기에 공시지가 변수를 곱해 요금이 정해집니다. 경차·저공해차는 50%, 장애인은 80% 할인됩니다. 민영 주차장은 운영자가 요금을 정하므로 현장 요금표를 확인해 계산기에 입력해 비교해 보세요.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><ParkingFee />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            주차 요금 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            주차 요금 계산기는 주차 시간과 요금 체계(기본요금·추가요금 단위·일 최대 요금·무료 시간)를 입력하면 총 주차 요금을 자동으로 계산해주는 무료 온라인 도구입니다. 복잡한 시간·분 단위 계산을 자동으로 처리하므로, 쇼핑몰, 병원, 관공서, 공영주차장 이용 전 예상 요금을 미리 확인하는 데 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            주차 요금 절감 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>공영주차장 이용:</strong> 서울 공영주차장은 급지별 5분 500·250·150원이 기준이고 경차·저공해차 50%, 장애인 80% 할인이 있습니다. 서울시 주차정보 앱에서 근처 공영주차장 잔여석을 확인할 수 있습니다.</li>
            <li><strong>무료 주차 시간 활용:</strong> 대형마트·백화점은 구매 금액에 따라 1~3시간 무료 주차를 제공합니다. 구매 영수증을 꼭 챙기세요.</li>
            <li><strong>일 최대 요금 확인:</strong> 장시간 주차 시 일 최대 요금이 설정된 주차장을 이용하면 추가 비용 없이 하루 종일 주차할 수 있어 유리합니다.</li>
            <li><strong>진·출입 시간 기록:</strong> 입차 시간을 계산기에 정확히 입력하면 언제까지 무료인지, 추가 요금이 언제 발생하는지 쉽게 파악할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
