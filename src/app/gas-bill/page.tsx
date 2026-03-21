import { Metadata } from 'next'
import { Suspense } from 'react'
import GasBill from '@/components/GasBill'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '가스 요금 계산기 - 도시가스 사용량별 요금 계산 | 툴허브',
  description: '가스 요금 계산기 - 도시가스 사용량(MJ)을 입력하면 지역별, 계절별 가스 요금을 계산합니다. 기본요금, 사용요금, 부가세 포함.',
  keywords: '가스 요금 계산기, 도시가스 요금, 가스비 계산, 가스 사용량, gas bill calculator',
  openGraph: { title: '가스 요금 계산기 | 툴허브', description: '도시가스 사용량별 요금 계산', url: 'https://toolhub.ai.kr/gas-bill', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '가스 요금 계산기 | 툴허브', description: '도시가스 사용량별 요금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/gas-bill/' },
}

export default function GasBillPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '가스 요금 계산기', description: '도시가스 사용량별 요금 계산', url: 'https://toolhub.ai.kr/gas-bill', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['도시가스 요금', '지역별 단가', '계절별 요금', '부가세 포함'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '도시가스 요금 체계는 어떻게 되나요?', acceptedAnswer: { '@type': 'Answer', text: '도시가스 요금은 기본요금 + 사용요금(MJ 단위) + 부가가치세(10%)로 구성됩니다. 사용요금은 계절(하절기/동절기)과 지역(서울, 경기, 인천 등)에 따라 단가가 다릅니다. 난방용은 보통 MJ당 15~20원 수준이며, 동절기(11~3월)에는 사용량이 급증하여 요금이 크게 올라갑니다.' } },
      { '@type': 'Question', name: '겨울철 가스비를 절약하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '가스비 절약 팁: ① 보일러 온도 설정 18~20도 유지 ② 외출 시 외출 모드 사용(완전 끄지 말 것) ③ 내복 착용으로 체감 온도 상승 ④ 창문 틈새 단열 시공 ⑤ 보일러 배관 청소(연 1회) ⑥ 난방텐트/전기장판 병행 사용. 보일러 온도를 1도 낮추면 약 5~7%의 가스비를 절약할 수 있습니다.' } },
      { '@type': 'Question', name: '도시가스 사용량 MJ는 어떻게 확인하나요?', acceptedAnswer: { '@type': 'Answer', text: 'MJ(메가줄)은 도시가스 열량 단위입니다. 가스 계량기에는 m³(입방미터) 단위로 표시되며, 이를 MJ로 환산합니다. 환산식은 사용량(m³) × 총발열량(MJ/m³)이며, 일반 도시가스(LNG) 총발열량은 약 43.0 MJ/m³입니다. 고지서나 도시가스 앱에서 MJ 사용량을 직접 확인할 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><GasBill />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            가스 요금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            가스 요금 계산기는 도시가스 사용량(MJ)을 입력하면 지역별·계절별 단가를 적용하여 기본요금·사용요금·부가가치세를 합산한 월 가스비를 계산합니다. 서울·경기·인천 등 지역마다 도시가스 단가가 다르고, 동절기(11~3월)에는 난방 수요 증가로 요금이 올라가므로, 계절별 요금 변동을 미리 파악하여 가스비를 효율적으로 관리할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            가스비 절약 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>보일러 온도 설정:</strong> 난방 온도를 1도 낮추면 가스비를 5~7% 절약할 수 있습니다. 18~20도를 권장 설정 온도로 유지하세요.</li>
            <li><strong>외출 모드 활용:</strong> 외출 시 보일러를 완전히 끄지 말고 외출 모드로 설정하면 동파 방지와 재가열 비용 절감을 동시에 달성합니다.</li>
            <li><strong>단열 보강:</strong> 창문 틈새 단열 테이프, 문풍지 시공으로 열 손실을 줄이면 같은 온도에서 가스 소비량을 20% 이상 줄일 수 있습니다.</li>
            <li><strong>보일러 정기 점검:</strong> 연 1회 배관 청소와 점검으로 보일러 효율을 최적 상태로 유지하면 장기적으로 가스비 절감 효과가 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
