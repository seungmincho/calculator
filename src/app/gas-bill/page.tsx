import { Metadata } from 'next'
import GasBill from '@/components/GasBill'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import gasBillMessages from '../../../messages/generated/ko/ns/gasBill.json'

export const metadata: Metadata = {
  title: '가스 요금 계산기 - 2026 도시가스 난방비 | 툴허브',
  description: '2026년 도시가스 주택용 요금(서울 22.5268원/MJ, 기본요금 1,250원)으로 이번 달 가스비를 계산합니다. 고지서 사용량(MJ·㎥) 또는 평수·보일러 시간으로 추정하고, 월별 난방비와 온도 1도 절약액까지 확인하세요.',
  keywords: '가스 요금 계산기, 도시가스 요금, 난방비 계산, 가스비 계산, 도시가스 MJ 단가, 보일러 가스비, 30평 난방비',
  openGraph: { title: '가스 요금 계산기 | 툴허브', description: '우리 집 이번 달 가스비·겨울 난방비 계산', url: 'https://toolhub.ai.kr/gas-bill', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/gas-bill.png', width: 1200, height: 630, alt: '가스 요금 계산기' }] },
  twitter: { card: 'summary_large_image', title: '가스 요금 계산기 | 툴허브', description: '우리 집 이번 달 가스비·겨울 난방비 계산', images: ['https://toolhub.ai.kr/og/gas-bill.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/gas-bill/' },
}

export default function GasBillPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '가스 요금 계산기', description: '도시가스 주택용 요금·난방비 계산', url: 'https://toolhub.ai.kr/gas-bill/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['2026 도시가스 주택용 단가', '고지서 사용량(MJ·㎥) 계산', '평수·보일러 시간으로 추정', '월별 난방비', '온도 1도 절약액', '지난달·작년 비교'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={gasBillMessages.gasBill.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <GasBill />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">가스 요금 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            가스 요금 계산기는 도시가스 주택용 요금표(기본요금 + MJ당 단가 + 부가세 10%)로 이번 달 가스비를 계산합니다. 고지서의 사용량(MJ 또는 ㎥)을 넣거나, 평수·단열·보일러 가동 시간·설정 온도로 사용량을 추정할 수 있습니다. 주택용 단가는 계절과 관계없이 같으므로 겨울 가스비가 높은 이유는 난방 사용량 때문이며, 월별 그래프로 겨울과 여름 요금 차이를 한눈에 볼 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">2026년 주택용 도시가스 요금 (부가세 별도)</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li><strong>서울:</strong> 22.5268원/MJ, 기본요금 월 1,250원 (2026-09-01 적용, 서울시 물가정보)</li>
            <li><strong>경기:</strong> 22.6226원/MJ, 기본요금 월 1,250원 (코원에너지서비스 요금안내)</li>
            <li><strong>대구:</strong> 23.3459원/MJ, 기본요금 월 900원 (2026-08-01 적용)</li>
            <li><strong>도매요금(전국 동일):</strong> 20.8495원/MJ (한국가스공사, 2026-10-01 기준)</li>
          </ul>
          <h3 className="text-lg font-semibold text-fg mb-3">가스비 절약 팁</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>보일러 온도 1도 낮추기:</strong> 난방 에너지가 약 7% 줄어듭니다. 계산기에서 우리 집 기준 월 절약액을 확인하세요.</li>
            <li><strong>외출모드 vs 끄기:</strong> 몇 시간 외출이면 끄지 말고 온도를 2~3도만 낮추는 편이 재가열 부담이 적습니다. 오래 비울 때는 동파에 주의하세요.</li>
            <li><strong>단열 보강:</strong> 창문 틈새 단열 테이프와 문풍지로 열 손실을 줄입니다.</li>
            <li><strong>온수 줄이기:</strong> 온수·취사는 여름에도 쓰는 기본 사용량이라 샤워 시간을 줄이면 1년 내내 효과가 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
