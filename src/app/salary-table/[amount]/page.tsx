import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { glassCard } from '@/lib/glass'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { BASE, BRACKETS, SITE, YEAR, calcLink, manwon, net, salaryLabel, won } from '../lib'

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
  const description = `연봉 ${salaryLabel(man)}의 ${YEAR}년 월 실수령액은 약 ${won(r.netMonthly)} (세전 월급 ${won(man * 10000 / 12)}). 4대보험 ${won((r.deductions.total - r.deductions.incomeTax - r.deductions.localIncomeTax) / 12)}, 세금 ${won((r.deductions.incomeTax + r.deductions.localIncomeTax) / 12)} 공제. 부양가족·비과세별 실수령액 표 포함.`
  const url = `${SITE}/salary-table/${man}/`
  return {
    title,
    description,
    keywords: `연봉 ${man} 실수령액, 연봉 ${salaryLabel(man)} 실수령액, 연봉 ${man}만원 월급, 연봉 ${man} 세후, ${YEAR} 실수령액`,
    openGraph: { title, description, url, siteName: '툴허브', locale: 'ko_KR', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
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
  const monthlyGross = (man * 10_000) / 12
  const insMonthly = (d.nationalPension + d.healthInsurance + d.longTermCare + d.employmentInsurance) / 12
  const taxMonthly = (d.incomeTax + d.localIncomeTax) / 12
  const idx = BRACKETS.indexOf(man as (typeof BRACKETS)[number])
  const prev = idx > 0 ? BRACKETS[idx - 1] : null
  const next = idx < BRACKETS.length - 1 ? BRACKETS[idx + 1] : null
  const nearby = [-500, -300, -100, 0, 100, 300, 500].map(delta => man + delta).filter(m => m >= 1000)
  const raise = net(man + 300)

  const faq = [
    { q: `연봉 ${salaryLabel(man)}의 세전 월급은 얼마인가요?`, a: `연봉을 12로 나눈 ${won(monthlyGross)}입니다. 여기서 4대보험 ${won(insMonthly)}과 소득세·지방소득세 ${won(taxMonthly)}을 빼면 월 실수령액 ${won(r.netMonthly)}이 됩니다 (부양가족 1인, 비과세 20만원 기준).` },
    { q: `연봉 ${salaryLabel(man)}은 공제율이 몇 %인가요?`, a: `총 공제율은 ${((d.total / r.gross) * 100).toFixed(1)}%입니다. 4대보험이 ${((insMonthly * 12 / r.gross) * 100).toFixed(1)}%, 세금이 ${((taxMonthly * 12 / r.gross) * 100).toFixed(1)}%이며, 과세표준 ${won(r.taxInfo.taxableIncome)}에 ${r.taxInfo.taxableIncome <= 14_000_000 ? '6%' : r.taxInfo.taxableIncome <= 50_000_000 ? '15%' : r.taxInfo.taxableIncome <= 88_000_000 ? '24%' : r.taxInfo.taxableIncome <= 150_000_000 ? '35%' : '38% 이상'} 구간 세율이 적용됩니다.` },
    { q: '계산기마다 실수령액이 조금씩 다른 이유는?', a: `비과세 항목·부양가족 기본값과 세액공제 반영 방식이 달라서입니다. 이 페이지는 ${YEAR}년 요율로 근로소득세액공제까지 반영한 연간 세액을 12로 나눈 값이며, 회사 급여명세서는 간이세액표 원천징수액이라 월별로는 다르고 연말정산에서 맞춰집니다.` },
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
          { '@type': 'ListItem', position: 1, name: '홈', item: SITE },
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-blue-600">홈</Link><span className="mx-2">/</span>
            <Link href="/salary-table/" className="hover:text-blue-600">연봉 실수령액 표</Link><span className="mx-2">/</span>
            <span aria-current="page" className="text-gray-700 dark:text-gray-200">연봉 {salaryLabel(man)}</span>
          </nav>

          <header className={`${glassCard} p-6 sm:p-8`}>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">연봉 {salaryLabel(man)} 실수령액 <span className="text-blue-600 dark:text-blue-400">{YEAR}</span></h1>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">월 실수령액 (부양가족 1인 · 비과세 20만원)</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">{won(r.netMonthly)}</p>
            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><dt className="text-gray-500 dark:text-gray-400">세전 월급</dt><dd className="font-semibold text-gray-900 dark:text-white">{won(monthlyGross)}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">4대보험(월)</dt><dd className="font-semibold text-gray-900 dark:text-white">-{won(insMonthly)}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">세금(월)</dt><dd className="font-semibold text-gray-900 dark:text-white">-{won(taxMonthly)}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">연 실수령액</dt><dd className="font-semibold text-gray-900 dark:text-white">{won(r.netAnnual)}</dd></div>
            </dl>
            <Link href={calcLink(man)} className="mt-6 inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700">
              내 조건으로 다시 계산 →
            </Link>
          </header>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">월 공제 내역</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {[
                  ['국민연금', d.nationalPension, pct(INSURANCE.pensionRate)],
                  ['건강보험', d.healthInsurance, pct(INSURANCE.healthRate)],
                  ['장기요양보험', d.longTermCare, `건보료의 ${pct(INSURANCE.longTermCareRate)}`],
                  ['고용보험', d.employmentInsurance, pct(INSURANCE.employmentRate)],
                  ['소득세', d.incomeTax, `세액공제 ${won(r.taxInfo.taxCredit)} 반영`],
                  ['지방소득세', d.localIncomeTax, '소득세의 10%'],
                ].map(([name, annual, note]) => (
                  <tr key={name as string}>
                    <th scope="row" className={`${cell} text-left font-medium text-gray-700 dark:text-gray-300`}>{name}</th>
                    <td className={`${cell} text-xs text-gray-500 dark:text-gray-400`}>{note}</td>
                    <td className={`${cell} text-right text-gray-900 dark:text-white`}>{won((annual as number) / 12)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <th scope="row" className={`${cell} text-left text-gray-900 dark:text-white`}>공제 합계</th>
                  <td className={`${cell} text-xs text-gray-500 dark:text-gray-400`}>{((d.total / r.gross) * 100).toFixed(1)}%</td>
                  <td className={`${cell} text-right text-gray-900 dark:text-white`}>{won(d.total / 12)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={`${glassCard} p-6 overflow-x-auto`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">부양가족·비과세별 월 실수령액</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">가족 수는 본인 포함, 자녀는 8~20세 기준(자녀세액공제). 비과세는 월 식대 등.</p>
            <table className="w-full text-sm text-right whitespace-nowrap">
              <thead className="text-xs text-gray-500 dark:text-gray-400 border-b border-black/10 dark:border-white/10">
                <tr>
                  <th scope="col" className={`${cell} text-left`}>가족 구성</th>
                  {NON_TAXABLE.map(nt => <th key={nt} scope="col" className={cell}>비과세 {nt === 0 ? '없음' : manwon(nt)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {FAMILY.map(f => (
                  <tr key={f.label}>
                    <th scope="row" className={`${cell} text-left font-medium text-gray-700 dark:text-gray-300`}>{f.label}</th>
                    {NON_TAXABLE.map(nt => {
                      const opt = { dependents: f.dependents, children: f.children, nonTaxableMonthly: nt }
                      const base = f.dependents === BASE.dependents && nt === BASE.nonTaxableMonthly
                      return (
                        <td key={nt} className={`${cell} ${base ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">인근 연봉과 비교</h2>
            <table className="w-full text-sm text-right whitespace-nowrap">
              <thead className="text-xs text-gray-500 dark:text-gray-400 border-b border-black/10 dark:border-white/10">
                <tr>
                  <th scope="col" className={`${cell} text-left`}>연봉</th>
                  <th scope="col" className={cell}>세전 월급</th>
                  <th scope="col" className={cell}>월 실수령액</th>
                  <th scope="col" className={cell}>차이</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {nearby.map(m => {
                  const n = net(m)
                  const isBracket = (BRACKETS as readonly number[]).includes(m)
                  return (
                    <tr key={m} className={m === man ? 'font-bold bg-blue-500/10' : ''}>
                      <th scope="row" className={`${cell} text-left`}>
                        <Link href={isBracket ? `/salary-table/${m}/` : calcLink(m)} className="text-blue-700 dark:text-blue-300 hover:underline">{salaryLabel(m)}</Link>
                      </th>
                      <td className={`${cell} text-gray-700 dark:text-gray-300`}>{won((m * 10_000) / 12)}</td>
                      <td className={`${cell} text-gray-900 dark:text-white`}>{won(n.netMonthly)}</td>
                      <td className={`${cell} ${n.netMonthly >= r.netMonthly ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {m === man ? '—' : `${n.netMonthly >= r.netMonthly ? '+' : ''}${won(n.netMonthly - r.netMonthly)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">자주 묻는 질문</h2>
            <dl className="space-y-4">
              {faq.map(f => (
                <div key={f.q}>
                  <dt className="font-medium text-gray-900 dark:text-white">Q. {f.q}</dt>
                  <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <nav className="flex flex-wrap justify-between gap-3 text-sm">
            <span>{prev && <Link href={`/salary-table/${prev}/`} className="text-blue-700 dark:text-blue-300 hover:underline">← 연봉 {salaryLabel(prev)}</Link>}</span>
            <Link href="/salary-table/" className="text-gray-600 dark:text-gray-300 hover:underline">전체 실수령액 표</Link>
            <span>{next && <Link href={`/salary-table/${next}/`} className="text-blue-700 dark:text-blue-300 hover:underline">연봉 {salaryLabel(next)} →</Link>}</span>
          </nav>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">함께 보는 도구</h2>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                ['/salary-calculator', '💰 연봉 계산기 — 부양가족·비과세·성과급 직접 입력'],
                ['/salary-comparison', '⚖️ 연봉 비교기 — 이직 제안 2~4개 나란히 비교'],
                ['/severance-pay', '🏦 퇴직금 계산기 — 이 연봉으로 근속 시 퇴직금'],
                ['/bonus-calculator', '🎯 성과급 계산기 — 상여금 세후 금액'],
                ['/hourly-wage', '⏱️ 시급 계산기 — 연봉을 시급으로 환산'],
                ['/salary-rank', '📊 내 연봉 상위 몇 %? — 연령·업종별 순위'],
              ].map(([href, text]) => (
                <li key={href}><Link href={href} className="block px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/[0.08] text-gray-800 dark:text-gray-100">{text}</Link></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
