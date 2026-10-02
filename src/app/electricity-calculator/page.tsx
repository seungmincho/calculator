import { Metadata } from 'next'
import ElectricityCalculator from '@/components/ElectricityCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '전기요금 계산기 - 한국 주택용 누진제 전기세 계산 | 툴허브',
  description: '전기요금 계산기 - 월 사용량(kWh)을 입력하면 한국 주택용 전기요금을 누진제 기준으로 계산합니다. 계절별 요금, 부가세, 기금까지 포함한 예상 금액.',
  keywords: '전기요금 계산기, 전기세 계산, 전기요금 누진제, 한전 전기요금, 전기세 계산기, electricity bill calculator',
  openGraph: { title: '전기요금 계산기 | 툴허브', description: '한국 주택용 전기요금 누진제 계산', url: 'https://toolhub.ai.kr/electricity-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/electricity-calculator.png', width: 1200, height: 630, alt: '전기요금 계산기' }] },
  twitter: { card: 'summary_large_image', title: '전기요금 계산기 | 툴허브', description: '한국 주택용 전기요금 누진제 계산', images: ['https://toolhub.ai.kr/og/electricity-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/electricity-calculator/' },
}

export default function ElectricityCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '전기요금 계산기', description: '한국 주택용 전기요금 누진제 기준 계산기', url: 'https://toolhub.ai.kr/electricity-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['누진제 전기요금 계산', '계절별 요금 차이', '부가세/기금 포함', '가전별 사용량 계산', '에어컨 추가 사용 요금', '지난달 비교', '복지할인', '주택용 고압', '슈퍼유저 요금', '절약 팁'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '주택용 전기요금 누진제 구간은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주택용 전기요금은 사용량에 따라 3단계 누진제가 적용됩니다. 1구간(200kWh 이하)은 kWh당 120.0원, 2구간(201~400kWh)은 214.6원, 3구간(400kWh 초과)은 307.3원입니다(기타 계절 기준, 하계 7~8월은 구간이 300/450kWh로 넓어짐). 여기에 기본요금, 부가가치세(10%), 전력산업기반기금(2.7%)이 추가됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '여름·겨울 전기요금이 더 비싼 이유는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '겨울(12~2월)에는 누진 구간이 기타 계절과 같은데 전기난방기기 사용으로 사용량이 늘어 높은 구간에 들어가기 쉽기 때문입니다. 여름(7~8월)은 구간이 300/450kWh로 넓어지고, 여름·겨울에 1,000kWh를 넘기면 초과분에 슈퍼유저 요금이 붙습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전기요금을 절약하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전기요금 절약 팁: ① 에어컨 적정 온도 26도 유지 ② 대기전력 차단(멀티탭 스위치 끄기) ③ LED 조명 교체 ④ 에너지효율 1등급 가전 사용 ⑤ 고효율 냉장고 적정 용량 선택. 또한 에너지캐시백 제도를 활용하면 전년 대비 절감한 전기요금의 일부를 포인트로 돌려받을 수 있습니다.',
        },
      },
    ],
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '전기요금 계산하는 방법',
    description: '월 전기 사용량을 입력하면 누진제 기준으로 전기요금을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '사용량 입력', text: '월 전기 사용량(kWh)을 입력합니다. 전기 고지서에서 확인할 수 있습니다.' },
      { '@type': 'HowToStep', name: '사용 월 선택', text: '사용 월을 고르면 하계(7~8월)·기타 계절 요금이 자동 적용됩니다.' },
      { '@type': 'HowToStep', name: '요금 확인', text: '누진 구간별 요금, 기본료, 부가세(10%), 전력기반기금(2.7%)이 포함된 최종 청구 금액을 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><ElectricityCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            전기요금 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            전기요금 계산기는 월 사용량(kWh)을 입력하면 한국전력(한전)의 주택용 전기요금을 누진제 기준으로 계산하는 도구입니다. 기본요금, 사용요금(3단계 누진제), 부가가치세(10%), 전력산업기반기금(2.7%)까지 포함한 최종 청구 금액을 예측할 수 있습니다. 여름·겨울 냉난방 시즌에 요금이 얼마나 늘어나는지 미리 확인하고 절약 계획을 세워보세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            전기요금 절약 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>누진 구간 관리:</strong> 월 200kWh 이하는 1구간, 201~400kWh는 2구간, 400kWh 초과는 3구간으로 요금이 크게 올라갑니다. 사용량이 구간 경계에 걸리지 않도록 관리하는 것이 중요합니다.</li>
            <li><strong>에너지캐시백 활용:</strong> 한전 에너지캐시백에 신청하면 과거 같은 달보다 아낀 사용량에 따라 캐시백을 받을 수 있습니다. 조건은 한전에서 확인하세요.</li>
            <li><strong>대기전력 차단:</strong> TV, 셋톱박스, 컴퓨터의 대기전력은 가정 전기 사용량의 약 11%를 차지합니다. 멀티탭 스위치로 차단하면 연간 수만 원을 절약할 수 있습니다.</li>
            <li><strong>에너지효율 가전 선택:</strong> 1등급 에어컨은 5등급 대비 최대 40% 전기를 덜 씁니다. 가전 구입 시 에너지 소비효율 등급을 반드시 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
