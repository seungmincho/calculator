import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { glassCard } from '@/lib/glass'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { MEDIAN_INCOME } from '@/utils/medianIncome'
import { minWageFor } from '@/utils/minimumWage'
import { MONTHLY_HOURS, NTS_AVG_SALARY, NTS_SOURCE_YEAR, hourlyNet, topPercent } from '@/utils/salaryInsights'
import { TAX_YEAR, cardLimits, pensionCredit, pensionRate, rentCredit } from '@/utils/yearEndTax'
import { BASE, BRACKETS, COMPARE_YEAR, SITE, YEAR, calcLink, manwon, net, netIn, salaryLabel, signedWon, won } from '../lib'

type Params = { amount: string }

export function generateStaticParams(): Params[] {
  return BRACKETS.map(b => ({ amount: String(b) }))
}

export const dynamicParams = false

const parse = (amount: string) => {
  const man = Number(amount)
  return (BRACKETS as readonly number[]).includes(man) ? man : null
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const man = parse((await params).amount)
  if (!man) return {}
  const r = net(man)
  const title = `연봉 ${salaryLabel(man)} 실수령액 ${YEAR} - 월 ${manwon(r.netMonthly)} | 툴허브`
  const description = `연봉 ${salaryLabel(man)}의 ${YEAR}년 월 실수령액은 약 ${won(r.netMonthly)} (세전 월급 ${won(man * 10000 / 12)}). 4대보험 ${won((r.deductions.total - r.deductions.incomeTax - r.deductions.localIncomeTax) / 12)}, 세금 ${won((r.deductions.incomeTax + r.deductions.localIncomeTax) / 12)} 공제. 근로소득 상위 ${topPercent(r.gross)}%, 카드 공제 문턱 ${manwon((man * 10_000 - BASE.nonTaxableMonthly * 12) * 0.25)}. 부양가족·비과세별 실수령액 표 포함.`
  const url = `${SITE}/salary-table/${man}/`
  return {
    title,
    description,
    keywords: `연봉 ${man} 실수령액, 연봉 ${salaryLabel(man)} 실수령액, 연봉 ${man}만원 월급, 연봉 ${man} 세후, ${YEAR} 실수령액`,
    openGraph: { title, description, url, siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/salary-table.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['https://toolhub.ai.kr/og/salary-table.png'] },
    alternates: { canonical: url },
  }
}

/** 가족 구성 시나리오 (간이세액표 의미: 공제대상가족 수 / 그중 8~20세 자녀) */
const FAMILY = [
  { label: '1인 (본인)', dependents: 1, children: 0 },
  { label: '2인 (배우자)', dependents: 2, children: 0 },
  { label: '3인 (배우자+자녀1)', dependents: 3, children: 1 },
  { label: '4인 (배우자+자녀2)', dependents: 4, children: 2 },
]
const NON_TAXABLE = [0, 100_000, 200_000, 300_000]

export default async function SalaryBracketPage({ params }: { params: Promise<Params> }) {
  const man = parse((await params).amount)
  if (!man) notFound()
  const r = net(man)
  const d = r.deductions
  const c = COMPARE_YEAR ? netIn(man, COMPARE_YEAR) : null
  const monthlyGross = (man * 10_000) / 12
  const insMonthly = (d.nationalPension + d.healthInsurance + d.longTermCare + d.employmentInsurance) / 12
  const taxMonthly = (d.incomeTax + d.localIncomeTax) / 12
  const idx = BRACKETS.indexOf(man as (typeof BRACKETS)[number])
  const prev = idx > 0 ? BRACKETS[idx - 1] : null
  const next = idx < BRACKETS.length - 1 ? BRACKETS[idx + 1] : null
  const nearby = [-500, -300, -100, 0, 100, 300, 500].map(delta => man + delta).filter(m => m >= 1000)
  const raise = net(man + 300)

  // 금액마다 달라지는 정보: 국세청 분위·시급·중위소득 대비, 연말정산 문턱(총급여 = 연봉 − 비과세)
  const top = topPercent(r.gross), vsAvg = Math.round((r.gross / NTS_AVG_SALARY) * 100)
  // 다음 '의미 있는' 분위(상위 50·30·10% …)까지 필요한 연봉 — topPercent 는 단조라 이분 탐색
  const goal = [70, 60, 50, 40, 30, 20, 10, 5, 3, 1].find(g => g < top)
  const goalGap = goal ? (() => { let lo = r.gross, hi = 2e9; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (topPercent(mid) > goal) lo = mid; else hi = mid } return Math.ceil((hi - r.gross) / 10_000) * 10_000 })() : 0
  const milestone = goal ? `상위 ${goal}%까지 연봉 ${manwon(goalGap)} 더` : ''
  const hourly = Math.floor(monthlyGross / MONTHLY_HOURS), minWage = minWageFor(YEAR)
  const median1 = MEDIAN_INCOME[String(YEAR)]?.[0]
  const totalPay = r.gross - BASE.nonTaxableMonthly * 12
  const cardLine = Math.floor(totalPay * 0.25), medicalLine = Math.floor(totalPay * 0.03)
  const rentRate = rentCredit(totalPay, 10_000_000) / 10_000_000
  const pensionMax = pensionCredit(totalPay, 6_000_000, 3_000_000), taxEstimate = r.taxInfo.annualTaxEstimate
  const pensionCapped = monthlyGross - BASE.nonTaxableMonthly > INSURANCE.pensionMonthlyCap

  const faq = [
    { q: `연봉 ${salaryLabel(man)}은 상위 몇 %인가요?`, a: `국세청 ${NTS_SOURCE_YEAR}년 귀속 근로소득 자료로 보면 상위 약 ${top}%입니다. 근로소득자 평균 총급여(약 ${manwon(NTS_AVG_SALARY)})의 ${vsAvg}% 수준이고${goal ? `, 상위 ${goal}%에 들려면 연봉이 약 ${manwon(goalGap)} 더 높아야 합니다` : ''}.` },
    { q: `연봉 ${salaryLabel(man)}이면 카드를 얼마부터 써야 소득공제가 되나요?`, a: `비과세 식대 연 240만원을 뺀 총급여 ${won(totalPay)}의 25%인 ${won(cardLine)}(월 평균 ${won(cardLine / 12)})을 넘게 쓴 금액부터 공제됩니다. 넘는 부분은 신용카드 15%, 체크카드·현금영수증 30%, 전통시장·대중교통 40%이고 기본 한도는 ${manwon(cardLimits(totalPay, 0).basic)}입니다(${TAX_YEAR}년 귀속).` },
    { q: `연봉 ${salaryLabel(man)}의 세전 월급은 얼마인가요?`, a: `연봉을 12로 나눈 ${won(monthlyGross)}입니다. 여기서 4대보험 ${won(insMonthly)}과 소득세·지방소득세 ${won(taxMonthly)}을 빼면 월 실수령액 ${won(r.netMonthly)}이 됩니다 (부양가족 1인, 비과세 20만원 기준).` },
    { q: `연봉 ${salaryLabel(man)}은 공제율이 몇 %인가요?`, a: `총 공제율은 ${((d.total / r.gross) * 100).toFixed(1)}%입니다. 4대보험이 ${((insMonthly * 12 / r.gross) * 100).toFixed(1)}%, 세금이 ${((taxMonthly * 12 / r.gross) * 100).toFixed(1)}%이며, 과세표준 ${won(r.taxInfo.taxableIncome)}에 ${r.taxInfo.taxableIncome <= 14_000_000 ? '6%' : r.taxInfo.taxableIncome <= 50_000_000 ? '15%' : r.taxInfo.taxableIncome <= 88_000_000 ? '24%' : r.taxInfo.taxableIncome <= 150_000_000 ? '35%' : '38% 이상'} 구간 세율이 적용됩니다.` },
    { q: '계산기마다 실수령액이 조금씩 다른 이유는?', a: `비과세 항목·부양가족 기본값과 소득세 계산 방식이 달라서입니다. 이 페이지는 ${YEAR}년 4대보험 요율과 회사가 실제로 쓰는 국세청 근로소득 간이세액표(2026.2.27 개정)로 계산해 급여명세서와 거의 같고, 연간 세금은 연말정산에서 확정됩니다.` },
    { q: `연봉이 ${salaryLabel(man + 300)}으로 오르면 실수령액은 얼마나 늘어나나요?`, a: `월 실수령액이 ${won(r.netMonthly)}에서 ${won(raise.netMonthly)}으로 약 ${won(raise.netMonthly - r.netMonthly)} 늘어납니다. 연봉 인상분 300만원(월 25만원) 중 약 ${(((raise.netMonthly - r.netMonthly) / 250_000) * 100).toFixed(0)}%가 실제 손에 들어옵니다.` },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `연봉 ${salaryLabel(man)} 실수령액 ${YEAR}`,
      url: `${SITE}/salary-table/${man}/`,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: '연봉 실수령액 표', item: `${SITE}/salary-table/` },
          { '@type': 'ListItem', position: 3, name: `연봉 ${salaryLabel(man)}`, item: `${SITE}/salary-table/${man}/` },
        ],
      },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]

  const cell = 'px-3 py-2'

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/" className="hover:text-primary">홈</Link><span className="mx-2">/</span>
            <Link href="/salary-table/" className="hover:text-primary">연봉 실수령액 표</Link><span className="mx-2">/</span>
            <span aria-current="page" className="text-body">연봉 {salaryLabel(man)}</span>
          </nav>

          <header className={`${glassCard} p-6 sm:p-8`}>
            <h1 className="text-2xl sm:text-3xl font-bold text-fg">연봉 {salaryLabel(man)} 실수령액 <span className="text-primary">{YEAR}</span></h1>
            <p className="mt-4 text-sm text-muted">월 실수령액 (부양가족 1인 · 비과세 20만원)</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-fg tracking-tight">{won(r.netMonthly)}</p>
            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><dt className="text-muted">세전 월급</dt><dd className="font-semibold text-fg">{won(monthlyGross)}</dd></div>
              <div><dt className="text-muted">4대보험(월)</dt><dd className="font-semibold text-fg">-{won(insMonthly)}</dd></div>
              <div><dt className="text-muted">세금(월)</dt><dd className="font-semibold text-fg">-{won(taxMonthly)}</dd></div>
              <div><dt className="text-muted">연 실수령액</dt><dd className="font-semibold text-fg">{won(r.netAnnual)}</dd></div>
            </dl>
            {c && COMPARE_YEAR && (
              <p className="mt-4 text-sm text-body">
                {COMPARE_YEAR}년 4대보험 요율 기준 월 실수령액은 <strong className="text-fg">{won(c.netMonthly)}</strong>({YEAR}년 대비 {signedWon(c.netMonthly - r.netMonthly)})입니다.
              </p>
            )}
            <Link href={calcLink(man)} className="mt-6 inline-block ui-btn px-4 py-3">
              내 조건으로 다시 계산 →
            </Link>
          </header>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-4">연봉 {salaryLabel(man)}은 어느 정도일까</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <div>
                <dt className="text-muted">근로소득자 중 위치</dt>
                <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">상위 {top}%</dd>
                <dd className="mt-1 text-sub">국세청 {NTS_SOURCE_YEAR}년 귀속 총급여 분위 기준{milestone ? ` · ${milestone}` : ''}</dd>
              </div>
              <div>
                <dt className="text-muted">평균 총급여 대비</dt>
                <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">{vsAvg}%</dd>
                <dd className="mt-1 text-sub">근로소득자 1인 평균 약 {manwon(NTS_AVG_SALARY)} ({NTS_SOURCE_YEAR}년 귀속)</dd>
              </div>
              <div>
                <dt className="text-muted">시급으로 환산하면</dt>
                <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">{won(hourly)}</dd>
                <dd className="mt-1 text-sub">월 {MONTHLY_HOURS}시간 기준 세전 · {hourly < minWage ? `주 40시간이면 ${YEAR}년 최저임금 ${won(minWage)}에 못 미쳐요(최저 연봉 약 ${manwon(minWage * MONTHLY_HOURS * 12)})` : `${YEAR}년 최저임금 ${won(minWage)}의 ${(hourly / minWage).toFixed(1)}배`} · 실수령 {won(hourlyNet(r.netMonthly))}</dd>
              </div>
              {median1 && <div>
                <dt className="text-muted">1인 가구 기준 중위소득 대비</dt>
                <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">{Math.round((monthlyGross / median1) * 100)}%</dd>
                <dd className="mt-1 text-sub">세전 월급 ÷ {YEAR}년 1인 가구 {won(median1)}. 복지 사업은 가구 소득인정액으로 판단해요</dd>
              </div>}
            </dl>
          </section>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-3">월 공제 내역</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {[
                  ['국민연금', d.nationalPension, pct(INSURANCE.pensionRate)],
                  ['건강보험', d.healthInsurance, pct(INSURANCE.healthRate)],
                  ['장기요양보험', d.longTermCare, `건보료의 ${pct(INSURANCE.longTermCareRate)}`],
                  ['고용보험', d.employmentInsurance, pct(INSURANCE.employmentRate)],
                  ['소득세', d.incomeTax, '국세청 간이세액표(2026.2.27) 기준'],
                  ['지방소득세', d.localIncomeTax, '소득세의 10%'],
                ].map(([name, annual, note]) => (
                  <tr key={name as string}>
                    <th scope="row" className={`${cell} text-left font-medium text-body`}>{name}</th>
                    <td className={`${cell} text-xs text-muted`}>{note}</td>
                    <td className={`${cell} text-right text-fg`}>{won((annual as number) / 12)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <th scope="row" className={`${cell} text-left text-fg`}>공제 합계</th>
                  <td className={`${cell} text-xs text-muted`}>{((d.total / r.gross) * 100).toFixed(1)}%</td>
                  <td className={`${cell} text-right text-fg`}>{won(d.total / 12)}</td>
                </tr>
              </tbody>
            </table>
            {pensionCapped && <p className="mt-3 text-xs text-muted">비과세를 뺀 월급이 국민연금 기준소득월액 상한 {won(INSURANCE.pensionMonthlyCap)}을 넘어, 연봉이 더 올라도 국민연금은 늘지 않아요.</p>}
          </section>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-1">연봉 {salaryLabel(man)}의 연말정산 기준선</h2>
            <p className="text-xs text-muted mb-4">{TAX_YEAR}년 귀속(2027년 1~2월 정산) · 총급여 {won(totalPay)} = 연봉 − 비과세 식대 연 240만원</p>
            <ul className="divide-y divide-line text-sm">
              <li className="py-3"><p className="font-medium text-fg">신용카드 등 소득공제: {won(cardLine)} 넘게 써야 시작</p><p className="mt-1 text-sub">총급여의 25%, 월 평균 {won(cardLine / 12)}. 넘는 부분부터 신용카드 15%·체크카드 30% 공제, 기본 한도 {manwon(cardLimits(totalPay, 0).basic)}</p></li>
              <li className="py-3"><p className="font-medium text-fg">의료비 세액공제: {won(medicalLine)} 넘는 의료비부터</p><p className="mt-1 text-sub">총급여의 3%를 넘는 금액의 15%(난임 30%, 미숙아 20%)</p></li>
              <li className="py-3"><p className="font-medium text-fg">월세 세액공제: {rentRate ? `월세의 ${Math.round(rentRate * 100)}% 돌려받음` : '대상 아님'}</p><p className="mt-1 text-sub">{rentRate ? `연 1,000만원 한도, 무주택 세대주 등 요건. 월세 50만원이면 연 ${won(rentCredit(totalPay, 6_000_000))}` : '총급여 8,000만원을 넘으면 받을 수 없어요'}</p></li>
              <li className="py-3"><p className="font-medium text-fg">연금저축·IRP: 세액공제율 {Math.round(pensionRate(totalPay) * 100)}%</p><p className="mt-1 text-sub">900만원을 채우면 {won(pensionMax)} 공제{taxEstimate < pensionMax ? `. 다만 이 연봉의 예상 결정세액(다른 공제 전 약 ${won(taxEstimate)})을 넘는 공제는 돌려받지 못해요` : ''}</p></li>
            </ul>
            <p className="mt-3 text-xs text-muted">내 카드 사용액·의료비로 환급액을 보려면 <Link href="/year-end-tax/" className="text-primary underline">연말정산 계산기</Link>·<Link href="/card-deduction/" className="text-primary underline">카드 소득공제 계산기</Link></p>
          </section>

          <section className={`${glassCard} p-6 overflow-x-auto`}>
            <h2 className="text-lg font-semibold text-fg mb-1">부양가족·비과세별 월 실수령액</h2>
            <p className="text-xs text-muted mb-3">가족 수는 본인 포함, 자녀는 8~20세 기준(자녀세액공제). 비과세는 월 식대 등.</p>
            <table className="w-full text-sm text-right whitespace-nowrap">
              <thead className="text-xs text-muted border-b border-line">
                <tr>
                  <th scope="col" className={`${cell} text-left`}>가족 구성</th>
                  {NON_TAXABLE.map(nt => <th key={nt} scope="col" className={cell}>비과세 {nt === 0 ? '없음' : manwon(nt)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {FAMILY.map(f => (
                  <tr key={f.label}>
                    <th scope="row" className={`${cell} text-left font-medium text-body`}>{f.label}</th>
                    {NON_TAXABLE.map(nt => {
                      const opt = { dependents: f.dependents, children: f.children, nonTaxableMonthly: nt }
                      const base = f.dependents === BASE.dependents && nt === BASE.nonTaxableMonthly
                      return (
                        <td key={nt} className={`${cell} ${base ? 'font-bold text-sub' : 'text-fg'}`}>
                          <Link href={calcLink(man, opt)} className="hover:underline">{won(net(man, opt).netMonthly)}</Link>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={`${glassCard} p-6 overflow-x-auto`}>
            <h2 className="text-lg font-semibold text-fg mb-3">인근 연봉과 비교</h2>
            <table className="w-full text-sm text-right whitespace-nowrap">
              <thead className="text-xs text-muted border-b border-line">
                <tr>
                  <th scope="col" className={`${cell} text-left`}>연봉</th>
                  <th scope="col" className={cell}>세전 월급</th>
                  <th scope="col" className={cell}>월 실수령액</th>
                  <th scope="col" className={cell}>차이</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {nearby.map(m => {
                  const n = net(m)
                  const isBracket = (BRACKETS as readonly number[]).includes(m)
                  return (
                    <tr key={m} className={m === man ? 'font-bold bg-primary-soft' : ''}>
                      <th scope="row" className={`${cell} text-left`}>
                        <Link href={isBracket ? `/salary-table/${m}/` : calcLink(m)} className="text-sub hover:underline">{salaryLabel(m)}</Link>
                      </th>
                      <td className={`${cell} text-body`}>{won((m * 10_000) / 12)}</td>
                      <td className={`${cell} text-fg`}>{won(n.netMonthly)}</td>
                      <td className={`${cell} ${n.netMonthly >= r.netMonthly ? 'text-primary' : 'text-sub'}`}>
                        {m === man ? '—' : `${n.netMonthly >= r.netMonthly ? '+' : ''}${won(n.netMonthly - r.netMonthly)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-4">자주 묻는 질문</h2>
            <dl className="space-y-4">
              {faq.map(f => (
                <div key={f.q}>
                  <dt className="font-medium text-fg">Q. {f.q}</dt>
                  <dd className="text-sm text-body mt-1 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <nav className="flex flex-wrap justify-between gap-3 text-sm">
            <span>{prev && <Link href={`/salary-table/${prev}/`} className="text-sub hover:underline">← 연봉 {salaryLabel(prev)}</Link>}</span>
            <Link href="/salary-table/" className="text-sub hover:underline">전체 실수령액 표</Link>
            <span>{next && <Link href={`/salary-table/${next}/`} className="text-sub hover:underline">연봉 {salaryLabel(next)} →</Link>}</span>
          </nav>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-3">함께 보는 도구</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                ['/salary-calculator', '연봉 계산기 — 부양가족·비과세·성과급 직접 입력'],
                ['/salary-comparison', '연봉 비교기 — 이직 제안 2~4개 나란히 비교'],
                ['/retirement-calculator', '퇴직금 계산기 — 이 연봉으로 근속 시 퇴직금'],
                ['/bonus-calculator', '성과급 계산기 — 상여금 세후 금액'],
                ['/hourly-wage', '시급 계산기 — 연봉을 시급으로 환산'],
                ['/salary-rank', '내 연봉 상위 몇 %? — 연령·업종별 순위'],
              ].map(([href, text]) => (
                <li key={href}><Link href={href} className="block px-3 py-2 rounded-lg hover:bg-soft text-body">{text}</Link></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
