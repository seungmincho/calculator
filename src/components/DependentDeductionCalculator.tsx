'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dependentDeduction'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { TAX_YEAR } from '@/utils/yearEndTax'
import {
  analyze, ageOk, member, EXAMPLES, INCOMES, RELATIONS, BORN, PENSION_LIMIT, MAX_SPLIT,
  type Member, type Relation, type IncomeKey, type Incomes, type Judged,
} from '@/utils/dependentDeduction'

// 판정·세금은 dependentDeduction.ts → yearEndTax.ts (연말정산 계산기와 같은 함수).
// URL: s 총급여 · ss 배우자 총급여(맞벌이) · fe=1 본인 여성 · sg=1 배우자 없음 · f 가족 목록.
// f = 가족을 '_'로 이음. 한 명 = 관계 코드 + 출생연도 4자리 + 플래그(d 장애인, a 따로 삶, w 배우자가 공제)
//     + '-'로 이은 소득(INCOMES 순서, 0은 빈칸, 끝 빈칸 생략). 예: p1956----5400000_c2015_c2019
const SALARY_PRESETS = [35_000_000, 50_000_000, 80_000_000, 100_000_000]
const MAX = 10_000_000_000
const MAX_FAMILY = 20
const DEF = EXAMPLES.d
const MAIN: IncomeKey[] = ['wage', 'publicPension', 'retirement', 'capitalGains'] // 늘 보이는 칸 (흔한 탈락 이유)
const MORE = INCOMES.filter((k) => !MAIN.includes(k))
const CODE: Record<Relation, string> = { spouse: 's', parent: 'p', child: 'c', grandchild: 'g', sibling: 'b', foster: 'f', recipient: 'r' }
const REL = Object.fromEntries(RELATIONS.map((r) => [CODE[r], r])) as Record<string, Relation>
const YET: [keyof ReturnType<typeof analyze>['mineInput'], string][] = [['children', 'ch'], ['kidsUnder8', 'u8'], ['others', 'ot'], ['elderly', 'el'], ['disabled', 'dis'], ['birth', 'bi']]

const encode = (list: Member[]) => list.map((m) => {
  const inc = INCOMES.map((k) => m.inc[k] || '').join('-').replace(/-+$/, '')
  return `${CODE[m.rel]}${String(m.born).padStart(4, '0').slice(-4)}${m.disabled ? 'd' : ''}${m.apart ? 'a' : ''}${m.spouseClaims ? 'w' : ''}${inc ? `-${inc}` : ''}`
}).join('_')
const decode = (s: string): Member[] => s.split('_').slice(0, MAX_FAMILY).flatMap((x) => {
  const g = /^([spcgbfr])(\d{4})(d?)(a?)(w?)((?:-\d{0,11})*)$/.exec(x)
  if (!g) return []
  const v = g[6].split('-').slice(1)
  const inc = Object.fromEntries(INCOMES.map((k, i) => [k, Number(v[i]) || 0])) as Incomes
  return [{ rel: REL[g[1]], born: Number(g[2]), disabled: !!g[3], apart: !!g[4], spouseClaims: !!g[5], inc }]
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

export default function DependentDeductionCalculator() {
  const t = useTranslations('dependentDeduction')
  const sp = useSearchParams()
  const [salary, setSalary] = useState(DEF.me.salary)
  const [female, setFemale] = useState(false)
  const [single, setSingle] = useState(false)
  const [spouseSalary, setSpouseSalary] = useState(0)
  const [family, setFamily] = useState<Member[]>(DEF.family)

  // URL → 상태 (마운트 후 1회 — 첫 렌더는 기본값으로 정적 HTML과 같게). 키가 없으면 기본값
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL은 마운트 후 1회만 읽는다 (첫 렌더 = 정적 HTML 기본값)
    setSalary(amount(sp.get('s')) ?? DEF.me.salary)
    setSpouseSalary(amount(sp.get('ss')) ?? 0)
    setFemale(sp.get('fe') === '1')
    setSingle(sp.get('sg') === '1')
    const f = sp.get('f')
    if (f !== null) setFamily(decode(f))
  }, [sp])

  useEffect(() => {
    if (!loaded.current) return
    const q = new URLSearchParams({ s: String(salary) })
    if (spouseSalary) q.set('ss', String(spouseSalary))
    if (female) q.set('fe', '1')
    if (single) q.set('sg', '1')
    q.set('f', encode(family))
    // 기본값 그대로면 쿼리를 붙이지 않음 (첫 방문 URL 깔끔하게)
    const isDef = salary === DEF.me.salary && !spouseSalary && !female && !single && encode(family) === encode(DEF.family)
    window.history.replaceState(window.history.state, '', isDef ? window.location.pathname : `?${q}`)
  }, [salary, spouseSalary, female, single, family])

  const r = analyze({ salary, female, single }, family, spouseSalary)
  const dual = spouseSalary > 0
  const W = t('won')
  const update = (i: number, patch: Partial<Member>) => setFamily((f) => f.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const setInc = (i: number, k: IncomeKey, v: number) => setFamily((f) => f.map((m, j) => (j === i ? { ...m, inc: { ...m.inc, [k]: v } } : m)))
  const nameOf = (m: Member) => t('row.name', { rel: t(`rel.${m.rel}`), born: m.born })

  // 판정 이유 문장
  const reasons = (m: Member, j: Judged) => {
    const out: string[] = []
    for (const f of j.fails) {
      if (f === 'age') out.push(t(`fail.age.${m.rel}`, { parent: BORN.parent, young: BORN.young }))
      else if (f === 'apart') out.push(t('fail.apart'))
      else if (f === 'wage') out.push(t('fail.wage', { wage: won(m.inc.wage) }))
      else out.push(t('fail.income', { sources: j.inc.sources.map((k) => t(`income.${k}.short`)).join(', '), total: won(j.inc.total) }))
    }
    if (j.ok) out.push(t('ok'))
    if (m.disabled && !ageOk(m.rel, m.born)) out.push(t('note.noAge'))
    if (j.inc.separated.length) out.push(t('note.separated', { sources: j.inc.separated.map((k) => t(`income.${k}.short`)).join(', ') }))
    if (!j.ok && j.inc.sources.length === 1 && j.inc.sources[0] === 'publicPension') out.push(t('note.pensionLimit', { limit: won(PENSION_LIMIT) }))
    if (!j.ok && j.elderly) out.push(t('note.elderlyLost'))
    return out
  }

  // 연말정산 계산기로 (지금 내가 공제받는 가족 인원)
  const yq = new URLSearchParams({ s: String(salary) })
  if (r.mineInput.spouse) yq.set('sp', '1')
  for (const [k, code] of YET) if (r.mineInput[k]) yq.set(code, String(r.mineInput[k]))
  const fullLink = `/year-end-tax/?${yq}`

  const share = { salary: man(salary), salaryM: mil(salary), n: r.okCount, total: family.length, saving: won(r.saving) }
  const card = {
    tool: t('title'),
    label: t('share.label', share),
    headline: r.saving > 0 ? t('share.headline', share) : t('share.headlineZero'),
    sub: t('share.sub', { basic: won(r.basic), extra: won(r.extra) }),
    rows: family.slice(0, 5).map((m, i) => ({ label: nameOf(m), value: r.rows[i].ok ? t('chip.ok') : t('chip.no') })),
  }
  const c = r.couple
  const moved = (i: number) => !!c && c.best.toSpouse[i] !== c.current.toSpouse[i]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-3 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#dependent-deduction-result" label={t('result.label')} value={`${won(r.saving)}${W}`} />
            <div>
              <MoneyInput id="dd-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SALARY_PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => setSalary(n)} aria-pressed={salary === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${salary === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={female} onChange={(e) => setFemale(e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-medium text-body">{t('me.female')}</span>
              </label>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={single} onChange={(e) => setSingle(e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-medium text-body">{t('me.single')}</span>
              </label>
              <p className="text-xs text-muted">{t('me.hint')}</p>
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('family.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('family.hint', { year: TAX_YEAR })}</p>
            </div>

            {family.length === 0 && <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('family.empty')}</p>}
            {family.map((m, i) => (
              <fieldset key={i} className="rounded-2xl bg-subtle p-4 space-y-4 min-w-0">
                <legend className="sr-only">{nameOf(m)}</legend>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-fg">{t('row.title', { n: i + 1 })}</span>
                  <button type="button" onClick={() => setFamily((f) => f.filter((_, j) => j !== i))} aria-label={t('row.remove', { name: nameOf(m) })}
                    className="ui-btn-soft px-3 py-2 text-sm min-h-[44px]">
                    {t('row.removeShort')}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`dd-${i}-rel`} className="block text-sm font-medium text-body mb-2">{t('row.rel')}</label>
                    <select id={`dd-${i}-rel`} value={m.rel} onChange={(e) => update(i, { rel: e.target.value as Relation })}
                      className="ui-field w-full px-4 py-3" aria-describedby={`dd-${i}-rel-hint`}>
                      {RELATIONS.map((x) => <option key={x} value={x}>{t(`rel.${x}`)}</option>)}
                    </select>
                    <p id={`dd-${i}-rel-hint`} className="text-xs text-muted mt-1.5">{t(`relHint.${m.rel}`)}</p>
                  </div>
                  <div>
                    <label htmlFor={`dd-${i}-born`} className="block text-sm font-medium text-body mb-2">{t('row.born')}</label>
                    <input id={`dd-${i}-born`} type="number" inputMode="numeric" min={1900} max={TAX_YEAR} value={m.born || ''}
                      onChange={(e) => update(i, { born: Math.min(Number(e.target.value) || 0, 9999) })}
                      className="ui-field w-full px-4 py-3 tabular-nums" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6">
                  <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={m.disabled} onChange={(e) => update(i, { disabled: e.target.checked })} className="w-5 h-5 accent-primary" />
                    <span className="text-sm text-body">{t('row.disabled')}</span>
                  </label>
                  {(m.rel === 'sibling' || m.rel === 'recipient') && (
                    <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                      <input type="checkbox" checked={!m.apart} onChange={(e) => update(i, { apart: !e.target.checked })} className="w-5 h-5 accent-primary" />
                      <span className="text-sm text-body">{t('row.together')}</span>
                    </label>
                  )}
                </div>
                {dual && m.rel !== 'spouse' && (
                  <div>
                    <label htmlFor={`dd-${i}-who`} className="block text-sm font-medium text-body mb-2">{t('row.claimer')}</label>
                    <select id={`dd-${i}-who`} value={m.spouseClaims ? 'spouse' : 'me'} onChange={(e) => update(i, { spouseClaims: e.target.value === 'spouse' })}
                      className="ui-field w-full px-4 py-3">
                      <option value="me">{t('who.me')}</option>
                      <option value="spouse">{t('who.spouse')}</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MAIN.map((k) => (
                    <MoneyInput key={k} id={`dd-${i}-${k}`} label={t(`income.${k}.label`)} value={m.inc[k]} unit={W}
                      onChange={(v) => setInc(i, k, v)} hint={t(`income.${k}.hint`, { limit: won(PENSION_LIMIT) })} />
                  ))}
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-body py-3">
                    {t('row.more', { n: MORE.filter((k) => m.inc[k] > 0).length })}
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    {MORE.map((k) => (
                      <MoneyInput key={k} id={`dd-${i}-${k}`} label={t(`income.${k}.label`)} value={m.inc[k]} unit={W}
                        onChange={(v) => setInc(i, k, v)} hint={t(`income.${k}.hint`)} />
                    ))}
                  </div>
                </details>
              </fieldset>
            ))}
            <button type="button" onClick={() => setFamily((f) => [...f, member('child', TAX_YEAR - 5)])} disabled={family.length >= MAX_FAMILY}
              className="ui-btn-soft px-4 py-3 w-full text-sm disabled:opacity-50">
              {t('family.add')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          <div id="dependent-deduction-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">{t('result.sub', { n: r.okCount, total: family.length, basic: won(r.basic), extra: won(r.extra) })}</p>
              {dual && <p className="text-xs text-muted mt-1">{t('result.dualNote')}</p>}
            </div>

            <ul className="space-y-3">
              {family.map((m, i) => {
                const j = r.rows[i]
                return (
                  <li key={i} className="border-t border-line pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-fg">{nameOf(m)}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${j.ok ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`}>
                        {t(j.ok ? 'chip.ok' : 'chip.no')}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-1 text-sm text-sub">
                      {reasons(m, j).map((x) => <li key={x}>{x}</li>)}
                    </ul>
                    {j.ok && (
                      <p className="mt-1.5 text-sm text-body tabular-nums">
                        {t('row.deduction', { extra: j.extra ? t('row.extra', { amount: won(j.extra) }) : '' })}
                        {' · '}{t('row.contrib', { amount: won(r.contrib[i]) })}
                        {dual && m.rel !== 'spouse' && <span className="text-muted"> · {t(m.spouseClaims ? 'who.spouse' : 'who.me')}</span>}
                      </p>
                    )}
                  </li>
                )
              })}
              {r.self.kind && (
                <li className="border-t border-line pt-3 text-sm text-body">{t(`self.${r.self.kind}`, { amount: won(r.self.amount) })}</li>
              )}
            </ul>

            <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('reform')}</p>

            <ShareResult card={card} text={t('share.text', share)} fileName="dependent-deduction" />
            <Link href={fullLink} className="ui-btn px-4 py-3 text-sm inline-block">{t('actions.full')}</Link>
          </div>

          {/* 맞벌이 */}
          <section aria-labelledby="dd-couple" className="ui-card p-6 space-y-5">
            <div>
              <h2 id="dd-couple" className="text-lg font-semibold text-fg">{t('couple.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('couple.desc')}</p>
            </div>
            <MoneyInput id="dd-ss" label={t('couple.spouseSalary')} value={spouseSalary} onChange={setSpouseSalary} unit={W} hint={t('couple.spouseSalaryHint')} />
            <div aria-live="polite">
              {!c && <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('couple.empty')}</p>}
              {c && (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-4 ${c.gain > 0 ? 'bg-primary-soft' : 'bg-subtle'}`}>
                    <p className={`text-lg font-bold tabular-nums ${c.gain > 0 ? 'text-primary' : 'text-fg'}`}>
                      {c.gain > 0 ? t('couple.best', { gain: won(c.gain) }) : t('couple.same')}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {family.map((m, i) => (r.rows[i].ok && m.rel !== 'spouse' ? (
                        <li key={i} className="flex flex-wrap justify-between gap-x-3">
                          <span className="text-body">{nameOf(m)}</span>
                          <span className="font-medium text-fg">
                            {t(c.best.toSpouse[i] ? 'who.spouse' : 'who.me')}
                            {moved(i) && <span className="text-primary"> · {t('couple.moved')}</span>}
                          </span>
                        </li>
                      ) : null))}
                    </ul>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                    <div className="rounded-2xl p-4 bg-subtle">
                      <dt className="text-muted">{t('couple.current')}</dt>
                      <dd className="text-fg font-semibold mt-1">{won(c.before - c.current.total)}{W}</dd>
                    </div>
                    <div className="rounded-2xl p-4 bg-subtle">
                      <dt className="text-muted">{t('couple.recommended')}</dt>
                      <dd className="text-fg font-semibold mt-1">{won(c.before - c.best.total)}{W}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted">{t('couple.note')}</p>
                  {c.capped && <p className="text-xs text-muted">{t('couple.capped', { n: MAX_SPLIT })}</p>}
                </div>
              )}
            </div>
            <p className="rounded-2xl p-4 bg-amber-50 text-amber-800 text-sm">{t('couple.warning')}</p>
          </section>
        </div>
      </div>

      {/* 요건 정리 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="dd-age" className="ui-card p-6 space-y-3">
          <h2 id="dd-age" className="text-lg font-semibold text-fg">{t('rules.ageTitle', { year: TAX_YEAR })}</h2>
          <ul className="space-y-2 text-sm">
            {RELATIONS.map((x) => (
              <li key={x} className="flex flex-wrap justify-between gap-x-3 border-b border-line pb-2">
                <span className="font-medium text-body">{t(`rel.${x}`)}</span>
                <span className="text-sub">{t(`rules.age.${x}`, { parent: BORN.parent, young: BORN.young, elderly: BORN.elderly })}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('rules.ageNote', { elderly: BORN.elderly })}</p>
        </section>
        <section aria-labelledby="dd-income" className="ui-card p-6 space-y-3">
          <h2 id="dd-income" className="text-lg font-semibold text-fg">{t('rules.incomeTitle')}</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
            {(t.raw('rules.income') as string[]).map((x, i) => <li key={i}>{x.replace('{limit}', won(PENSION_LIMIT))}</li>)}
          </ul>
        </section>
      </div>

      <section aria-labelledby="dd-compare" className="ui-card p-6 space-y-3">
        <h2 id="dd-compare" className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
        <p className="text-sm text-sub">{t('compare.desc')}</p>
        <Link href="/dependent-eligibility/" className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
          <span className="block text-sm font-semibold text-fg">{t('compare.link')}</span>
          <span className="block text-xs text-muted mt-1">{t('compare.linkDesc')}</span>
        </Link>
        <p className="text-xs text-muted">{t('source', { year: TAX_YEAR })}</p>
      </section>
    </div>
  )
}
