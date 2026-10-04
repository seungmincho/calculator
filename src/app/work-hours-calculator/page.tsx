import { Metadata } from 'next'
import WorkHoursCalculator from '@/components/WorkHoursCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '근무시간 계산기 - 알바비·수당 계산 | 툴허브',
  description: '출퇴근 시각과 휴게시간만 넣으면 알바비가 바로 나옵니다. 2026년 최저시급 기준으로 연장·야간·휴일 가산수당과 주휴수당 발생 여부를 계산하고, 5인 미만 사업장 옵션, 주 52시간·휴게시간 경고, 시급→월급 환산까지 한 번에.',
  keywords: [
    '근무시간 계산기',
    '알바비 계산기',
    '야근수당 계산',
    '주휴수당 계산',
    '연장근로수당',
    '시급 계산기',
    '근로기준법',
    '아르바이트 급여',
    '파트타임 급여',
    '최저임금',
    '급여 계산',
    '근로시간',
    '휴게시간',
    '야간근로수당',
    '휴일근로수당'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산',
    description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당, 연장근로수당을 자동으로 계산하여 실제 받을 급여를 확인하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/work-hours-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/work-hours-calculator.png',
        width: 1200,
        height: 630,
        alt: '근무시간 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산',
    description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당 자동 계산.',
    images: ['https://toolhub.ai.kr/og/work-hours-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/work-hours-calculator/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function WorkHoursCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '근무시간 계산기',
    description: '알바비, 야근수당, 주휴수당을 근로기준법에 따라 정확하게 계산하는 도구',
    url: 'https://toolhub.ai.kr/work-hours-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  }

  const faq = [
    { q: '2026년 최저시급은 얼마인가요?', a: '2026년 최저임금은 시간당 10,320원입니다. 주 40시간 근무 기준 월 최저임금은 2,156,880원(주휴수당 포함, 월 소정근로시간 209시간 기준)이며, 연봉으로 환산하면 약 25,882,560원입니다. 최저임금은 모든 사업장에 동일하게 적용되며, 이보다 낮은 급여를 지급하면 최저임금법 위반입니다(최저임금법 제6조). 2027년 1월 1일부터는 시간당 10,700원(월 2,236,300원)입니다.' },
    { q: '주휴수당은 어떻게 계산하나요?', a: '주휴수당은 1주 15시간 이상 근무한 근로자에게 유급 휴일 1일분의 급여를 추가 지급하는 것입니다. 계산법은 (1주 소정근로시간 ÷ 40시간) × 8시간 × 시급입니다. 예를 들어 주 20시간 근무, 시급 10,000원이면 주휴수당은 (20÷40)×8×10,000 = 40,000원입니다.' },
    { q: '야간근로수당과 연장근로수당은 어떻게 다른가요?', a: '연장근로수당은 법정근로시간(1일 8시간·주 40시간)을 초과한 근무에 대해 통상임금의 50%를 가산하여 지급합니다(상시 5인 이상 사업장, 근로기준법 제56조). 야간근로수당은 밤 10시~새벽 6시 사이 근무에 대해 통상임금의 50%를 가산합니다. 야간에 연장근로를 하면 두 가산이 중복 적용되어 통상임금의 100%가 추가됩니다.' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <div className="min-h-screen py-12 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <WorkHoursCalculator />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <ToolFaq items={faq} />
        </div>
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            근무시간 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            근무시간 계산기는 근로기준법에 따라 알바비, 야근수당, 주휴수당, 연장근로수당을 정확하게 계산해 드리는 도구입니다. 출퇴근 시간, 휴게 시간, 시급을 입력하면 기본급과 각종 가산 수당을 항목별로 분리하여 보여줍니다. 2026년 최저시급 10,320원(월 2,156,880원)을 기준으로 하며, 야간근로(밤 10시~새벽 6시) 및 휴일근로 가산수당도 자동으로 반영합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            근무시간 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>급여 명세서 검증:</strong> 사업주로부터 받은 급여 명세서의 수당 계산이 정확한지 직접 검증하여 임금 체불 여부를 확인하세요.</li>
            <li><strong>야간 알바 수당:</strong> 상시 5인 이상 사업장이라면 밤 10시~오전 6시 근무는 기본 시급의 150%(시급 + 50% 가산)를 받아야 합니다(5인 미만은 가산 의무 없음). 편의점·식당 야간 알바 시 반드시 확인하세요.</li>
            <li><strong>휴게시간 공제:</strong> 4시간 근무 시 30분, 8시간 근무 시 1시간의 휴게시간이 법적으로 보장되며, 해당 시간은 급여 계산에서 제외됩니다. 2026년 12월 10일부터는 근로시간이 4시간인 경우 근로자가 명시적으로 요청하면 휴게를 생략할 수 있습니다(근로기준법 제54조① 단서).</li>
            <li><strong>월급 환산:</strong> 주당 근무 일수와 시급을 입력하면 주휴수당 포함 월 예상 급여를 환산하여 취업 전 수입을 미리 계획할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
