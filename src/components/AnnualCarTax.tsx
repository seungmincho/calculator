'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/annualCarTax'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  KINDS, VAN_SIZES, TRUCK_TONS, LUMP_MONTHS, LUMP_RATE, calcAnnual, calcLump, calcProrated, ageSeries, ccRate, nextLumpWindow,
  type Kind, type Use, type VanSize, type TruckTon, type CarInput,
} from '@/utils/annualCarTax'
import { todayKST, ddayLabel } from '@/utils/dday'

const YEARS = [2026, 2027] as const
const CC_PRESETS = [998, 1598, 1999, 2497, 3470] as const
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const pick = <T,>(v: string | null, list: readonly T[], def: T, map: (s: string) => T = (s) => s as T): T => {
  if (v == null) return def
  const x = map(v)
  return list.includes(x) ? x : def
}
const noSub = () => () => {}

export default function AnnualCarTax() {
  const t = useTranslations('annualCarTax')
  const sp = useSearchParams()

  const [year, setYear] = useState<number>(() => pick(sp.get('y'), YEARS, 2026, Number))
  const [kind, setKind] = useState<Kind>(() => pick(sp.get('k'), KINDS, 'car'))
  const [use, setUse] = useState<Use>(() => (sp.get('u') === 'b' ? 'business' : 'private'))
  const [cc, setCc] = useState(() => Math.min(Number(sp.get('cc')) || 1999, 20_000))
  const [regYear, setRegYear] = useState(() => Number(sp.get('ry')) || 2022)
  const [regMonth, setRegMonth] = useState(() => pick(sp.get('rm'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3, Number))
  const [van, setVan] = useState<VanSize>(() => pick(sp.get('van'), VAN_SIZES, 'small'))
  const [ton, setTon] = useState<TruckTon>(() => pick(sp.get('ton'), TRUCK_TONS, 1 as TruckTon, (s) => Number(s) as TruckTon))
  const [saleDate, setSaleDate] = useState(() => sp.get('sd') ?? '')
  const today = useSyncExternalStore(noSub, todayKST, () => null) // KST, 서버·하이드레이션은 null (불일치 방지)
  const sale = saleDate || today || '' // 매도일 기본값 = 오늘

  useEffect(() => {
    const q = new URLSearchParams()
    if (year !== 2026) q.set('y', String(year))
    if (kind !== 'car') q.set('k', kind)
    if (use === 'business') q.set('u', 'b')
    if (kind === 'car') { q.set('cc', String(cc)); q.set('ry', String(regYear)); q.set('rm', String(regMonth)) }
    if (kind === 'van') q.set('van', van)
    if (kind === 'truck') q.set('ton', String(ton))
    if (sp.get('sd')) q.set('sd', saleDate)
    window.history.replaceState(null, '', `?${q}`)
  }, [year, kind, use, cc, regYear, regMonth, van, ton, saleDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const ry = Math.min(regYear, year)
  const input: CarInput = { kind, use, cc, regYear: ry, regMonth, van, ton }
  const r = calcAnnual(input, year)
  const lumps = LUMP_MONTHS.map((m) => calcLump(r, year, m))
  const jan = lumps[0]
  const series = r.ageApplies ? ageSeries(input, year) : []
  const curAge = r.h2.age
  const ageCut = r.h1.reduction > 0 || r.h2.reduction > 0
  const fullAnnual = r.base // 경감 전 연세액
  const reducedBy = fullAnnual - r.tax
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(sale)
  const before = validDate ? calcProrated(r, year, `${year}-01-01`, shiftDay(sale, -1)) : null
  const after = validDate ? calcProrated(r, year, sale, `${year}-12-31`) : null
  // 다음 연납 기간과 그때 이 차의 공제액 (기간이 내년이면 내년 차령으로 다시 계산)
  const win = today ? nextLumpWindow(today) : null
  const winLump = win && calcLump(win.year === year ? r : calcAnnual({ ...input, regYear: Math.min(regYear, win.year) }, win.year), win.year, win.month)
  const [dueM, dueD] = win ? win.due.slice(5).split('-').map(Number) : [0, 0]

  const desc =
    kind === 'car' ? t('u.descCar', { cc: won(cc), rate: ccRate(cc, use), use: t(`u.use.${use}`) })
      : kind === 'van' ? `${t('u.kind.van')} · ${t(`u.van.${van}`)} · ${t(`u.use.${use}`)}`
        : kind === 'truck' ? `${t('u.kind.truck')} · ${t('u.tonLabel', { ton })} · ${t(`u.use.${use}`)}`
          : `${t('u.kind.ev')} · ${t(`u.use.${use}`)}`

  const seg = (on: boolean) =>
    `px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.kind.label')}</p>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={seg(kind === k)} aria-pressed={kind === k}>{t(`u.kind.${k}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.kindHint.${kind}`)}</p>
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.use.label')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['private', 'business'] as const).map((u) => (
                  <button key={u} onClick={() => setUse(u)} className={seg(use === u)} aria-pressed={use === u}>{t(`u.use.${u}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.use.hint')}</p>
            </div>

            {kind === 'car' && (
              <>
                <div>
                  <label htmlFor="act-cc" className="block text-sm font-medium text-body mb-2">{t('u.cc')}</label>
                  <div className="relative">
                    <input
                      id="act-cc" type="text" inputMode="numeric" value={cc ? cc.toLocaleString('ko-KR') : ''}
                      onChange={(e) => setCc(Math.min(Number(e.target.value.replace(/[^\d]/g, '')) || 0, 20_000))}
                      className="ui-field w-full px-4 py-3 pr-12 tabular-nums"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">cc</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {CC_PRESETS.map((p, i) => (
                      <button key={p} onClick={() => setCc(p)} className={`px-2 py-1 rounded-lg text-xs ${cc === p ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                        {(t.raw('u.ccPresets') as string[])[i]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1.5">{t('u.ccHint')}</p>
                </div>

                <div>
                  <p className="block text-sm font-medium text-body mb-2">{t('u.reg')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select aria-label={t('u.regYear')} value={ry} onChange={(e) => setRegYear(Number(e.target.value))} className="ui-field w-full px-3 py-3">
                      {Array.from({ length: 26 }, (_, k) => year - k).map((y) => <option key={y} value={y}>{t('u.yearOpt', { y })}</option>)}
                    </select>
                    <select aria-label={t('u.regMonth')} value={regMonth} onChange={(e) => setRegMonth(Number(e.target.value))} className="ui-field w-full px-3 py-3">
                      {Array.from({ length: 12 }, (_, k) => k + 1).map((m) => <option key={m} value={m}>{t('u.monthOpt', { m })}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-muted mt-1.5">{t('u.regHint')}</p>
                </div>
              </>
            )}

            {kind === 'van' && (
              <div>
                <p className="block text-sm font-medium text-body mb-2">{t('u.van.label')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {VAN_SIZES.map((v) => <button key={v} onClick={() => setVan(v)} className={seg(van === v)} aria-pressed={van === v}>{t(`u.van.${v}`)}</button>)}
                </div>
              </div>
            )}

            {kind === 'truck' && (
              <div>
                <label htmlFor="act-ton" className="block text-sm font-medium text-body mb-2">{t('u.ton')}</label>
                <select id="act-ton" value={ton} onChange={(e) => setTon(Number(e.target.value) as TruckTon)} className="ui-field w-full px-4 py-3">
                  {TRUCK_TONS.map((x) => <option key={x} value={x}>{t('u.tonLabel', { ton: x })}</option>)}
                </select>
                <p className="text-xs text-muted mt-1.5">{t('u.tonHint')}</p>
              </div>
            )}

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.year')}</p>
              <div className="grid grid-cols-2 gap-2">
                {YEARS.map((y) => <button key={y} onClick={() => setYear(y)} className={seg(year === y)} aria-pressed={year === y}>{t('u.yearOpt', { y })}</button>)}
              </div>
              {year !== 2026 && <p className="text-xs text-muted mt-1.5">{t('u.yearNote')}</p>}
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm text-muted">{t('u.resultLabel', { year })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{t('u.won')}</p>
              <p className="text-sm text-sub mt-1">{desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['h1', 'h2'] as const).map((h) => (
                <div key={h} className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-muted">{t(`u.${h}`)}</p>
                  <p className="text-xl font-bold text-fg tabular-nums mt-1">{won(r[h].total)}{t('u.won')}</p>
                  {r.ageApplies && <p className="text-xs text-muted mt-0.5">{t('u.ageOf', { age: r[h].age, pct: Math.round(r[h].reduction * 100) })}</p>}
                </div>
              ))}
            </div>

            <div className="divide-y divide-line border-y border-line text-sm">
              <Row label={t('u.row.base')} value={`${won(fullAnnual)}${t('u.won')}`} />
              {r.ageApplies && <Row label={t('u.row.age', { age: curAge })} value={ageCut ? `-${won(reducedBy)}${t('u.won')}` : t('u.row.noAge')} />}
              <Row label={t('u.row.tax')} value={`${won(r.tax)}${t('u.won')}`} strong />
              <Row label={t('u.row.edu')} value={r.hasEdu ? `${won(r.edu)}${t('u.won')}` : t('u.row.noEdu')} strong />
            </div>

            <div className="bg-primary-soft rounded-2xl p-4 text-sm space-y-2">
              <p className="font-semibold text-primary">{t('u.lumpHighlight', { year, saved: won(jan.saved), pay: won(jan.total) })}</p>
              {win && winLump ? (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 rounded-lg bg-primary text-white px-2 py-0.5 text-xs font-bold tabular-nums">{ddayLabel(win.days)}</span>
                  <p className="text-body">
                    {t(win.open ? 'u.window.open' : 'u.window.next', {
                      y: win.year, m: win.month, dm: dueM, dd: dueD, saved: won(winLump.saved), pct: winLump.pct.toFixed(2),
                    })}
                    {dueM !== win.month && <> {t('u.window.shifted')}</>}
                  </p>
                </div>
              ) : (
                <p className="text-sub">{t('u.lumpWhen')}</p>
              )}
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: t('u.share.label', { year }),
                headline: `${won(r.total)}${t('u.won')}`,
                sub: desc,
                rows: [
                  { label: t('u.h1'), value: `${won(r.h1.total)}${t('u.won')}` },
                  { label: t('u.h2'), value: `${won(r.h2.total)}${t('u.won')}` },
                  { label: t('u.row.edu'), value: `${won(r.edu)}${t('u.won')}` },
                  { label: t('u.share.lump'), value: `${won(jan.total)}${t('u.won')} (-${won(jan.saved)})` },
                ],
              }}
              text={t('u.share.text', { year, total: won(r.total), saved: won(jan.saved) })}
            />
          </div>

          {/* 연납 비교 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.lump.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.lump.desc', { rate: LUMP_RATE * 100 })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="text-left font-medium py-2">{t('u.lump.when')}</th>
                    <th className="text-right font-medium py-2">{t('u.lump.pay')}</th>
                    <th className="text-right font-medium py-2">{t('u.lump.saved')}</th>
                    <th className="text-right font-medium py-2">{t('u.lump.pct')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line">
                    <td className="py-2.5 pl-1 text-body">{t('u.lump.split')}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-fg">{won(r.total)}</td>
                    <td className="py-2.5 text-right tabular-nums text-sub">-</td>
                    <td className="py-2.5 pr-1 text-right tabular-nums text-sub">-</td>
                  </tr>
                  {lumps.map((l) => {
                    const best = l.month === 1
                    return (
                      <tr key={l.month} className={`border-b border-line ${best ? 'bg-primary-soft' : ''}`}>
                        <td className={`py-2.5 pl-1 ${best ? 'text-primary font-semibold' : 'text-body'}`}>{t('u.lump.month', { m: l.month })}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-fg">{won(l.total)}</td>
                        <td className="py-2.5 text-right tabular-nums text-primary">-{won(l.saved)}</td>
                        <td className="py-2.5 pr-1 text-right tabular-nums text-sub">{l.pct.toFixed(2)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faint">{t('u.lump.note')}</p>
          </div>

          {/* 납부 일정 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('u.schedule.title')}</h2>
            <div className="divide-y divide-line border-y border-line text-sm">
              {(t.raw('u.schedule.rows') as string[][]).map(([when, what]) => (
                <div key={when} className="flex items-start justify-between gap-4 py-2.5">
                  <span className="text-body font-medium shrink-0">{when}</span>
                  <span className="text-sub text-right">{what}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="https://www.wetax.go.kr" target="_blank" rel="noopener noreferrer" className="ui-btn px-4 py-2 text-sm">{t('u.schedule.wetax')}</a>
              <a href="https://etax.seoul.go.kr" target="_blank" rel="noopener noreferrer" className="ui-btn-soft px-4 py-2 text-sm">{t('u.schedule.etax')}</a>
            </div>
          </div>

          {/* 매도·폐차 일할 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.prorate.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.prorate.desc')}</p>
            </div>
            <div>
              <label htmlFor="act-sale" className="block text-sm font-medium text-body mb-2">{t('u.prorate.date')}</label>
              <input id="act-sale" type="date" min={`${year}-01-01`} max={`${year}-12-31`} value={sale} onChange={(e) => setSaleDate(e.target.value)} className="ui-field w-full sm:w-60 px-4 py-3" />
            </div>
            {before && after && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-muted">{t('u.prorate.before', { days: before.days })}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(before.total)}{t('u.won')}</p>
                </div>
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-muted">{t('u.prorate.after', { days: after.days })}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(after.total)}{t('u.won')}</p>
                  <p className="text-xs text-muted mt-0.5">{t('u.prorate.refund', { amount: won(r.total ? after.total * jan.total / r.total : 0) })}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-faint">{t('u.prorate.note')}</p>
          </div>

          {/* 차령별 추이 */}
          {series.length > 0 && (
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('u.series.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.series.desc', { cc: won(cc) })}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="text-left font-medium py-2">{t('u.series.age')}</th>
                      <th className="text-right font-medium py-2">{t('u.series.cut')}</th>
                      <th className="text-right font-medium py-2">{t('u.series.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s) => {
                      const cur = s.age === Math.min(curAge, 13)
                      return (
                        <tr key={s.age} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`}>
                          <td className={`py-2 pl-1 ${cur ? 'text-primary font-semibold' : 'text-body'}`}>{s.age === 13 ? t('u.series.ageMax') : t('u.series.ageN', { n: s.age })}</td>
                          <td className="py-2 text-right tabular-nums text-sub">{s.reduction ? `${Math.round(s.reduction * 100)}%` : '-'}</td>
                          <td className="py-2 pr-1 text-right tabular-nums font-semibold text-fg">{won(s.total)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-faint">{t('u.series.note')}</p>
            </div>
          )}

          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                {(t.raw('guide.rateTable.head') as string[]).map((h, i) => (
                  <th key={h} className={`font-medium py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(t.raw('guide.rateTable.rows') as string[][]).map((row) => (
                <tr key={row[0]} className="border-b border-line">
                  {row.map((c, i) => (
                    <td key={i} className={`py-2 ${i === 0 ? 'text-body' : 'text-right tabular-nums text-sub'}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-faint mt-2">{t('guide.rateTable.note')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['lump', 'age', 'refund', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['car-tax-calculator', 'car-loan-calculator', 'fuel-calculator', 'car-maintenance'] as const).map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-body">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-fg' : 'text-sub'}`}>{value}</span>
    </div>
  )
}

function shiftDay(s: string, n: number) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
