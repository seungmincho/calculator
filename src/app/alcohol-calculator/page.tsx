import { Metadata } from 'next'
import AlcoholCalculator from '@/components/AlcoholCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '혈중알코올 계산기 - 음주 후 BAC 농도 추정 | 툴허브',
  description: '혈중알코올 계산기 - 위드마크 공식으로 음주 후 혈중알코올 농도(BAC)를 추정합니다. 소주, 맥주, 와인 등 주류별 계산, 음주운전 기준 확인.',
  keywords: '혈중알코올 계산기, 음주 측정, BAC 계산, 혈중알코올 농도, 음주운전 기준, 위드마크 공식',
  openGraph: { title: '혈중알코올 계산기 | 툴허브', description: '음주 후 혈중알코올 농도 추정', url: 'https://toolhub.ai.kr/alcohol-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/alcohol-calculator.png', width: 1200, height: 630, alt: '혈중알코올 계산기' }] },
  twitter: { card: 'summary_large_image', title: '혈중알코올 계산기 | 툴허브', description: '음주 후 BAC 농도 추정', images: ['https://toolhub.ai.kr/og/alcohol-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/alcohol-calculator/' },
}

export default function AlcoholCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '혈중알코올 계산기', description: '위드마크 공식으로 혈중알코올 농도(BAC) 추정', url: 'https://toolhub.ai.kr/alcohol-calculator', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['BAC 계산', '주류별 입력', '음주운전 기준', '분해 시간 추정'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '위드마크 공식이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '위드마크(Widmark) 공식은 음주 후 혈중알코올농도(BAC)를 추정하는 공식입니다. BAC(%) = 알코올(g) ÷ (체중(kg) × r × 10) − β × 경과시간입니다. r은 남성 0.68~0.70, 여성 0.55~0.60, β(분해 속도)는 평균 시간당 0.015%(개인차 0.010~0.020%)입니다. 이 공식은 추정치이며, 실제 BAC는 체질, 공복 여부, 간 기능 등에 따라 달라질 수 있습니다.' } },
      { '@type': 'Question', name: '음주운전 기준 혈중알코올농도는?', acceptedAnswer: { '@type': 'Answer', text: '한국 음주운전 처벌 기준: ① 0.03% 이상 ~ 0.08% 미만: 면허 정지 + 벌금 ② 0.08% 이상 ~ 0.2% 미만: 면허 취소 + 1년 이상 2년 이하 징역 또는 500만~1,000만 원 벌금 ③ 0.2% 이상: 면허 취소 + 2년 이상 5년 이하 징역 또는 1,000만~2,000만 원 벌금. 2회 이상 적발 시 가중 처벌됩니다.' } },
      { '@type': 'Question', name: '알코올 분해에 걸리는 시간은?', acceptedAnswer: { '@type': 'Answer', text: '체내 알코올 분해 속도는 평균 시간당 약 0.015%(개인차 0.010~0.020%)입니다. 체중 70kg 남성이 소주 1병(360ml, 15.7도)을 마시면 추정 BAC 약 0.094%로, 0%가 되기까지 평균 약 6시간, 분해가 느리면 9시간 이상 걸립니다. 여성은 같은 양에도 BAC가 더 높아 더 오래 걸립니다. 숙취 해소에 도움이 되는 것은 충분한 수분 섭취와 휴식이며, 커피나 사우나는 효과가 없습니다. 술을 마셨다면 운전하지 마세요.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><AlcoholCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            혈중알코올 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            혈중알코올 계산기는 위드마크(Widmark) 공식을 이용해 음주 후 혈중알코올농도(BAC)를 추정하는 무료 온라인 도구입니다. 소주, 맥주, 와인, 막걸리 등 주류 종류와 음주량, 마신 시각, 체중, 성별을 입력하면 현재 추정 BAC와 개인차 범위, 0%가 되는 예상 시각, 시간대별 그래프를 보여주고 음주운전 기준(0.03% 면허정지, 0.08% 면허취소)과 비교합니다. 결과는 추정치일 뿐이며, 운전해도 안전한 혈중알코올농도는 0%뿐입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            혈중알코올 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>공복 여부 고려:</strong> 공복 음주는 식사 후보다 BAC가 더 빠르게 오르므로 음식 섭취 후 음주가 실제 수치를 낮추는 데 도움이 됩니다.</li>
            <li><strong>개인차 존재:</strong> 계산 결과는 추정치입니다. 체질, 간 기능, 피로 상태에 따라 실제 BAC는 달라질 수 있습니다.</li>
            <li><strong>알코올 분해 속도:</strong> 체내 알코올은 평균 시간당 약 0.015% 분해되지만 사람에 따라 0.010%까지 느릴 수 있습니다. 다음날 아침에도 알코올이 남아 있을 수 있습니다.</li>
            <li><strong>숙취 해소 오해:</strong> 커피, 사우나, 찬물은 BAC를 낮추지 않습니다. 시간이 지나는 것만이 유일한 방법입니다.</li>
            <li><strong>음주운전 기준:</strong> 도로교통법상 0.03% 이상 면허 정지, 0.08% 이상 면허 취소, 0.2% 이상은 가중처벌됩니다. 조금이라도 마셨다면 운전하지 마세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
