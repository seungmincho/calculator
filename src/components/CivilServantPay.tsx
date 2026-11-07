'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/civilServantPay'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import {
  PAY_2026, GRADE_ALLOWANCE, MEAL, PENSION_PCT, RAISE_2027_PERMIL, PAY_YEAR, TRACKS, DEFAULT_GRADE, DEFAULT_STEP,
  maxStep, est2027, calcCivilPay, type Track,
} from '@/utils/civilServantPay'
import { INSURANCE_BY_YEAR, pct } from '@/utils/insuranceRates'

const won = (n: number) => n.toLocaleString('ko-KR')
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const RAISE = RAISE_2027_PERMIL / 10
const KEYS = ['t', 'g', 's', 'f', 'c', 'a'] as const
type State = Record<(typeof KEYS)[number], string>
const asTrack = (s: string | null): Track => (TRACKS.includes(s as Track) ? (s as Track) : 'general')
/** 직종마다 기본 직급·호봉이 다르다. URL 에는 이 기본값(직종은 일반직)과 다른 값만 남긴다. */
const defaultsFor = (t: string | null): State => {
  const track = asTrack(t)
  return { t: track, g: String(DEFAULT_GRADE[track]), s: String(DEFAULT_STEP[track]), f: '1', c: '0', a: '1' }
}
/** 표 범위 밖 값(손으로 고친 URL 등)은 그 직종 기본값으로 */
function normalize(v: State) {
  const track = asTrack(v.t)
  const g = Number(v.g) >= 1 && Number(v.g) <= PAY_2026[track].length ? Number(v.g) : DEFAULT_GRADE[track]
  const n = maxStep(track, g)
  const step = Number(v.s) >= 1 ? Math.min(n, Number(v.s)) : DEFAULT_STEP[track]
  const family = Math.min(11, Math.max(1, Number(v.f) || 1))
  const children = Math.min(family - 1, Math.max(0, Number(v.c) || 0))
  return { track, g, step, family, children, allowances: v.a !== '0' }
}
const SOURCES = [
  ['payTable', 'https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/2026/'],
  ['payRule', 'https://www.law.go.kr/법령/공무원보수규정'],
  ['allowanceRule', 'https://www.law.go.kr/법령/공무원수당등에관한규정'],
  ['pensionAct', 'https://www.law.go.kr/법령/공무원연금법'],
  ['taxAct', 'https://www.law.go.kr/법령/소득세법'],
  ['taxDecree', 'https://www.law.go.kr/법령/소득세법시행령'],
  ['employmentAct', 'https://www.law.go.kr/법령/고용보험법'],
  ['health', 'https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html'],
  ['press2026', 'https://www.korea.kr/news/policyNewsView.do?newsId=148957301'],
  ['budget2027', 'https://biz.sbs.co.kr/amp/article/20000332007'],
] as const
const ENTRY_GRADES = [9, 8, 7, 6, 5] // 일반직 초임 비교

export default function CivilServantPay() {
  const t = useTranslations('civilServantPay')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 사용자가 고치면 그 값이 우선.
  const fromUrl = useMemo(() => {
    if (!hydrated) return defaultsFor('general')
    const next = defaultsFor(sp.get('t'))
    for (const k of KEYS.slice(1)) {
      const q = sp.get(k)
      if (q != null && /^\d{1,2}$/.test(q)) next[k] = q
    }
    return next
  }, [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const v = edited ?? fromUrl
  const x = useMemo(() => normalize(v), [v])

  const update = (patch: Partial<State>) => {
    const next = { ...v, ...patch }
    setEdited(next)
    const d = { ...defaultsFor(next.t), t: 'general' }
    const url = new URL(window.location.href)
    for (const k of KEYS) {
      if (next[k] !== d[k]) url.searchParams.set(k, next[k])
      else url.searchParams.delete(k)
    }
    window.history.replaceState(window.history.state, '', url)
  }
  const [fullYear, setFullYear] = useState<'2026' | '2027'>('2026')

  const r = useMemo(() => calcCivilPay(x), [x])
  const r27 = useMemo(() => calcCivilPay(x, 2027), [x])
  const { track, g, step } = x
  const W = (n: number) => t('unit.won', { v: won(n) })
  const plus = (n: number) => t('unit.plus', { v: won(n) })
  const grades = (tr: Track) => t.raw(`grades.${tr}`) as string[]
  const gradeName = grades(track)[g - 1]
  const who = t('who', { grade: gradeName, step })
  const label = t('result.label', { who, year: PAY_YEAR })
  const column = PAY_2026[track][g - 1]
  const gradeOrder = range(1, PAY_2026[track].length).reverse() // 낮은 직급부터
  const R26 = INSURANCE_BY_YEAR[2026]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5 min-w-0">
          <MobileResultLink href="#civil-servant-pay-result" label={label} value={W(r.net)} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>

          <Seg id="csp-t" label={t('input.track')} hint={t(`input.trackHint.${track}`)}
            options={TRACKS.map((tr): [string, string] => [tr, t(`track.${tr}`)])} value={track} cols="grid-cols-3"
            onChange={(tr) => update({ t: tr, g: String(DEFAULT_GRADE[tr as Track]), s: String(DEFAULT_STEP[tr as Track]) })} />

          {track !== 'teacher' && (
            <Select id="csp-g" label={t('input.grade')} value={g}
              options={gradeOrder.map((n): [number, string] => [n, grades(track)[n - 1]])}
              onChange={(n) => update({ g: String(n), s: String(Math.min(step, maxStep(track, n))) })} />
          )}
          <Select id="csp-s" label={t('input.step')} hint={t(`input.stepHint.${track}`)} value={step}
            options={range(1, column.length).map((n): [number, string] => [n, t('stepN', { n })])} onChange={(n) => update({ s: String(n) })} />
          <div className="grid grid-cols-2 gap-3">
            <Select id="csp-f" label={t('input.family')} value={x.family}
              options={range(1, 11).map((n): [number, string] => [n, t('people', { n })])}
              onChange={(n) => update({ f: String(n), c: String(Math.min(x.children, n - 1)) })} />
            <Select id="csp-c" label={t('input.children')} value={x.children}
              options={range(0, x.family - 1).map((n): [number, string] => [n, t('people', { n })])} onChange={(n) => update({ c: String(n) })} />
          </div>
          <p className="text-xs text-muted -mt-2">{t('input.familyHint')}</p>
          <Check id="csp-a" label={t('input.allowances')} checked={x.allowances} onChange={(c) => update({ a: c ? '1' : '0' })}
            hint={track === 'teacher'
              ? t('input.allowancesHintTeacher', { meal: won(MEAL) })
              : t('input.allowancesHint', { meal: won(MEAL), grade: won(GRADE_ALLOWANCE[track][g - 1]) })} />
        </div>

        <div id="civil-servant-pay-result" className="lg:col-span-2 ui-card p-6 space-y-6 scroll-mt-20 min-w-0" aria-live="polite">
          <div className="space-y-1">
            <p className="text-sm text-sub">{label}</p>
            <p className="text-3xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{W(r.net)}</p>
            <p className="text-sm text-body tabular-nums">{t('result.summary', { gross: W(r.gross), ded: W(r.deductions) })}</p>
          </div>

          <section aria-labelledby="csp-2027" className="bg-subtle rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="csp-2027" className="font-semibold text-fg">{t('y2027.title')}</h3>
              <span className="rounded-lg px-2 py-0.5 text-xs font-semibold bg-soft text-body">{t('y2027.badge', { p: RAISE })}</span>
            </div>
            <dl className="space-y-1.5 text-sm tabular-nums">
              <Row label={t('y2027.pay')} value={`${W(r27.pay)} (${plus(r27.pay - r.pay)})`} />
              <Row strong label={t('y2027.net')} value={`${W(r27.net)} (${plus(r27.net - r.net)})`} />
            </dl>
            <p className="text-xs text-sub">{t('y2027.note', { p: RAISE })}</p>
          </section>

          <details>
            <summary className="cursor-pointer min-h-[44px] flex items-center justify-between gap-2 text-sm font-medium text-body">
              <span>{t('detail.summary')}</span>
              <span className="tabular-nums text-sub">{t('detail.total', { v: won(r.deductions) })}</span>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
              <section aria-labelledby="csp-pay">
                <h3 id="csp-pay" className="font-semibold text-fg mb-3">{t('detail.payTitle')}</h3>
                <dl className="space-y-1.5 text-sm tabular-nums">
                  <Row label={t('detail.pay')} value={W(r.pay)} />
                  {r.meal > 0 && <Row label={t('detail.meal')} value={W(r.meal)} />}
                  {r.gradeAllowance > 0 && <Row label={t('detail.grade')} value={W(r.gradeAllowance)} />}
                  <Row strong className="mt-2 pt-2 border-t border-line" label={t('detail.gross')} value={W(r.gross)} />
                  <Row sub label={t('detail.taxable')} value={W(r.taxable)} />
                </dl>
              </section>
              <section aria-labelledby="csp-ded">
                <h3 id="csp-ded" className="font-semibold text-fg mb-3">{t('detail.dedTitle')}</h3>
                <dl className="space-y-1.5 text-sm tabular-nums">
                  <Row label={t('detail.pension', { p: PENSION_PCT })} value={W(r.pension)} />
                  <Row label={t('detail.health', { p: pct(R26.healthRate) })} value={W(r.health)} />
                  <Row label={t('detail.ltc', { p: pct(R26.longTermCareRate, 2) })} value={W(r.ltc)} />
                  <Row label={t('detail.incomeTax', { f: x.family, c: x.children })} value={W(r.incomeTax)} />
                  <Row label={t('detail.localTax')} value={W(r.localTax)} />
                  <Row strong className="mt-2 pt-2 border-t border-line" label={t('detail.dedTotal')} value={W(r.deductions)} />
                </dl>
                <p className="text-xs text-muted mt-2">{t('detail.noNps')}</p>
              </section>
            </div>
          </details>

          <ul className="bg-subtle rounded-2xl p-4 text-xs text-sub space-y-1.5 list-disc pl-8">
            <li>{t('notes.base')}</li>
            <li>{t('notes.cap')}</li>
            <li>{t('notes.excluded')}</li>
            {track === 'teacher' && <li>{t('notes.teacher')}</li>}
          </ul>

          <ShareResult
            card={{
              tool: t('share.tool'), label, headline: W(r.net),
              sub: t('share.sub', { gross: W(r.gross) }),
              rows: [
                { label: t('share.pay'), value: W(r.pay) },
                { label: t('share.pay2027'), value: W(r27.pay) },
              ],
            }}
            text={t('share.text', { who, net: W(r.net), net27: W(r27.net) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="ui-card p-6 min-w-0" aria-labelledby="csp-steps">
          <h2 id="csp-steps" className="text-lg font-semibold text-fg">{t('steps.title', { grade: gradeName })}</h2>
          <p className="text-sm text-muted mt-1">{t('steps.desc', { p: RAISE })}</p>
          <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-line" tabIndex={0} role="region" aria-labelledby="csp-steps">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">{t('steps.title', { grade: gradeName })}</caption>
              <thead className="bg-subtle text-sub sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">{t('table.step')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('table.y2026')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('table.y2027')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('table.diff')}</th>
                </tr>
              </thead>
              <tbody>
                {column.map((pay, i) => {
                  const on = i + 1 === step
                  return (
                    <tr key={i} aria-current={on ? 'true' : undefined} className={`border-t border-line ${on ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                      <th scope="row" className="px-3 py-2 text-left font-medium">{t('stepN', { n: i + 1 })}</th>
                      <td className="px-3 py-2 text-right">{won(pay)}</td>
                      <td className="px-3 py-2 text-right">{won(est2027(pay))}</td>
                      <td className="px-3 py-2 text-right">{plus(est2027(pay) - pay)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ui-card p-6 min-w-0" aria-labelledby="csp-entry">
          <h2 id="csp-entry" className="text-lg font-semibold text-fg">{t('entry.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('entry.desc')}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm tabular-nums whitespace-nowrap">
              <caption className="sr-only">{t('entry.title')}</caption>
              <thead className="bg-subtle text-sub">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">{t('table.grade')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('table.y2026')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('table.y2027')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('table.net')}</th>
                </tr>
              </thead>
              <tbody>
                {ENTRY_GRADES.map((n) => {
                  const e = calcCivilPay({ ...x, track: 'general', g: n, step: 1 })
                  const on = track === 'general' && g === n && step === 1
                  return (
                    <tr key={n} aria-current={on ? 'true' : undefined} className={`border-t border-line ${on ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                      <th scope="row" className="px-3 py-2 text-left font-medium">{grades('general')[n - 1]}</th>
                      <td className="px-3 py-2 text-right">{won(e.pay)}</td>
                      <td className="px-3 py-2 text-right">{won(est2027(e.pay))}</td>
                      <td className="px-3 py-2 text-right">{won(e.net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-3">{x.allowances ? t('entry.noteOn') : t('entry.noteOff')}</p>
        </section>
      </div>

      <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="csp-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="csp-full" className="text-lg font-semibold text-fg">{t('full.title')}</h2>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('full.yearLabel')}>
            {(['2026', '2027'] as const).map((y) => (
              <button key={y} type="button" aria-pressed={fullYear === y} onClick={() => setFullYear(y)}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-medium ${fullYear === y ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                {t(`full.year${y}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted">{fullYear === '2027' ? t('full.note2027', { p: RAISE }) : t('full.note2026')}</p>
        {TRACKS.map((tr) => (
          <details key={tr} open={tr === 'general'} className="border-t border-line pt-2">
            <summary className="cursor-pointer min-h-[44px] flex items-center font-medium text-body">{t(`full.${tr}`)}</summary>
            <div className="overflow-x-auto mt-2 rounded-xl border border-line">
              <table className="min-w-full text-sm tabular-nums">
                <caption className="sr-only">{t(`full.${tr}`)}</caption>
                <thead className="bg-subtle text-sub">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium whitespace-nowrap">{t('table.step')}</th>
                    {grades(tr).map((name) => (
                      <th key={name} scope="col" className="px-3 py-2 text-right font-medium min-w-[5.5rem]">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {range(1, Math.max(...PAY_2026[tr].map((c) => c.length))).map((n) => (
                    <tr key={n} className="border-t border-line text-body">
                      <th scope="row" className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{t('stepN', { n })}</th>
                      {PAY_2026[tr].map((c, j) => {
                        const pay = c[n - 1]
                        return <td key={j} className="px-3 py-1.5 text-right whitespace-nowrap">{pay == null ? '' : won(fullYear === '2027' ? est2027(pay) : pay)}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </section>

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
        <p className="font-medium text-body">{t('sources.title')}</p>
        <ul className="space-y-1">
          {SOURCES.map(([k, url]) => (
            <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t(`sources.items.${k}`)}</a></li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('sources.asOf')}</p>
      </div>

      <GuideSection namespace="civilServantPay" />
    </div>
  )
}

function Seg({ id, label, hint, options, value, onChange, cols }: {
  id: string; label: string; hint?: string; options: [string, string][]; value: string; onChange: (v: string) => void; cols: string
}) {
  return (
    <div>
      <p id={id} className="block text-sm font-medium text-body mb-1.5">{label}</p>
      <div className={`grid ${cols} gap-2`} role="group" aria-labelledby={id} aria-describedby={hint ? `${id}-hint` : undefined}>
        {options.map(([c, text]) => (
          <button key={c} type="button" aria-pressed={c === value} onClick={() => onChange(c)}
            className={`min-h-[44px] px-2 rounded-xl text-sm font-medium ${c === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
            {text}
          </button>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Select({ id, label, hint, value, options, onChange }: {
  id: string; label: string; hint?: string; value: number; options: [number, string][]; onChange: (v: number) => void
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-describedby={hint ? `${id}-hint` : undefined}
        className="ui-field w-full px-4 py-3 text-sm">
        {options.map(([n, text]) => <option key={n} value={n}>{text}</option>)}
      </select>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Check({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer text-sm text-body">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
        <span>{label}</span>
      </label>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted pl-8">{hint}</p>}
    </div>
  )
}

function Row({ label, value, strong, sub, className = '' }: { label: ReactNode; value: string; strong?: boolean; sub?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between gap-3 ${sub ? 'pl-3 text-xs text-muted' : strong ? 'font-semibold text-fg' : 'text-body'} ${className}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 text-right">{value}</dd>
    </div>
  )
}
