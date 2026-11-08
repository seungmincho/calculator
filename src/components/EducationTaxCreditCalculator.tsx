'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/educationTaxCredit'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { TAX_YEAR } from '@/utils/yearEndTax'
import { analyze, hubAmounts, ITEMS, KINDS, EXAMPLES, type Item, type Kind, type Person } from '@/utils/educationTaxCredit'

// 계산은 educationTaxCredit.ts → yearEndTax.ts (연말정산 계산기와 같은 함수).
// URL: s 총급여, f 가족 행 '구분.금액.금액…'(금액 순서 = ITEMS[구분])을 '_'로 이음. f가 없으면 /year-end-tax 키 es·esc·eu도 받는다.
const SALARY_PRESETS = [35_000_000, 50_000_000, 80_000_000, 100_000_000]
// 기본값 = 페이지 예시와 같은 값 (첫 화면에 결과가 보이게)
const DEF = { salary: EXAMPLES.d.salary, people: EXAMPLES.d.people }
const MAX = 10_000_000_000
const MAX_ROWS = 10
const NEXT = { yearEnd: '/year-end-tax/', dependent: '/dependent-deduction/', card: '/card-deduction/', medical: '/medical-tax-credit/' } as const

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null | undefined) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

const encode = (people: Person[]) => people.map((p) => [p.kind, ...ITEMS[p.kind].map((k) => p.a[k] ?? 0)].join('.')).join('_')
const decode = (f: string): Person[] => f.split('_').slice(0, MAX_ROWS).flatMap((row) => {
  const [kind, ...vals] = row.split('.')
  if (!(KINDS as readonly string[]).includes(kind)) return []
  const k = kind as Kind
  return [{ kind: k, a: Object.fromEntries(ITEMS[k].map((it, i) => [it, amount(vals[i]) ?? 0])) }]
})

function MoneyInput({ id, label, value, onChange, hint, unit, small }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string; small?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className={`block font-medium text-body mb-2 ${small ? 'text-xs' : 'text-sm'}`}>{label}</label>
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

export default function EducationTaxCreditCalculator() {
  const t = useTranslations('educationTaxCredit')
  const sp = useSearchParams()
  const [salary, setSalary] = useState(DEF.salary)
  const [people, setPeople] = useState<Person[]>(DEF.people)

  // URL → 상태 (마운트 후 1회 — 첫 렌더는 기본값으로 정적 HTML과 같게)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL은 마운트 후 1회만 읽는다 (첫 렌더 = 정적 HTML 기본값)
    setSalary(amount(sp.get('s')) ?? DEF.salary)
    if (sp.has('f')) setPeople(decode(sp.get('f') ?? ''))
    else if (['es', 'esc', 'eu'].some((k) => sp.has(k))) {
      // 연말정산 계산기에서 온 합계: 본인 → 본인 행, 초중고 → 초중고 자녀 1명, 대학생 → 대학생 1명
      const hub: Person[] = []
      const es = amount(sp.get('es')), esc = amount(sp.get('esc')), eu = amount(sp.get('eu'))
      if (es) hub.push({ kind: 'self', a: { grad: es } })
      if (esc) hub.push({ kind: 'school', a: { school: esc } })
      if (eu) hub.push({ kind: 'univ', a: { tuition: eu } })
      setPeople(hub)
    }
  }, [sp])

  useEffect(() => {
    if (!loaded.current) return
    // f는 비어 있어도 넣음 — f가 없으면 받는 쪽이 예시 교육비로 계산
    // 기본값 그대로면 쿼리를 붙이지 않음 (첫 방문 URL 깔끔하게)
    const isDef = salary === DEF.salary && encode(people) === encode(DEF.people)
    const q = new URLSearchParams({ s: String(salary), f: encode(people) })
    window.history.replaceState(window.history.state, '', isDef ? window.location.pathname : `?${q}`)
  }, [salary, people])

  const r = analyze(salary, people)
  const W = t('won')
  const setItem = (i: number, k: Item, v: number) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, a: { ...p.a, [k]: v } } : p)))
  const setKind = (i: number, kind: Kind) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, kind } : p)))
  const kindName = (k: Kind) => t(`kinds.${k}.label`)

  const hub = hubAmounts(people)
  const fullLink = `/year-end-tax/?${new URLSearchParams(Object.entries({ s: salary, ...hub }).filter(([, v]) => v).map(([k, v]) => [k, String(v)]))}`

  const statusText = t(`status.${r.status}`, { credit: won(r.credit), saving: won(r.saving) })
  const shareArgs = { salary: man(salary), salaryM: mil(salary), spent: man(r.spent), spentM: mil(r.spent), credit: won(r.credit), saving: won(r.saving) }
  const card = {
    tool: t('title'),
    label: t('share.label', shareArgs),
    headline: r.saving > 0 ? t('share.headline', shareArgs) : t('share.headlineZero'),
    sub: t('share.sub', shareArgs),
    rows: [
      { label: t('rows.spent'), value: `${won(r.spent)}${W}` },
      { label: t('rows.eligible'), value: `${won(r.eligible)}${W}` },
      { label: t('rows.credit'), value: `${won(r.credit)}${W}` },
      { label: t('rows.saving'), value: `${won(r.saving)}${W}` },
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#education-tax-credit-result" label={t('result.label')} value={`${won(r.saving)}${W}`} />
            <div>
              <MoneyInput id="et-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
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

            <div className="border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('family.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('family.hint', { year: TAX_YEAR })}</p>
            </div>

            {people.map((p, i) => (
              <fieldset key={i} className="rounded-2xl border border-line p-4 space-y-4">
                <legend className="sr-only">{t('person.legend', { n: i + 1, kind: kindName(p.kind) })}</legend>
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`et-${i}-kind`} className="block text-sm font-medium text-body mb-2">{t('person.kind', { n: i + 1 })}</label>
                    <select id={`et-${i}-kind`} value={p.kind} onChange={(e) => setKind(i, e.target.value as Kind)} className="ui-field w-full px-4 py-3" aria-describedby={`et-${i}-kind-hint`}>
                      {KINDS.map((k) => <option key={k} value={k}>{kindName(k)}</option>)}
                    </select>
                  </div>
                  <button
                    type="button" onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))}
                    aria-label={t('person.remove', { n: i + 1, kind: kindName(p.kind) })}
                    className="ui-btn-soft px-4 py-3 text-sm min-h-[44px]"
                  >
                    {t('person.removeShort')}
                  </button>
                </div>
                <p id={`et-${i}-kind-hint`} className="text-xs text-muted">{t(`kinds.${p.kind}.hint`, { year: TAX_YEAR, birth: TAX_YEAR - 8 })}</p>
                {ITEMS[p.kind].map((k) => (
                  <MoneyInput
                    key={k} id={`et-${i}-${k}`} small label={t(`fields.${k}.label`)} hint={t(`fields.${k}.hint`)} unit={W}
                    value={p.a[k] ?? 0} onChange={(v) => setItem(i, k, v)}
                  />
                ))}
              </fieldset>
            ))}

            {people.length < MAX_ROWS ? (
              <button
                type="button" onClick={() => setPeople((ps) => [...ps, { kind: 'school', a: {} }])}
                aria-label={t('person.addAria')} className="ui-btn-soft w-full px-4 py-3 text-sm min-h-[44px]"
              >
                {t('person.add')}
              </button>
            ) : (
              <p className="text-xs text-muted">{t('person.max', { n: MAX_ROWS })}</p>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="education-tax-credit-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
            </div>

            {r.rows.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-fg">{t('people.title')}</h2>
                <ul className="space-y-4">
                  {r.rows.map((x, i) => {
                    const capped = Number.isFinite(x.cap)
                    return (
                      <li key={i}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <span className="font-medium text-body">{t('people.name', { n: i + 1, kind: kindName(x.kind) })}</span>
                          <span className="text-muted tabular-nums">
                            {capped
                              ? t('people.of', { eligible: man(x.eligible), cap: man(x.cap), eligibleM: mil(x.eligible), capM: mil(x.cap) })
                              : t('people.noCap', { eligible: man(x.eligible), eligibleM: mil(x.eligible) })}
                          </span>
                        </div>
                        {capped && (
                          <div className="mt-2 h-3 rounded-full bg-track overflow-hidden" aria-hidden="true">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (x.eligible / x.cap) * 100)}%` }} />
                          </div>
                        )}
                        {x.over > 0 && <p className="text-sm text-sub mt-2">{t('people.over', { over: won(x.over) })}</p>}
                        {capped && x.room > 0 && (
                          <p className="text-sm text-sub mt-1">
                            {x.more > 0 ? t('people.room', { room: won(x.room), more: won(x.more) }) : t('people.roomZero', { room: won(x.room) })}
                          </p>
                        )}
                        {capped && x.room === 0 && x.over === 0 && <p className="text-sm text-sub mt-1">{t('people.full')}</p>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {([['spent', r.spent], ['eligible', r.eligible], ['credit', r.credit], ['saving', r.saving]] as const).map(([k, v]) => (
                <div key={k} className="rounded-2xl p-4 bg-subtle">
                  <dt className="text-muted">{t(`rows.${k}`)}</dt>
                  <dd className="text-lg font-semibold text-fg tabular-nums mt-1">{won(v)}{W}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted">{t('note')}</p>

            <ShareResult card={card} text={t('share.text', shareArgs)} fileName="education-tax-credit" />
            <Link href={fullLink} className="ui-btn inline-block px-4 py-3 text-sm">{t('actions.full')}</Link>
          </div>

          <section aria-labelledby="et-who" className="ui-card p-6 space-y-3">
            <h2 id="et-who" className="text-lg font-semibold text-fg">{t('who.title')}</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('who.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </section>
        </div>
      </div>

      {/* 포함·제외 */}
      <section aria-labelledby="et-list" className="ui-card p-6 space-y-4">
        <h2 id="et-list" className="text-lg font-semibold text-fg">{t('list.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('list.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 pr-2">{t('list.cols.item')}</th>
                <th scope="col" className="text-left font-medium py-2 px-2 whitespace-nowrap">{t('list.cols.ok')}</th>
                <th scope="col" className="text-left font-medium py-2 pl-2">{t('list.cols.note')}</th>
              </tr>
            </thead>
            <tbody>
              {(t.raw('list.rows') as { item: string; ok: boolean; note: string }[]).map((x) => (
                <tr key={x.item} className="border-b border-line align-top">
                  <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{x.item}</th>
                  <td className={`py-3 px-2 whitespace-nowrap font-medium ${x.ok ? 'text-primary' : 'text-sub'}`}>{t(x.ok ? 'list.yes' : 'list.no')}</td>
                  <td className="py-3 pl-2 text-sub">{x.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="et-missing" className="ui-card p-6 space-y-3">
          <h2 id="et-missing" className="text-lg font-semibold text-fg">{t('missing.title')}</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
            {(t.raw('missing.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>
        <section aria-labelledby="et-next" className="ui-card p-6 space-y-3">
          <h2 id="et-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
          <ul className="grid grid-cols-1 gap-2">
            {(Object.keys(NEXT) as (keyof typeof NEXT)[]).map((k) => (
              <li key={k}>
                <Link href={NEXT[k]} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                  <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                  <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="text-xs text-muted">{t('source', { year: TAX_YEAR })}</p>
    </div>
  )
}
