import { Metadata } from 'next'
import { Suspense } from 'react'
import ParkingFee from '@/components/ParkingFee'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '주차 요금 계산기 - 주차장 요금, 시간별 주차비 | 툴허브',
  description: '주차 요금 계산기 - 주차 시간과 요금 체계를 입력하면 총 주차 요금을 계산합니다. 무료 시간, 일 최대 요금 적용.',
  keywords: '주차 요금 계산기, 주차비 계산, 주차장 요금, parking fee calculator, 주차 시간 계산',
  openGraph: { title: '주차 요금 계산기 | 툴허브', description: '주차 시간별 요금 계산', url: 'https://toolhub.ai.kr/parking-fee', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '주차 요금 계산기 | 툴허브', description: '주차 시간별 요금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/parking-fee/' },
}

export default function ParkingFeePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '주차 요금 계산기', description: '주차 시간별 요금 계산', url: 'https://toolhub.ai.kr/parking-fee', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주차 요금 계산', '무료 시간 적용', '일 최대 요금', '시간별 요금표'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '주차 요금은 어떻게 계산되나요?', acceptedAnswer: { '@type': 'Answer', text: '주차 요금은 기본요금(최초 30분~1시간) + 추가요금(10~30분 단위)으로 계산됩니다. 예를 들어 기본 30분 2,000원, 추가 10분당 1,000원인 주차장에서 2시간 주차하면 2,000원 + (90분 ÷ 10분 × 1,000원) = 11,000원입니다. 일 최대 요금이 설정된 곳은 장시간 주차 시 할인 효과가 있습니다.' } },
      { '@type': 'Question', name: '대형마트/백화점 무료 주차 시간은?', acceptedAnswer: { '@type': 'Answer', text: '대형마트는 보통 구매 금액에 따라 1~3시간 무료 주차를 제공합니다. 이마트/홈플러스는 1만 원 이상 구매 시 1시간, 3만 원 이상 시 2시간 무료가 일반적입니다. 백화점은 3만 원 이상 2시간, 10만 원 이상 3시간 등 금액별 차등 적용됩니다. 영화관 이용 시 추가 1~2시간 무료인 경우도 있으니 확인하세요.' } },
      { '@type': 'Question', name: '공영주차장과 민영주차장 요금 차이는?', acceptedAnswer: { '@type': 'Answer', text: '공영주차장은 지자체가 운영하여 민영보다 30~50% 저렴합니다. 서울 공영주차장은 기본 5분 300원(10분 600원), 일 최대 15,000~25,000원 수준이며, 민영 주차장은 기본 10분 1,000~2,000원, 일 최대 30,000~50,000원인 곳이 많습니다. 서울시 주차정보 앱에서 근처 공영주차장 위치와 실시간 잔여석을 확인할 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ParkingFee />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            주차 요금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            주차 요금 계산기는 주차 시간과 요금 체계(기본요금·추가요금 단위·일 최대 요금·무료 시간)를 입력하면 총 주차 요금을 자동으로 계산해주는 무료 온라인 도구입니다. 복잡한 시간·분 단위 계산을 자동으로 처리하므로, 쇼핑몰, 병원, 관공서, 공영주차장 이용 전 예상 요금을 미리 확인하는 데 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            주차 요금 절감 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>공영주차장 이용:</strong> 지자체 운영 공영주차장은 민영 대비 30~50% 저렴합니다. 서울시 주차정보 앱에서 근처 공영주차장 잔여석을 확인할 수 있습니다.</li>
            <li><strong>무료 주차 시간 활용:</strong> 대형마트·백화점은 구매 금액에 따라 1~3시간 무료 주차를 제공합니다. 구매 영수증을 꼭 챙기세요.</li>
            <li><strong>일 최대 요금 확인:</strong> 장시간 주차 시 일 최대 요금이 설정된 주차장을 이용하면 추가 비용 없이 하루 종일 주차할 수 있어 유리합니다.</li>
            <li><strong>진·출입 시간 기록:</strong> 입차 시간을 계산기에 정확히 입력하면 언제까지 무료인지, 추가 요금이 언제 발생하는지 쉽게 파악할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
