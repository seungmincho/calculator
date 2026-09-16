import { Metadata } from 'next'
import Link from 'next/link'
import { glassCard } from '@/lib/glass'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import RelatedTools from '@/components/RelatedTools'
import { BASE, BRACKETS, SITE, TABLE_ROWS, YEAR, calcLink, manwon, net, salaryLabel, won } from './lib'

const TITLE = `연봉 실수령액 표 ${YEAR} - 2천만~2억 월 실수령액 한눈에 | 툴허브`
const DESC = `${YEAR}년 4대보험·소득세 기준 연봉 2,000만~2억 구간별 월 실수령액 표. 국민연금 ${pct(INSURANCE.pensionRate)}·건강보험 ${pct(INSURANCE.healthRate)} 반영, 부양가족·비과세 조건별 계산기 바로가기.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '연봉 실수령액 표, 연봉별 실수령액, 2026 실수령액 표, 월급 실수령액, 연봉 3000 실수령액, 연봉 4000 실수령액, 연봉 5000 실수령액, 연봉 6000 실수령액, 연봉 1억 실수령액',
  openGraph: { title: TITLE, description: DESC, url: `${SITE}/salary-table`, siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
  alternates: { canonical: `${SITE}/salary-table` },
}

const FAQ = [
  { q: '이 표의 계산 기준은 무엇인가요?', a: `부양가족 1인(본인), 월 비과세 식대 20만원, ${YEAR}년 4대보험 요율(국민연금 ${pct(INSURANCE.pensionRate)}, 건강보험 ${pct(INSURANCE.healthRate)}, 장기요양 건강보험료의 ${pct(INSURANCE.longTermCareRate)}, 고용보험 ${pct(INSURANCE.employmentRate)})과 소득세 누진세율·근로소득세액공제를 적용했습니다. 부양가족이 늘면 실수령액은 표보다 많아집니다.` },
  { q: '회사에서 받는 월급과 왜 조금 다른가요?', a: '회사는 간이세액표로 원천징수하고 연말정산에서 정산하기 때문에 월별 금액은 다를 수 있습니다. 이 표는 연간 세액을 12로 나눈 평균값이라 연말정산 후 실제 연 실수령액에 가깝습니다. 비과세 항목(식대·자가운전보조금 등)이 많거나 성과급이 별도면 차이가 커집니다.' },
  { q: '연봉이 오르면 실수령액도 같은 비율로 오르나요?', a: '아닙니다. 소득세가 누진세율(6~45%)이라 연봉이 높을수록 공제율이 올라갑니다. 연봉 3,000만원은 약 10%, 5,000만원은 약 16%, 1억원은 약 25%가 공제됩니다. 국민연금은 월 소득 659만원(연 7,908만원)까지만 부과되어 그 이상은 공제율 증가가 완만해집니다.' },
  { q: '월급(세전)으로 검색하려면 어떻게 하나요?', a: '세전 월급에 12를 곱한 연봉 행을 보면 됩니다. 예: 세전 월급 300만원 = 연봉 3,600만원. 상여금이 별도면 연봉 계산기에 연 총액을 입력하세요.' },
]

export default function SalaryTablePage() {
  const rows = TABLE_ROWS.map(man => ({ man, r: net(man) }))
  const bracketSet = new Set<number>(BRACKETS)

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `연봉 실수령액 표 ${YEAR}`,
      description: DESC,
      url: `${SITE}/salary-table/`,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: SITE },
          { '@type': 'ListItem', position: 2, name: '금융·생활 계산기', item: `${SITE}/calculators/` },
          { '@type': 'ListItem', position: 3, name: '연봉 실수령액 표', item: `${SITE}/salary-table/` },
        ],
      },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">연봉 실수령액 표 <span className="text-blue-600 dark:text-blue-400">{YEAR}</span></h1>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl">
              연봉 2,000만원부터 2억원까지 구간별 월 실수령액입니다. {YEAR}년 4대보험 요율과 소득세 누진세율, 근로소득세액공제를 반영했으며
              기준은 <strong>부양가족 1인(본인)·월 비과세 20만원</strong>입니다. 연봉을 클릭하면 부양가족·비과세를 바꿔 다시 계산할 수 있습니다.
            </p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {BRACKETS.map(b => (
                <li key={b}>
                  <Link href={`/salary-table/${b}/`} className={`${glassCard} inline-block px-3 py-1 text-gray-800 dark:text-gray-100 hover:bg-white/80 dark:hover:bg-white/[0.14]`}>연봉 {salaryLabel(b)}</Link>
                </li>
              ))}
            </ul>
          </header>

          <div className={`${glassCard} overflow-x-auto`}>
            <table className="w-full text-sm text-right whitespace-nowrap">
              <caption className="sr-only">{YEAR}년 연봉별 월 실수령액 표 (부양가족 1인, 비과세 20만원)</caption>
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-black/10 dark:border-white/10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">연봉</th>
                  <th scope="col" className="px-4 py-3">월 실수령액</th>
                  <th scope="col" className="px-4 py-3">연 실수령액</th>
                  <th scope="col" className="px-4 py-3">4대보험(월)</th>
                  <th scope="col" className="px-4 py-3">세금(월)</th>
                  <th scope="col" className="px-4 py-3">공제율</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ man, r }) => {
                  const ins = (r.deductions.nationalPension + r.deductions.healthInsurance + r.deductions.longTermCare + r.deductions.employmentInsurance) / 12
                  const tax = (r.deductions.incomeTax + r.deductions.localIncomeTax) / 12
                  const hot = bracketSet.has(man)
                  return (
                    <tr key={man} className={`border-b border-black/5 dark:border-white/5 ${hot ? 'bg-blue-500/10 font-semibold' : man % 1000 === 0 ? 'bg-black/[0.02] dark:bg-white/[0.03]' : ''}`}>
                      <th scope="row" className="px-4 py-2 text-left font-medium">
                        <Link href={hot ? `/salary-table/${man}/` : calcLink(man)} className="text-blue-700 dark:text-blue-300 hover:underline">{salaryLabel(man)}</Link>
                      </th>
                      <td className="px-4 py-2 text-gray-900 dark:text-white font-semibold">{won(r.netMonthly)}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{won(r.netAnnual)}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{won(ins)}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{won(tax)}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{((r.deductions.total / r.gross) * 100).toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <section className={`${glassCard} p-6 space-y-3`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">계산 기준 ({YEAR}년)</h2>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 list-disc pl-5">
              <li>국민연금 {pct(INSURANCE.pensionRate)} (기준소득월액 상한 {manwon(INSURANCE.pensionMonthlyCap)}) · 건강보험 {pct(INSURANCE.healthRate)} · 장기요양 건강보험료의 {pct(INSURANCE.longTermCareRate)} · 고용보험 {pct(INSURANCE.employmentRate)}</li>
              <li>소득세: 근로소득공제 → 인적공제(1인 150만원) → 누진세율 6~45% → 근로소득세액공제(총급여별 한도) → 지방소득세 10%</li>
              <li>비과세 식대 월 {won(BASE.nonTaxableMonthly)} 제외 후 보험료·세금 산정. 연말정산 특별공제(보험료·의료비·카드 등)는 미반영</li>
              <li>표의 월 금액은 연간 합계 ÷ 12. 실제 급여명세서의 원천징수액과는 차이가 있을 수 있음</li>
            </ul>
          </section>

          <section className={`${glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">자주 묻는 질문</h2>
            <dl className="space-y-4">
              {FAQ.map(f => (
                <div key={f.q}>
                  <dt className="font-medium text-gray-900 dark:text-white">Q. {f.q}</dt>
                  <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <RelatedTools />
        </div>
      </div>
    </>
  )
}
