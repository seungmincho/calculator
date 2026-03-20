import { Metadata } from 'next'
import { Suspense } from 'react'
import AlcoholCalculator from '@/components/AlcoholCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '혈중알코올 계산기 - 음주 후 BAC 농도 추정 | 툴허브',
  description: '혈중알코올 계산기 - 위드마크 공식으로 음주 후 혈중알코올 농도(BAC)를 추정합니다. 소주, 맥주, 와인 등 주류별 계산, 음주운전 기준 확인.',
  keywords: '혈중알코올 계산기, 음주 측정, BAC 계산, 혈중알코올 농도, 음주운전 기준, 위드마크 공식',
  openGraph: { title: '혈중알코올 계산기 | 툴허브', description: '음주 후 혈중알코올 농도 추정', url: 'https://toolhub.ai.kr/alcohol-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '혈중알코올 계산기 | 툴허브', description: '음주 후 BAC 농도 추정' },
  alternates: { canonical: 'https://toolhub.ai.kr/alcohol-calculator/' },
}

export default function AlcoholCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '혈중알코올 계산기', description: '위드마크 공식으로 혈중알코올 농도(BAC) 추정', url: 'https://toolhub.ai.kr/alcohol-calculator', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['BAC 계산', '주류별 입력', '음주운전 기준', '분해 시간 추정'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '위드마크 공식이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '위드마크(Widmark) 공식은 음주 후 혈중알코올농도(BAC)를 추정하는 공식입니다. BAC = (섭취한 알코올량(g) ÷ (체중(kg) × 성별계수)) - (시간 × 0.015)입니다. 성별계수는 남성 0.68, 여성 0.55입니다. 이 공식은 추정치이며, 실제 BAC는 체질, 공복 여부, 간 기능 등에 따라 달라질 수 있습니다.' } },
      { '@type': 'Question', name: '음주운전 기준 혈중알코올농도는?', acceptedAnswer: { '@type': 'Answer', text: '한국 음주운전 처벌 기준: ① 0.03% 이상 ~ 0.08% 미만: 면허 정지 + 벌금 ② 0.08% 이상 ~ 0.2% 미만: 면허 취소 + 1년 이상 2년 이하 징역 또는 500만~1,000만 원 벌금 ③ 0.2% 이상: 면허 취소 + 2년 이상 5년 이하 징역 또는 1,000만~2,000만 원 벌금. 2회 이상 적발 시 가중 처벌됩니다.' } },
      { '@type': 'Question', name: '알코올 분해에 걸리는 시간은?', acceptedAnswer: { '@type': 'Answer', text: '체내 알코올 분해 속도는 시간당 약 0.015%(혈중알코올농도 기준)입니다. 소주 1병(360ml, 16.5도)을 마시면 약 7~10시간, 맥주 500ml 캔 2개는 약 3~4시간이 소요됩니다. 체중 70kg 남성 기준이며, 여성은 분해 속도가 더 느립니다. 숙취 해소에 도움이 되는 것은 충분한 수분 섭취와 휴식이며, 커피나 사우나는 효과가 없습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><AlcoholCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            혈중알코올 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            혈중알코올 계산기는 위드마크(Widmark) 공식을 이용해 음주 후 혈중알코올농도(BAC)를 추정하는 무료 온라인 도구입니다. 소주, 맥주, 와인, 막걸리 등 주류 종류와 음주량, 체중, 성별, 경과 시간을 입력하면 현재 예상 BAC와 음주운전 기준(0.03%, 0.08%) 초과 여부를 안내합니다. 음주운전 예방과 안전한 귀가 계획을 세우는 데 참고할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            혈중알코올 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>공복 여부 고려:</strong> 공복 음주는 식사 후보다 BAC가 더 빠르게 오르므로 음식 섭취 후 음주가 실제 수치를 낮추는 데 도움이 됩니다.</li>
            <li><strong>개인차 존재:</strong> 계산 결과는 추정치입니다. 체질, 간 기능, 피로 상태에 따라 실제 BAC는 달라질 수 있습니다.</li>
            <li><strong>알코올 분해 속도:</strong> 체내 알코올은 시간당 약 0.015% 분해되므로, 운전 전 충분한 시간이 필요합니다.</li>
            <li><strong>숙취 해소 오해:</strong> 커피, 사우나, 찬물은 BAC를 낮추지 않습니다. 시간이 지나는 것만이 유일한 방법입니다.</li>
            <li><strong>음주운전 기준:</strong> 한국 기준 0.03% 이상이면 면허 정지 처분을 받으므로, 조금이라도 마셨다면 운전을 삼가세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
