import { Metadata } from 'next'
import MinimumWageCalculator from '@/components/MinimumWageCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '2027 최저임금 계산기 - 시급 10,700원 월급 환산 | 툴허브',
  description: '2027년 최저시급 10,700원(3.7% 인상)을 일급·주급·월급·연봉으로 환산하세요. 주 40시간 월 2,236,300원, 주 15~35시간 알바 주휴수당 포함 월급, 내 시급·월급 최저임금 위반 여부와 부족액까지 바로 확인.',
  keywords: '2027 최저임금, 2027 최저시급, 최저임금 월급, 최저임금 계산기, 최저시급 계산기, 최저임금 위반, 최저임금 연봉, 2026 최저임금, 수습 최저임금, 알바 최저시급 월급',
  openGraph: {
    title: '2027 최저임금 계산기 - 시급 10,700원 | 툴허브',
    description: '2027년 최저시급 10,700원, 월 2,236,300원. 근무시간별 월급과 내 임금 위반 여부를 바로 계산.',
    url: 'https://toolhub.ai.kr/minimum-wage/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/minimum-wage.png', width: 1200, height: 630, alt: '2027 최저임금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '2027 최저임금 계산기 | 툴허브', description: '2027 최저시급 10,700원 월급·연봉 환산과 위반 확인', images: ['https://toolhub.ai.kr/og/minimum-wage.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/minimum-wage/' },
}

// 컴포넌트 가이드 FAQ(messages minimumWage.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: '2027년 최저임금(최저시급)은 얼마인가요?', a: '2027년 최저임금은 시간당 10,700원으로 2026년 10,320원보다 380원(3.7%) 올랐습니다. 주 40시간 근무 기준 월급은 2,236,300원(월 209시간), 연봉으로는 26,835,600원입니다. 고용노동부가 2026년 8월 5일 고시했고 2027년 1월 1일부터 적용됩니다.' },
  { q: '최저임금 월급 2,236,300원에는 주휴수당이 포함되나요?', a: '네. 월 209시간은 주 40시간에 주휴 8시간을 더한 48시간에 1년 평균 주 수(365 ÷ 7 ÷ 12 ≈ 4.345)를 곱한 값입니다. 그래서 10,700원 × 209시간 = 2,236,300원은 주휴수당을 포함한 세전 금액입니다. 2026년 기준으로는 2,156,880원입니다.' },
  { q: '주 20시간 아르바이트의 최저 월급은 얼마인가요?', a: '주 15시간 이상이면 주휴수당이 생기므로 주 20시간이면 주휴 4시간이 더해져 월 약 104시간이 됩니다. 2027년 기준 10,700원 × 104시간 = 1,112,800원입니다. 주 15시간 미만이면 주휴수당 없이 일한 시간만큼만 계산합니다.' },
  { q: '수습기간에는 최저임금보다 적게 줘도 되나요?', a: '1년 이상 근로계약을 맺고 수습을 시작한 지 3개월 이내인 경우에만 최저임금의 90%(2027년 시간당 9,630원)까지 줄 수 있습니다. 계약 기간이 1년 미만이거나, 고용노동부장관이 고시한 단순노무업무 직종이면 수습이어도 감액할 수 없습니다(최저임금법 제5조②, 시행령 제3조).' },
  { q: '5인 미만 사업장도 최저임금을 지켜야 하나요?', a: '네. 최저임금법은 근로자를 쓰는 모든 사업장에 적용되므로 1인을 고용한 가게도 최저임금 이상을 줘야 합니다. 연장·야간·휴일 가산수당과 달리 사업장 규모에 따른 예외가 없습니다. 동거하는 친족만 쓰는 사업과 가사 사용인 등만 제외됩니다.' },
  { q: '업종별로 최저임금이 다른가요?', a: '아닙니다. 최저임금법 제4조는 사업 종류별로 구분해 정할 수 있게 허용하지만, 2027년 최저임금은 업종 구분 없이 모든 사업장에 같은 시간당 10,700원이 적용됩니다. 편의점·음식점·사무직 모두 같습니다.' },
  { q: '식대나 상여금도 최저임금에 포함되나요?', a: '매달 1회 이상 정기적으로 주는 상여금과 현금으로 주는 식비·교통비 같은 복리후생비는 2024년부터 전액 최저임금에 포함됩니다. 분기·연 단위 상여금, 연장·야간·휴일수당, 현물로 주는 식사는 포함되지 않습니다.' },
  { q: '최저임금을 안 주면 어떻게 신고하나요?', a: '고용노동부 고객상담센터(국번 없이 1350)에서 상담하고 사업장 관할 지방고용노동관서에 진정할 수 있으며, 온라인 민원으로도 낼 수 있습니다. 최저임금 위반은 3년 이하 징역 또는 2천만원 이하 벌금 대상이고(최저임금법 제28조), 못 받은 차액은 3년 안에 청구해야 합니다.' },
]

export default function MinimumWagePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '최저임금 계산기',
    description: '2026·2027년 최저시급으로 일급·주급·월급·연봉을 환산하고 내 시급·월급의 최저임금 위반 여부를 확인하는 도구.',
    url: 'https://toolhub.ai.kr/minimum-wage/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026·2027 최저시급 비교', '풀타임·아르바이트 근무시간별 환산', '주휴수당 포함 주급·월급', '일급·연봉 환산', '전년 대비 인상액·인상률', '내 시급·월급 최저임금 위반 확인', '수습 90% 감액 기준', '주 15~40시간 월급 표', '결과 공유 링크·이미지'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <MinimumWageCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">최저임금 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            최저임금 계산기는 고용노동부가 고시한 시간급 최저임금을 일급·주급·월급·연봉으로 바꿔 주고, 내가 받는 시급이나 월급이 최저임금에 못 미치는지 확인해 주는 도구입니다. 2027년 최저임금은 최저임금위원회가 2026년 7월 14일 의결하고 고용노동부가 8월 5일 고시한 시간당 10,700원이며, 2027년 1월 1일부터 업종 구분 없이 모든 사업장에 적용됩니다. 주휴수당은 근로기준법에 따라 주 15시간 이상 일할 때 근무시간에 비례해 더하고, 월급은 1년 평균 주 수(365 ÷ 7 ÷ 12)로 환산합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">2027 최저임금 환산 예시</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>주 40시간 풀타임:</strong> 10,700원 × 209시간 = 월 2,236,300원, 연 26,835,600원 (2026년 2,156,880원보다 월 79,420원 많음)</li>
            <li><strong>주 20시간 아르바이트:</strong> 주휴 4시간 포함 월 104시간, 월 1,112,800원</li>
            <li><strong>주 15시간:</strong> 주휴 3시간 포함 월 78시간, 월 834,600원 — 주 14시간 이하면 주휴수당이 없습니다</li>
            <li><strong>수습(1년 이상 계약, 3개월 이내, 단순노무 제외):</strong> 시간당 9,630원(90%), 주 40시간 월 2,012,670원</li>
          </ul>
        </div>
      </section>
    </>
  )
}
