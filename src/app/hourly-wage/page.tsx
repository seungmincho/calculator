import { Metadata } from 'next'
import HourlyWage from '@/components/HourlyWage'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '시급 계산기 - 시급, 일급, 월급, 연봉 변환 | 툴허브',
  description: '시급 계산기 - 시급, 일급, 월급, 연봉을 상호 변환합니다. 2026년 최저시급 10,320원 비교, 주휴수당 포함 월급·세후 실수령액, 주 15·20·30·40시간 알바 환산.',
  keywords: '시급 계산기, 시급 계산, 일급 계산, 월급 시급 변환, hourly wage calculator, 최저시급',
  openGraph: { title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/hourly-wage.png', width: 1200, height: 630, alt: '시급 계산기' }] },
  twitter: { card: 'summary_large_image', title: '시급 계산기 | 툴허브', description: '시급/일급/월급/연봉 상호 변환', images: ['https://toolhub.ai.kr/og/hourly-wage.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/hourly-wage/' },
}

export default function HourlyWagePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '시급 계산기', description: '시급/일급/월급/연봉 상호 변환', url: 'https://toolhub.ai.kr/hourly-wage', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['시급·일급·주급·월급·연봉 상호 변환', '주휴수당 포함/제외', '2026 최저시급 위반 확인', '연장·야간·휴일 가산 일당 계산', '세후 실수령액'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2026년 최저시급은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 최저시급은 시간당 10,320원입니다. 주 40시간 근무 기준 월 환산액은 2,156,880원(주휴수당 포함, 월 209시간)이며, 연봉으로 환산하면 약 25,882,560원입니다. 최저임금은 정규직, 비정규직, 아르바이트 등 모든 근로자에게 동일하게 적용됩니다. 2027년 1월 1일부터는 시간당 10,700원(월 2,236,300원)으로 3.7% 오릅니다(고용노동부 2026.8.5 고시).',
        },
      },
      {
        '@type': 'Question',
        name: '시급을 월급으로 변환하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '월급 = 시급 × 월 소정근로시간이며, 월 소정근로시간 = (주 소정근로시간 + 주휴시간) × 365 ÷ 7 ÷ 12입니다. 주 40시간이면 (40 + 8) × 4.345 ≈ 209시간, 주 20시간이면 (20 + 4) × 4.345 ≈ 104시간입니다. 주 4주로 곱하면 한 달 약 0.345주분이 빠져 월급이 적게 계산됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주휴수당은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주휴수당은 1주 15시간 이상 근무하고 소정근로일을 개근한 근로자에게 지급됩니다. 계산법은 (1주 소정근로시간 / 40) × 8 × 시급입니다. 예를 들어 주 40시간 근무 시 8시간분의 시급이 추가되며, 주 20시간 근무 시 4시간분이 추가됩니다.',
        },
      },
    ],
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '시급 계산하는 방법',
    description: '월급 또는 연봉을 입력하면 근무시간 기준으로 시급을 환산합니다.',
    step: [
      { '@type': 'HowToStep', name: '급여 유형 선택', text: '시급, 일급, 주급, 월급, 연봉 중 알고 있는 급여 유형을 선택합니다.' },
      { '@type': 'HowToStep', name: '금액과 근무시간 입력', text: '급여 금액과 주 소정근로시간(15·20·30·40시간 프리셋), 주 근무일수, 주휴수당 포함 여부를 입력합니다.' },
      { '@type': 'HowToStep', name: '환산 결과 확인', text: '시급·일급·월급·연봉 상호 변환 결과와 최저시급 대비 비교를 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><HourlyWage />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            시급 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            시급 계산기는 시급·일급·월급·연봉을 상호 변환하는 무료 온라인 도구입니다. 2026년 최저시급(10,320원) 기준 비교, 주휴수당 포함 월급 환산, 아르바이트·파트타임·정규직 등 다양한 근무 형태에 맞춰 실수령액을 계산합니다. 취업 협상, 아르바이트 급여 확인, 연봉 협상 등에 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            시급 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>주휴수당 포함 여부 확인:</strong> 주 15시간 이상 근무하면 주휴수당이 발생합니다. 월급 협상 시 주휴수당 포함 여부를 반드시 확인하세요.</li>
            <li><strong>4대보험 공제:</strong> 월 60시간(주 15시간) 이상 근무하면 국민연금·건강보험·고용보험이 공제됩니다(산재보험은 사업주 전액 부담). 실수령액은 세전 금액의 약 88~92% 수준입니다.</li>
            <li><strong>연봉 협상 활용:</strong> 연봉을 시급으로 환산하면 시간당 가치를 구체적으로 파악하여 협상 기준을 세울 수 있습니다.</li>
            <li><strong>최저시급 위반 확인:</strong> 받은 시급이 2026년 최저시급(10,320원) 미만이라면 고용노동부에 신고할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
