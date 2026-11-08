import { Metadata } from 'next'
import BudgetCalculator from '@/components/BudgetCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import budgetCalculatorMessages from '../../../messages/generated/ko/ns/budgetCalculator.json'

const sources = [
  { label: '국세청 — 근로소득 원천징수(간이세액표)', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6583&cntntsId=7862' },
  { label: '소득세법 시행령 [별표 2] — 근로소득 간이세액표', url: 'https://www.law.go.kr/법령/소득세법시행령' },
  { label: '국민건강보험공단 — 2026년 건강·장기요양보험료율', url: 'https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html' },
]

export const metadata: Metadata = {
  title: '생활비 계산기 - 월간 예산 관리 | 툴허브',
  description: '월급을 넣고 50/30/20·통장 쪼개기·사회초년생 규칙을 고르면 13개 항목 예산과 저축률을 바로 보여 줍니다. 월별 실제 지출, 남은 하루 예산, 비상금 목표까지 관리하세요.',
  keywords: '생활비 계산기, 예산 관리, 가계부, 월간 지출, 50 30 20 규칙, 가계 예산, 절약, 지출 분석, budget calculator',
  openGraph: {
    title: '생활비 계산기 - 월간 예산 관리 | 툴허브',
    description: '월급을 넣고 50/30/20·통장 쪼개기 규칙으로 13개 항목 예산과 저축률을 계산하세요.',
    url: 'https://toolhub.ai.kr/budget-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/budget-calculator.png', width: 1200, height: 630, alt: '생활비 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '생활비 계산기 - 월간 예산 관리',
    description: '카테고리별 월간 지출을 관리하고 예산을 계획하세요.',
    images: ['https://toolhub.ai.kr/og/budget-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/budget-calculator/',
  },
}

export default function BudgetCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '생활비 계산기',
    description: '카테고리별 월간 지출을 관리하고 예산을 계획하는 도구. 50/30/20·통장 쪼개기 규칙, 월별 계획 대비 실제 지출, 남은 하루 예산, 비상금 목표, 연봉→실수령 연동.',
    url: 'https://toolhub.ai.kr/budget-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '월급/부수입/기타수입 입력',
      '13개 한국형 지출 카테고리',
      '연봉 → 실수령액 자동 계산',
      '월별 계획 대비 실제 지출·남은 하루 예산',
      '비상금 목표(3~6개월) 진행률',
      '50/30/20 규칙 분석',
      '50/30/20·통장 쪼개기 규칙 자동 배분',
      '예산 프리셋 저장/불러오기',
      '저축률 결과 이미지 공유·CSV 내보내기',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqJsonLd items={budgetCalculatorMessages.budgetCalculator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <BudgetCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-line pt-8">
            <h2 className="text-xl font-bold text-fg mb-4">
              생활비 계산기란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              생활비 계산기는 <strong>월간 소득 대비 지출을 카테고리별로 분석하고 예산을 체계적으로 관리</strong>하는 도구입니다. 식비·주거비·교통비 등 13개 한국형 지출 항목을 입력하면 50/30/20·통장 쪼개기·사회초년생 규칙의 목표 비율과 비교해 저축률 판정을 바로 보여 줍니다. 가계부 쓰기가 어려운 분, 월말마다 남는 돈이 없는 분, 저축률을 높이고 싶은 분에게 적합합니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              생활비 관리 및 절약 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>50/30/20 규칙:</strong> 필수 생활비 50%, 여가/소비 30%, 저축/투자 20%를 목표로 설정하세요.</li>
              <li><strong>고정비 최소화:</strong> 통신비·구독 서비스·보험을 정기적으로 점검해 불필요한 지출을 줄이세요.</li>
              <li><strong>식비 절약:</strong> 주 1회 장보기와 도시락 지참으로 외식비를 월 5~10만 원 줄일 수 있습니다.</li>
              <li><strong>프리셋 저장:</strong> 현재 예산 구성을 저장해두면 다음 달 빠르게 불러와 비교할 수 있습니다.</li>
              <li><strong>월별 기록:</strong> 매달 실제 지출을 입력하면 계획 대비 어느 항목이 넘쳤는지와 남은 하루 예산을 바로 확인할 수 있습니다.</li>
            </ul>
            <h3 className="text-lg font-semibold text-fg mt-8 mb-3">실수령액 계산 근거</h3>
            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
              <ul className="space-y-1.5">
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                  </li>
                ))}
              </ul>
              <p className="mt-3">기준: 2026년 2월 27일 개정 근로소득 간이세액표와 2026년 4대보험 요율. 연봉을 입력했을 때 월 실수령액을 구하는 데만 쓰이고, 50/30/20 같은 예산 배분 규칙은 공식 기준이 아닌 일반적인 가계 관리 방법입니다.</p>
            </div>
          </div>
        </section>
    </>
  )
}
