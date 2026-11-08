import { Metadata } from 'next'
import DependentDeductionCalculator from '@/components/DependentDeductionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, judge, BORN, EXAMPLES, PENSION_LIMIT } from '@/utils/dependentDeduction'
import { TAX_YEAR } from '@/utils/yearEndTax'

export const metadata: Metadata = {
  title: '연말정산 부양가족 공제 조건 판정 2026 | 툴허브',
  description: '부모님·자녀·배우자·형제자매의 출생연도와 소득을 넣으면 2026년 귀속 연말정산 기본공제 가능 여부를 이유와 함께 판정합니다. 소득금액 100만원·총급여 500만원, 국민연금 516만원 기준, 퇴직금·양도소득 함정, 경로우대·장애인 추가공제, 맞벌이 부부 중 누가 공제받을지까지.',
  keywords: '부양가족 공제 조건, 연말정산 부양가족, 기본공제 대상자, 부양가족 소득요건, 부모님 국민연금 부양가족, 부양가족 나이 기준, 맞벌이 부양가족 공제, 부모님 인적공제, 형제자매 부양가족 공제, 경로우대 공제, 부양가족 중복공제',
  openGraph: {
    title: '연말정산 부양가족 공제 조건 판정 2026 | 툴허브',
    description: '가족별 나이·소득 요건 판정과 이유, 줄어드는 세금, 맞벌이 누가 공제받을지.',
    url: 'https://toolhub.ai.kr/dependent-deduction/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dependent-deduction.png', width: 1200, height: 630, alt: '연말정산 부양가족 공제 조건 판정 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '연말정산 부양가족 공제 판정 | 툴허브', description: '가족별 기본공제 가능 여부와 줄어드는 세금, 맞벌이 배분', images: ['https://toolhub.ai.kr/og/dependent-deduction.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/dependent-deduction/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-dependent-deduction.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const D = analyze(EXAMPLES.d.me, EXAMPLES.d.family)
const DAD = D.rows[0].inc.total
const P = analyze(EXAMPLES.pass.me, EXAMPLES.pass.family)
const C = analyze({ salary: EXAMPLES.c.salary, female: false, single: false }, EXAMPLES.c.family, EXAMPLES.c.spouseSalary).couple!
const RETIRED = judge(EXAMPLES.retired).inc.total

const faqs = [
  { q: '연말정산 부양가족 공제 조건은 무엇인가요?', a: `기본공제(1명당 150만원)를 받으려면 나이·소득·동거 요건을 모두 채워야 합니다. ${TAX_YEAR}년 귀속 기준 부모·조부모는 ${BORN.parent}년 이전 출생(60세 이상), 자녀·손자녀는 ${BORN.young}년 이후 출생(20세 이하), 형제자매는 20세 이하 또는 60세 이상이어야 하고 배우자는 나이와 관계없습니다. 소득은 연간 소득금액 합계 100만원 이하, 근로소득만 있으면 총급여 500만원 이하여야 합니다(소득세법 제50조). 장애인은 나이 요건이 없습니다.` },
  { q: '국민연금만 받는 부모님도 부양가족 공제를 받을 수 있나요?', a: `공적연금은 받은 총연금액이 아니라 연금소득공제를 뺀 연금소득금액으로 따집니다(소득세법 제47조의2). 다른 소득이 없으면 과세 대상 총연금액 ${won(PENSION_LIMIT)}까지는 소득금액이 100만원 이하라 공제받을 수 있습니다. 국민연금을 연 540만원 받는 1956년생 아버지는 소득금액이 ${won(DAD)}이라 탈락하고, 연금이 ${won(PENSION_LIMIT)}이었다면 기본공제 150만원과 경로우대 100만원으로 총급여 5,000만원인 자녀의 세금이 ${won(P.contrib[0])} 더 줄었을 것입니다. 2002년 이전 납입분에 해당하는 연금은 과세 대상이 아니므로 공단의 연금소득 원천징수영수증에 적힌 총연금액으로 확인하세요.` },
  { q: '부모님이 퇴직금을 받거나 집을 팔면 어떻게 되나요?', a: `소득금액에는 종합소득뿐 아니라 퇴직소득과 양도소득도 들어갑니다. 올해 퇴직금 3,000만원을 받은 부모님은 퇴직소득금액이 ${won(RETIRED)}이라 그해에는 공제를 받을 수 없습니다. 부동산·주식을 팔아 양도소득금액이 100만원을 넘어도 마찬가지이고, 1세대 1주택 비과세로 양도소득이 없으면 영향이 없습니다. 탈락은 그해만이며 다음 해에는 다시 요건을 따집니다.` },
  { q: '따로 사는 부모님도 공제받을 수 있나요?', a: '직계존속(본인과 배우자의 부모·조부모)은 주거 형편에 따라 따로 살아도 실제로 부양하고 있으면 생계를 같이 하는 것으로 봅니다(소득세법 제53조제3항). 자녀·입양자는 동거 요건이 없습니다. 형제자매와 기초생활 수급자는 주민등록상 함께 살며 생계를 같이 해야 하고, 취학·질병 요양·근무상 형편으로 잠시 떨어진 경우는 인정됩니다.' },
  { q: '나이 기준은 언제를 기준으로 하나요?', a: `원칙은 과세기간 종료일(12월 31일) 현재 상황이지만, 나이 요건은 과세기간 중 하루라도 해당하면 충족한 것으로 봅니다(소득세법 제53조). 그래서 ${TAX_YEAR}년 귀속은 출생연도만 보면 됩니다. 부모 ${BORN.parent}년 이전 출생, 자녀 ${BORN.young}년 이후 출생, 경로우대(70세 이상)는 ${BORN.elderly}년 이전 출생입니다.` },
  { q: '아르바이트하는 대학생 자녀나 배우자는요?', a: '근로소득만 있으면 총급여(비과세 제외) 500만원까지 기본공제를 받을 수 있습니다. 근로소득과 다른 소득이 함께 있으면 총급여에서 근로소득공제를 뺀 근로소득금액을 다른 소득과 합쳐 100만원 이하인지 봅니다. 일용근로소득은 분리과세라 금액과 관계없이 빠지지만, 자녀는 나이 요건(20세 이하)도 채워야 합니다.' },
  { q: '예금 이자나 배당이 있으면 탈락하나요?', a: '이자·배당 합계가 연 2,000만원 이하이면 분리과세로 끝나 소득금액에 들어가지 않습니다(소득세법 제14조제3항). 2,000만원을 넘으면 종합과세되어 소득금액이 100만원을 넘으므로 탈락합니다. 사적연금(연금저축·IRP) 1,500만원 이하와 기타소득금액 300만원 이하도 분리과세를 선택하면 빠집니다.' },
  { q: '건강보험 피부양자와 연말정산 부양가족은 같은가요?', a: '다른 제도입니다. 연말정산 부양가족 공제는 소득세법 기준(소득금액 100만원, 나이 요건)이고, 건강보험 피부양자는 국민건강보험법 기준(소득 연 2,000만원, 재산 요건, 부양 요건)입니다. 국민연금을 연 1,000만원 받는 부모님은 피부양자는 유지될 수 있지만 연말정산 부양가족 공제는 받을 수 없습니다. 피부양자 여부는 건강보험 피부양자 자격 판정에서 확인할 수 있습니다.' },
  { q: '형제끼리 부모님을 각자 공제받으면 어떻게 되나요?', a: '한 가족은 한 사람의 기본공제대상자만 될 수 있습니다(소득세법 제50조제3항). 형제가 같은 부모님을 각자 공제받거나 부부가 같은 자녀를 함께 공제받으면 국세청 사후 검증으로 한쪽 공제가 취소되고, 덜 낸 세금과 가산세를 내야 합니다. 연말정산 전에 가족끼리 누가 받을지 정하세요.' },
  { q: '맞벌이 부부는 누가 부양가족 공제를 받아야 유리한가요?', a: `대체로 세율 구간이 높은 쪽이 받는 것이 유리합니다. 총급여 1억원(24% 구간)인 사람과 6,000만원(15% 구간)인 배우자가 있을 때 75세 어머니(기본 150만 + 경로우대 100만)를 배우자가 공제받으면 세금이 ${won(C.before - C.current.total)} 줄지만, 총급여 1억원인 쪽이 받으면 ${won(C.before - C.best.total)} 줄어 ${won(C.gain)} 이득입니다. 다만 자녀세액공제는 자녀 수에 따라 금액이 달라지고, 낼 세금보다 큰 공제는 사라지므로 계산기로 두 사람 세금 합을 비교하는 것이 정확합니다.` },
  { q: '부양가족 소득 기준이 300만원으로 오른다던데요?', a: '2026년 8월 정부 세제개편안에 기본공제대상자 소득금액 기준을 100만원에서 300만원으로, 근로소득만 있는 경우 총급여 기준을 500만원에서 750만원으로 올리는 내용이 있습니다. 국회 심의 중이라 적용 연도가 확정되지 않았으므로 이 계산기는 현행 기준(100만원·500만원)으로 판정하며, 국회를 통과하면 갱신합니다.' },
]

const sources = [
  { label: '소득세법 제50조 (기본공제 — 소득금액 100만원·총급여 500만원·나이 요건)', url: 'https://www.law.go.kr/법령/소득세법/제50조' },
  { label: '소득세법 제51조 (추가공제 — 경로우대·장애인·부녀자·한부모)', url: 'https://www.law.go.kr/법령/소득세법/제51조' },
  { label: '소득세법 제53조 (생계를 같이 하는 부양가족·판정 시기·나이 하루라도)', url: 'https://www.law.go.kr/법령/소득세법/제53조' },
  { label: '소득세법 제47조의2 (연금소득공제)', url: 'https://www.law.go.kr/법령/소득세법/제47조의2' },
  { label: '소득세법 제14조 (분리과세 — 일용근로·금융소득 2천만원·사적연금·기타소득)', url: 'https://www.law.go.kr/법령/소득세법/제14조' },
  { label: '소득세법 제59조의2 (자녀세액공제·출산입양 공제)', url: 'https://www.law.go.kr/법령/소득세법/제59조의2' },
  { label: '소득세법 시행령 제106조 (부양가족 등의 인정 범위)', url: 'https://www.law.go.kr/법령/소득세법시행령/제106조' },
]

export default function DependentDeductionPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '연말정산 부양가족 공제 판정',
    description: '가족별 출생연도와 소득으로 연말정산 기본공제 가능 여부와 이유, 추가공제, 줄어드는 세금, 맞벌이 부부의 유리한 공제 배분을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/dependent-deduction/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [`${TAX_YEAR}년 귀속 기본공제 나이·소득·동거 요건 판정`, '탈락 이유 문장 표시', '공적연금 연금소득공제·분리과세 소득 반영', '퇴직소득·양도소득 포함', '경로우대·장애인·부녀자·한부모 추가공제', '자녀세액공제·출산공제 반영', '가족별 줄어드는 세금', '맞벌이 부부 모든 배분 비교', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DependentDeductionCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">연말정산 부양가족 공제 판정이란?</h2>
          <p className="text-body leading-relaxed mb-6">
            연말정산 부양가족 공제 판정은 부모님·자녀·배우자·형제자매의 출생연도와 소득 종류별 금액을 넣으면 기본공제(1명당 150만원)를 받을 수 있는지 이유와 함께 알려 주는 도구입니다. 나이는 과세기간 중 하루라도 해당하면 되므로 출생연도로 판정하고, 소득은 비과세·분리과세를 뺀 소득금액(공적연금은 연금소득공제 후, 근로소득만 있으면 총급여)으로 따집니다. 공제 가능한 가족을 모두 넣었을 때와 아무도 넣지 않았을 때의 세금 차이(지방소득세 포함)를 보여 주고, 맞벌이 부부라면 누가 어떤 가족을 공제받아야 두 사람 세금이 가장 적은지 모든 조합으로 비교합니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">예시 ({TAX_YEAR}년 귀속, 다른 공제가 없다고 가정)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>총급여 5,000만원, 국민연금 연 540만원 받는 아버지(1956년생) + 자녀 2명(2015·2019년생):</strong> 아버지는 70세 이상이지만 연금소득금액이 {won(DAD)}이라 탈락합니다. 자녀 2명 기본공제와 2015년생 자녀의 자녀세액공제로 세금이 {won(D.saving)} 줄어듭니다.
            </li>
            <li>
              <strong>같은 가족, 아버지 연금이 {won(PENSION_LIMIT)}이면:</strong> 아버지도 기본공제 150만원과 경로우대 100만원을 받아 세금이 모두 {won(P.saving)} 줄어듭니다.
            </li>
            <li>
              <strong>총급여 1억원 + 배우자 6,000만원, 75세 어머니를 배우자가 공제받는 중:</strong> 총급여 1억원인 쪽으로 옮기면 두 사람 세금 합이 {won(C.gain)} 더 줄어듭니다.
            </li>
          </ul>

          <p className="text-sm text-muted mb-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 부양가족 의료비는 <a href="/medical-tax-credit/" className="text-primary hover:underline">의료비 세액공제 계산기</a>, 건강보험 피부양자 유지 여부는 <a href="/dependent-eligibility/" className="text-primary hover:underline">건강보험 피부양자 자격 판정</a>에서 확인할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 11월 현재 시행 중인 법령 기준입니다. 국회 심의 중인 2026년 세제개편안(소득금액 300만원·총급여 750만원 상향)은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
