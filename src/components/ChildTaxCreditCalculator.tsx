'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/childTaxCredit'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { TAX_YEAR } from '@/utils/yearEndTax'
import { analyze, couple, creditOk, basicOk, minAge, bornBy, kid, EXAMPLES, RELATIONS, MAX_KIDS, EXCLUDED_BORN, type Kid, type Relation } from '@/utils/childTaxCredit'

// 판정·세금은 childTaxCredit.ts → yearEndTax.ts (연말정산 계산기와 같은 함수).
// URL: s 총급여 · ss 배우자 총급여(맞벌이) · bi 올해 출산·입양 순서(1~3) · k 자녀 목록.
// k = 자녀를 '_'로 이음. 한 명 = 관계 코드(c 자녀, g 손자녀, f 위탁아동) + 출생연도 4자리 + d(장애인). 예: c2014_c2018
interface State { salary: number; spouseSalary: number; kids: Kid[]; birth: number }
// 기본값 = 페이지 예시 (첫 화면에 결과가 보이게)
const DEF: State = { salary: EXAMPLES.d.salary, spouseSalary: 0, kids: EXAMPLES.d.kids, birth: EXAMPLES.d.birth }
const CODE: Record<Relation, string> = { child: 'c', grandchild: 'g', foster: 'f' }
const REL = Object.fromEntries(RELATIONS.map((r) => [CODE[r], r])) as Record<string, Relation>
const OLDEST = TAX_YEAR - 60
const YEARS = Array.from({ length: TAX_YEAR - OLDEST + 1 }, (_, i) => TAX_YEAR - i)
const GRID = Array.from({ length: 10 }, (_, i) => TAX_YEAR + i) // 자녀별 연도표
const RULE_YEARS = Array.from({ length: 7 }, (_, i) => TAX_YEAR - 1 + i) // 개정 전 1년 + 2026~2031
const SALARY_PRESETS = [30_000_000, 50_000_000, 70_000_000, 100_000_000]
const BIRTHS = [0, 1, 2, 3]
const MAX = 10_000_000_000
const NEXT = { yearEnd: '/year-end-tax/', dependent: '/dependent-deduction/', benefit: '/child-benefit/', education: '/education-tax-credit/' } as const

const encode = (kids: Kid[]) => kids.map((k) => `${CODE[k.rel]}${k.born}${k.disabled ? 'd' : ''}`).join('_')
const decode = (s: string): Kid[] => s.split('_').slice(0, MAX_KIDS).flatMap((x) => {
  const g = /^([cgf])(\d{4})(d?)$/.exec(x)
  const born = g ? Number(g[2]) : 0
  return g && born >= OLDEST && born <= TAX_YEAR ? [{ rel: REL[g[1]], born, disabled: !!g[3] }] : []
})

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

function MoneyInput({ id, label, value, onChange, hint, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

const chip = (ok: boolean) => `shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${ok ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`

export default function ChildTaxCreditCalculator() {
  const t = useTranslations('childTaxCredit')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 키가 없으면 기본값. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo<State>(() => {
    if (!hydrated) return DEF
    const bi = sp.get('bi')
    return {
      salary: amount(sp.get('s')) ?? DEF.salary,
      spouseSalary: amount(sp.get('ss')) ?? 0,
      kids: sp.has('k') ? decode(sp.get('k') ?? '') : DEF.kids,
      birth: bi && /^[0-3]$/.test(bi) ? Number(bi) : DEF.birth,
    }
  }, [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const st = edited ?? fromUrl
  const { salary, spouseSalary, kids, birth } = st

  // 값 → URL. 기본값 그대로면 쿼리를 붙이지 않음
  const update = (patch: Partial<State>) => {
    const next = { ...st, ...patch }
    setEdited(next)
    const q = new URLSearchParams({ s: String(next.salary) })
    if (next.spouseSalary) q.set('ss', String(next.spouseSalary))
    q.set('k', encode(next.kids))
    if (next.birth) q.set('bi', String(next.birth))
    const isDef = next.salary === DEF.salary && !next.spouseSalary && next.birth === DEF.birth && encode(next.kids) === encode(DEF.kids)
    window.history.replaceState(window.history.state, '', isDef ? window.location.pathname : `?${q}`)
  }
  const setKid = (i: number, patch: Partial<Kid>) => update({ kids: kids.map((k, j) => (j === i ? { ...k, ...patch } : k)) })

  const r = analyze(salary, kids, birth)
  const c = spouseSalary > 0 && r.basic > 0 ? couple(salary, spouseSalary, kids, birth) : null
  const W = t('won')
  const nameOf = (k: Kid, i: number) => t('row.name', { n: i + 1, rel: t(`rel.${k.rel}`), born: k.born })
  const remind = birth === 0 && kids.some((k) => k.born === TAX_YEAR)
  const statusText = t(`status.${r.status}`, { credit: won(r.credit), tax: won(r.tax), year: TAX_YEAR })

  const reasonText = (k: Kid, i: number) => {
    const x = r.rows[i]
    return t(`reason.${x.reason}`, { year: TAX_YEAR, age: TAX_YEAR - k.born, from: x.from ?? '', bornBy: bornBy(TAX_YEAR), excluded: EXCLUDED_BORN })
  }
  const spanText = (i: number) => {
    const x = r.rows[i]
    if (x.from === null) return null
    return x.to === null ? t('span.open', { from: x.from }) : t('span.range', { from: x.from, to: x.to, n: x.to - x.from + 1 })
  }

  // 연말정산 계산기로 (NUM_PARAMS 키: ch 자녀, u8 자녀세액공제 제외, bi 출산, dis 장애인)
  const yq = new URLSearchParams({ s: String(salary) })
  const yearEnd: [string, number][] = [['ch', r.basic], ['u8', r.basic - r.eligible], ['bi', birth], ['dis', r.input.disabled ?? 0]]
  for (const [k, v] of yearEnd) if (v) yq.set(k, String(v))
  const fullLink = `/year-end-tax/?${yq}`

  const share = { salary: man(salary), salaryM: mil(salary), n: kids.length, eligible: r.eligible, credit: won(r.credit), saving: won(r.saving) }
  const card = {
    tool: t('title'),
    label: t('share.label', share),
    headline: r.saving > 0 ? t('share.headline', share) : t('share.headlineZero'),
    sub: t('share.sub', share),
    rows: kids.slice(0, 5).map((k, i) => ({ label: nameOf(k, i), value: creditOk(k) ? t('chip.ok') : t('chip.no') })),
  }

  const plans = c ? ([['allMe', c.allMe], ['allSpouse', c.allSpouse], ...(c.split ? [['best', c.best]] : [])] as [string, typeof c.best][]) : []
  const coupleText = !c ? '' : c.gain > 0
    ? t(c.split ? 'couple.split' : 'couple.moveAll', { gain: won(c.gain) })
    : c.allSpouse.total > c.allMe.total ? t('couple.keep', { diff: won(c.allSpouse.total - c.allMe.total) }) : t('couple.same')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR, bornBy: bornBy(TAX_YEAR) })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-2 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#child-tax-credit-result" label={t('result.label')} value={`${won(r.saving)}${W}`} />
            <div>
              <MoneyInput id="ct-salary" label={t('salary')} value={salary} onChange={(n) => update({ salary: n })} unit={W} hint={t('salaryHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SALARY_PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => update({ salary: n })} aria-pressed={salary === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${salary === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('kids.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('kids.hint', { year: TAX_YEAR })}</p>
            </div>

            {kids.length === 0 && <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('kids.empty')}</p>}
            {kids.map((k, i) => (
              <fieldset key={i} className="rounded-2xl bg-subtle p-4 space-y-3 min-w-0">
                <legend className="sr-only">{nameOf(k, i)}</legend>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg">{t('row.title', { n: i + 1 })}</span>
                  <span className={chip(creditOk(k))}>{creditOk(k) ? t('chip.ok') : t('chip.no')}</span>
                  <button
                    type="button" onClick={() => update({ kids: kids.filter((_, j) => j !== i) })} aria-label={t('row.remove', { name: nameOf(k, i) })}
                    className="ui-btn-soft ml-auto px-3 py-2 text-sm min-h-[44px]"
                  >
                    {t('row.removeShort')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label htmlFor={`ct-${i}-born`} className="block text-sm font-medium text-body mb-2">{t('row.born')}</label>
                    <select id={`ct-${i}-born`} value={k.born} onChange={(e) => setKid(i, { born: Number(e.target.value) })} className="ui-field w-full px-3 py-3 tabular-nums">
                      {YEARS.map((y) => <option key={y} value={y}>{t('row.year', { y, age: TAX_YEAR - y })}</option>)}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`ct-${i}-rel`} className="block text-sm font-medium text-body mb-2">{t('row.rel')}</label>
                    <select id={`ct-${i}-rel`} value={k.rel} onChange={(e) => setKid(i, { rel: e.target.value as Relation })} className="ui-field w-full px-3 py-3">
                      {RELATIONS.map((x) => <option key={x} value={x}>{t(`rel.${x}`)}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={k.disabled} onChange={(e) => setKid(i, { disabled: e.target.checked })} className="w-5 h-5 accent-primary" />
                  <span className="text-sm text-body">{t('row.disabled')}</span>
                </label>
              </fieldset>
            ))}
            <button
              type="button" onClick={() => update({ kids: [...kids, kid(TAX_YEAR - 10)] })} disabled={kids.length >= MAX_KIDS}
              aria-label={t('kids.addLabel')} className="ui-btn-soft w-full px-4 py-3 text-sm min-h-[44px] disabled:opacity-50"
            >
              {t('kids.add')}
            </button>

            <fieldset className="border-t border-line pt-5">
              <legend className="sr-only">{t('birth.label', { year: TAX_YEAR })}</legend>
              <p aria-hidden="true" className="text-sm font-medium text-body mb-2">{t('birth.label', { year: TAX_YEAR })}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {BIRTHS.map((b) => (
                  <button
                    key={b} type="button" onClick={() => update({ birth: b })} aria-pressed={birth === b}
                    className={`min-h-[44px] px-2 py-2 rounded-lg text-sm transition-colors ${birth === b ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {(t.raw('birth.options') as string[])[b]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('birth.hint')}</p>
              {remind && <p className="rounded-2xl p-3 bg-subtle text-sm text-sub mt-2">{t('birth.remind', { year: TAX_YEAR })}</p>}
            </fieldset>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-3 min-w-0 space-y-6">
          <div id="child-tax-credit-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
            </div>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('credits.child', { n: r.eligible })}</dt><dd className="tabular-nums text-fg">{won(r.child)}{W}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('credits.birth')}</dt><dd className="tabular-nums text-fg">{won(r.born)}{W}</dd></div>
              <div className="flex justify-between gap-3 border-t border-line pt-1.5"><dt className="font-semibold text-fg">{t('credits.total')}</dt><dd className="tabular-nums font-bold text-primary">{won(r.credit)}{W}</dd></div>
            </dl>
            <p className="text-xs text-muted">{t('credits.rule')}</p>

            {kids.length > 0 && (
              <ul className="space-y-2">
                {kids.map((k, i) => (
                  <li key={i} className="rounded-2xl bg-subtle p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-fg">{nameOf(k, i)}</span>
                      <span className={chip(creditOk(k))}>{creditOk(k) ? t('chip.ok') : t('chip.no')}</span>
                    </div>
                    <p className="text-sm text-sub">{reasonText(k, i)}</p>
                    {spanText(i) && <p className="text-xs text-muted">{spanText(i)}</p>}
                    {k.rel !== 'child' && <p className="text-xs text-muted">{t(`relNote.${k.rel}`)}</p>}
                  </li>
                ))}
              </ul>
            )}
            {r.basic > 0 && <p className="text-xs text-muted">{t('basicNote', { n: r.basic, amount: won(r.basic * 1_500_000) })}</p>}

            <ShareResult card={card} text={t('share.text', share)} fileName="child-tax-credit" />
            <div className="space-y-2">
              <Link href={fullLink} className="ui-btn inline-block px-4 py-3 text-sm">{t('actions.full')}</Link>
              <p className="text-xs text-muted">{t('actions.fullNote')}</p>
            </div>
          </div>

          {/* 맞벌이: 누구 앞으로 */}
          <section aria-labelledby="ct-couple" className="ui-card p-6 space-y-4">
            <div>
              <h2 id="ct-couple" className="text-lg font-semibold text-fg">{t('couple.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('couple.desc')}</p>
            </div>
            <MoneyInput id="ct-spouse" label={t('couple.spouse')} value={spouseSalary} onChange={(n) => update({ spouseSalary: n })} unit={W} hint={t('couple.hint')} />
            <div aria-live="polite" className="space-y-3">
              {!c ? (
                <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{spouseSalary ? t('couple.noKids') : t('couple.empty')}</p>
              ) : (
                <>
                  <p className="rounded-2xl p-4 bg-subtle text-sm text-body">{coupleText}</p>
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <caption className="sr-only">{t('couple.caption')}</caption>
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th scope="col" className="text-left font-medium py-2 pr-2">{t('couple.cols.plan')}</th>
                          <th scope="col" className="text-right font-medium py-2 px-2">{t('couple.cols.me')}</th>
                          <th scope="col" className="text-right font-medium py-2 px-2">{t('couple.cols.spouse')}</th>
                          <th scope="col" className="text-right font-medium py-2 pl-2">{t('couple.cols.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map(([key, p]) => {
                          const best = p === c.best
                          return (
                            <tr key={key} className={`border-b border-line ${best ? 'bg-primary-soft' : ''}`}>
                              <th scope="row" className={`text-left font-medium py-3 pr-2 ${best ? 'text-primary' : 'text-body'}`}>
                                {t(`couple.plans.${key}`)}{best && <span className="ml-1 text-xs">{t('couple.bestTag')}</span>}
                              </th>
                              <td className="text-right py-3 px-2 text-sub">{won(p.me)}</td>
                              <td className="text-right py-3 px-2 text-sub">{won(p.spouse)}</td>
                              <td className={`text-right py-3 pl-2 ${best ? 'text-fg font-semibold' : 'text-sub'}`}>{won(p.total)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {kids.map((k, i) => basicOk(k) && (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-sub">{nameOf(k, i)}</span>
                        <span className="font-medium text-fg">{c.best.toSpouse[i] ? t('couple.toSpouse') : t('couple.toMe')}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted">{t('couple.note')}</p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 자녀별 연도표 + 귀속연도별 규칙 */}
      <section aria-labelledby="ct-years" className="ui-card p-6 space-y-5">
        <div>
          <h2 id="ct-years" className="text-lg font-semibold text-fg">{t('years.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('years.desc')}</p>
        </div>
        {kids.length > 0 && (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">{t('years.title')}</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="text-left font-medium py-2 pr-2">{t('years.kid')}</th>
                  {GRID.map((y) => <th key={y} scope="col" className="font-medium py-2 px-1 text-xs">{y}</th>)}
                </tr>
              </thead>
              <tbody>
                {kids.map((k, i) => (
                  <tr key={i}>
                    <th scope="row" className="text-left font-medium py-1.5 pr-2 text-body whitespace-nowrap">{nameOf(k, i)}</th>
                    {GRID.map((y) => {
                      const ok = creditOk(k, y)
                      return (
                        <td key={y} className="py-1.5 px-1">
                          <div className={`h-6 min-w-[28px] rounded-md ${ok ? 'bg-primary' : 'bg-track'}`} />
                          <span className="sr-only">{`${y} ${ok ? t('chip.ok') : t('chip.no')}`}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="text-left text-sm font-semibold text-fg pb-2">{t('rules.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 pr-2">{t('rules.year')}</th>
                <th scope="col" className="text-left font-medium py-2 px-2">{t('rules.age')}</th>
                <th scope="col" className="text-left font-medium py-2 px-2">{t('rules.born')}</th>
                <th scope="col" className="text-left font-medium py-2 pl-2">{t('rules.basic')}</th>
              </tr>
            </thead>
            <tbody>
              {RULE_YEARS.map((y) => (
                <tr key={y} className={`border-b border-line ${y === TAX_YEAR ? 'bg-primary-soft' : ''}`}>
                  <th scope="row" className={`text-left font-medium py-3 pr-2 tabular-nums ${y === TAX_YEAR ? 'text-primary' : 'text-body'}`}>{t('rules.yearCell', { y })}</th>
                  <td className="py-3 px-2 text-sub">{t('rules.ageCell', { age: minAge(y) })}</td>
                  <td className="py-3 px-2 text-fg">{t(y >= 2026 && minAge(y) < 13 ? 'rules.bornCellEx' : 'rules.bornCell', { b: bornBy(y), excluded: EXCLUDED_BORN })}</td>
                  <td className="py-3 pl-2 text-sub">{t('rules.basicCell', { b: y - 20 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">{t('rules.note')}</p>
      </section>

      <section aria-labelledby="ct-tips" className="ui-card p-6 space-y-3">
        <h2 id="ct-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section aria-labelledby="ct-next" className="ui-card p-6 space-y-3">
        <h2 id="ct-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(NEXT) as (keyof typeof NEXT)[]).map((k) => (
            <li key={k}>
              <Link href={NEXT[k]} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('source', { year: TAX_YEAR })}</p>
      </section>
    </div>
  )
}
