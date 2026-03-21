import { Metadata } from 'next'
import { Suspense } from 'react'
import CarMaintenance from '@/components/CarMaintenance'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '자동차 유지비 계산기 - 연간 차량 유지 비용 | 툴허브',
  description: '자동차 유지비 계산기 - 보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하세요.',
  keywords: '자동차 유지비, 차량 유지비 계산기, 자동차세, 자동차보험, 유류비, 정비비, 감가상각, 주차비, 연간 차량비용',
  openGraph: {
    title: '자동차 유지비 계산기 - 연간 차량 유지 비용 | 툴허브',
    description: '보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하세요.',
    url: 'https://toolhub.ai.kr/car-maintenance',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '자동차 유지비 계산기 | 툴허브',
    description: '보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/car-maintenance/',
  },
}

export default function CarMaintenancePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '자동차 유지비 계산기',
    description: '보험, 세금, 주유비, 정비비, 감가상각까지 연간 차량 유지 비용을 한번에 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/car-maintenance',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '자동차세 자동 계산 (배기량/차령 기반)',
      '자동차보험료 추정',
      '유류비 계산 (가솔린/디젤/LPG/하이브리드/전기)',
      '정비비 스케줄 관리',
      '감가상각비 추정',
      '대중교통 비용 비교',
      'km당 비용 분석',
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '자동차 정기 점검 주기는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주요 정기 점검 항목: ① 엔진오일: 5,000~10,000km 또는 6개월마다 (합성유 기준 10,000km) ② 에어필터: 15,000~20,000km마다 ③ 브레이크 패드: 30,000~40,000km마다 (주행 습관에 따라 차이) ④ 타이어 교체: 40,000~50,000km 또는 트레드 깊이 1.6mm 이하 시 ⑤ 냉각수: 2년 또는 40,000km마다 ⑥ 미션오일: 60,000~80,000km마다. 차량 매뉴얼의 점검 주기표를 따르는 것이 가장 정확합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <CarMaintenance />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              자동차 유지비 계산기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              자동차 유지비 계산기는 <strong>보험료·자동차세·주유비·정비비·주차비·감가상각까지 연간 차량 유지 비용을 한 번에 계산</strong>하는 도구입니다. 차종별·연료별 실제 유지비를 파악하고 대중교통 이용과 비교해 보면 자동차 구매 결정에 큰 도움이 됩니다. 신차 구매를 앞둔 분, 차량 유지비 절감을 원하는 분, 하이브리드·전기차 전환을 고민하는 분에게 적합합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              자동차 유지비 절감 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>연료 선택:</strong> 하이브리드·전기차는 유류비가 가솔린 대비 40~60% 절감되어 장기 유지비가 유리합니다.</li>
              <li><strong>자동차보험 갱신:</strong> 연간 비교 사이트를 통해 최대 10~20만 원 보험료를 절감할 수 있습니다.</li>
              <li><strong>정기 점검 준수:</strong> 적시 정비는 큰 수리를 예방하여 장기적으로 비용을 줄여줍니다.</li>
              <li><strong>타이어 공기압 관리:</strong> 적정 공기압 유지만으로 연비를 3~5% 향상시킬 수 있습니다.</li>
              <li><strong>감가상각 고려:</strong> 차량 가격이 높을수록 감가상각 비용도 크므로 총 소유 비용(TCO)으로 비교하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
