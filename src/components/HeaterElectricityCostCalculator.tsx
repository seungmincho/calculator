'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/heaterElectricityCost'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { LIMITS, TARIFF, SUPER_USER_KWH, RATE_DATE, CLIMATE, FUEL, FUND, type Voltage, type Bill } from '@/utils/electricityBill'
import { analyze, compare, device, KINDS, PRESET, DEFAULTS, SIM_HOURS, type Kind, type Device } from '@/utils/heaterElectricityCost'

// 요금은 heaterElectricityCost.ts → electricityBill.ts calcBill (전기요금 계산기와 같은 함수).
// URL: b 평소 kWh · mo 사용 월 · v=h 고압 · sh 비교표 하루 시간 · d 기구 목록. 키가 없으면 기본값, 기본값이면 쿼리 없음.
// d = 기구를 '_'로 이음. 한 개 = 종류 코드 1자 + W-시간-일수. 예: m200-8-30_f2000-2-30. 'd=' 빈 값 = 기구 없음
const CODE: Record<Kind, string> = { mat: 'm', blanket: 'y', waterMat: 'w', fanHeater: 'f', radiator: 'r', heater: 'h', carbon: 'c', stove: 's' }
const KIND = Object.fromEntries(KINDS.map((k) => [CODE[k], k])) as Record<string, Kind>
const MAX_ROWS = 10
const MAX_W = 10_000
const MAX_KWH = 5_000
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

type Row = Device & { id: number }
type State = { base: number; month: number; voltage: Voltage; sh: number; rows: Row[] }
const withIds = (list: Device[]): Row[] => list.map((d, id) => ({ ...d, id }))
const encode = (list: Device[]) => list.map((d) => `${CODE[d.kind]}${d.watt}-${d.hours}-${d.days}`).join('_')
const decode = (s: string): Device[] => s.split('_').slice(0, MAX_ROWS).flatMap((x) => {
  const g = /^([mywfrhcs])(\d{1,5})-(\d{1,2}(?:\.\d{1,2})?)-(\d{1,2})$/.exec(x)
  return g ? [{ kind: KIND[g[1]], watt: Math.min(+g[2], MAX_W), hours: Math.min(+g[3], 24), days: Math.min(+g[4], 31) }] : []
})
const DEF: State = { base: DEFAULTS.base, month: DEFAULTS.month, voltage: DEFAULTS.voltage, sh: SIM_HOURS, rows: withIds(DEFAULTS.devices) }

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const kwhFmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const num = (v: string, lo: number, hi: number) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0 }
const int = (v: string | null, lo: number, hi: number, d: number) => (v && /^\d{1,5}$/.test(v) && +v >= lo && +v <= hi ? +v : d)
const seg = (on: boolean) => `min-h-[44px] py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function HeaterElectricityCostCalculator() {
  const t = useTranslations('heaterElectricityCost')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo((): State => {
    if (!hydrated) return DEF
    const d = sp.get('d')
    return {
      base: int(sp.get('b'), 0, MAX_KWH, DEF.base),
      month: int(sp.get('mo'), 1, 12, DEF.month),
      voltage: sp.get('v') === 'h' ? 'high' : 'low',
      sh: int(sp.get('sh'), 1, 24, SIM_HOURS),
      rows: d === null ? DEF.rows : withIds(decode(d)),
    }
  }, [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl

  // 값 → URL (공유 링크가 결과를 재현). 기본값 그대로면 쿼리를 붙이지 않음
  const update = (patch: Partial<State>) => {
    const next = { ...s, ...patch }
    setEdited(next)
    const q = new URLSearchParams({ b: String(next.base), mo: String(next.month) })
    if (next.voltage === 'high') q.set('v', 'h')
    if (next.sh !== SIM_HOURS) q.set('sh', String(next.sh))
    q.set('d', encode(next.rows))
    const isDef = next.base === DEF.base && next.month === DEF.month && next.voltage === DEF.voltage && next.sh === SIM_HOURS && encode(next.rows) === encode(DEF.rows)
    window.history.replaceState(window.history.state, '', isDef ? window.location.pathname : `?${q}`)
  }
  const setRow = (id: number, patch: Partial<Device>) => update({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const addRow = (kind: Kind) => update({ rows: [...s.rows, { ...device(kind, 4), id: Math.max(-1, ...s.rows.map((r) => r.id)) + 1 }] })

  const r = analyze({ base: s.base, month: s.month, voltage: s.voltage, devices: s.rows })
  const season = r.o.season ?? 'normal'
  const [l1, l2] = LIMITS[season]
  const sim = compare(s.base, s.sh, r.o)
  const W = t('won')
  const monthName = (t.raw('months') as string[])[s.month - 1]
  const name = (k: Kind) => t(`kinds.${k}`)
  const tierText = (b: Bill) => (b.isSuper ? t('tier.super') : t('tier.n', { n: b.tier }))
  const vars = { month: monthName, extra: won(r.extra), before: won(r.before.total), after: won(r.after.total), kwh: kwhFmt(r.kwh) }
  const electricityLink = `/electricity-calculator/?${new URLSearchParams({ k: String(r.after.kwh), mo: String(s.month), ...(s.voltage === 'high' ? { v: 'h' } : {}) })}`
  const card = {
    tool: t('title'),
    label: t('share.label', vars),
    headline: `+${won(r.extra)}${W}`,
    sub: t('share.sub', vars),
    rows: [
      ...r.rows.filter((x) => x.kwh > 0).slice(0, 3).map((x) => ({ label: name(x.kind), value: t('share.row', { hours: x.hours, kwh: kwhFmt(x.kwh) }) })),
      { label: t('result.after'), value: `${won(r.after.total)}${W}` },
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 min-w-0">
          <div className="ui-card p-6 space-y-6">
            <MobileResultLink href="#heater-electricity-cost-result" label={t('result.label', vars)} value={`+${won(r.extra)}${W}`} />

            <div>
              <label htmlFor="hec-base" className="block text-sm font-medium text-body mb-2">{t('input.base')}</label>
              <div className="flex items-center gap-2">
                <input id="hec-base" type="number" inputMode="numeric" min={0} max={MAX_KWH} value={s.base || ''} placeholder="0"
                  onChange={(e) => update({ base: Math.round(num(e.target.value, 0, MAX_KWH)) })}
                  aria-describedby="hec-base-hint" className="ui-field flex-1 min-w-0 px-4 py-3 tabular-nums" />
                <span className="text-sm text-muted">kWh</span>
              </div>
              <p id="hec-base-hint" className="text-xs text-muted mt-1.5">{t('input.baseHint')}</p>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-fg">{t('input.devices')}</h2>
                <p className="text-xs text-muted mt-1">{t('input.devicesHint')}</p>
              </div>
              <ul className="space-y-3">
                {s.rows.map((row, i) => {
                  const id = `hec-${row.id}`
                  return (
                    <li key={row.id} className="bg-subtle rounded-2xl p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-fg">{name(row.kind)}</span>
                        <span className="ml-auto text-sm text-sub tabular-nums">{kwhFmt(r.rows[i].kwh)} kWh</span>
                        <button type="button" onClick={() => update({ rows: s.rows.filter((x) => x.id !== row.id) })}
                          aria-label={t('input.remove', { name: name(row.kind) })} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-sub hover:bg-soft">
                          <X className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <label htmlFor={`${id}-w`} className="text-xs text-sub min-w-0">{t('input.watt')}
                          <input id={`${id}-w`} type="number" inputMode="numeric" min={0} max={MAX_W} value={row.watt || ''}
                            onChange={(e) => setRow(row.id, { watt: Math.round(num(e.target.value, 0, MAX_W)) })}
                            className="ui-field w-full px-2 py-2.5 mt-1 text-sm tabular-nums" />
                        </label>
                        <label htmlFor={`${id}-h`} className="text-xs text-sub min-w-0">{t('input.hours')}
                          <input id={`${id}-h`} type="number" inputMode="decimal" min={0} max={24} step={0.5} value={row.hours || ''}
                            onChange={(e) => setRow(row.id, { hours: Math.round(num(e.target.value, 0, 24) * 10) / 10 })}
                            className="ui-field w-full px-2 py-2.5 mt-1 text-sm tabular-nums" />
                        </label>
                        <label htmlFor={`${id}-d`} className="text-xs text-sub min-w-0">{t('input.days')}
                          <input id={`${id}-d`} type="number" inputMode="numeric" min={0} max={31} value={row.days || ''}
                            onChange={(e) => setRow(row.id, { days: Math.round(num(e.target.value, 0, 31)) })}
                            className="ui-field w-full px-2 py-2.5 mt-1 text-sm tabular-nums" />
                        </label>
                      </div>
                      <p className="text-xs text-muted mt-2">
                        {t('input.presetNote', { watt: PRESET[row.kind].watt.toLocaleString('ko-KR') })}
                        {PRESET[row.kind].thermo && <> {t('input.thermo')}</>}
                      </p>
                    </li>
                  )
                })}
              </ul>
              {s.rows.length === 0 && <p className="text-sm text-muted">{t('input.empty')}</p>}

              <div>
                <span id="hec-add-label" className="block text-sm font-medium text-body mb-2">{t('input.add')}</span>
                <div role="group" aria-labelledby="hec-add-label" className="flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <button key={k} type="button" onClick={() => addRow(k)} disabled={s.rows.length >= MAX_ROWS}
                      aria-label={t('input.addAria', { name: name(k), watt: PRESET[k].watt.toLocaleString('ko-KR') })}
                      className="min-h-[44px] px-3 py-2 rounded-lg text-sm bg-soft text-body hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed">
                      {name(k)} <span className="text-muted tabular-nums">{PRESET[k].watt.toLocaleString('ko-KR')}W</span>
                    </button>
                  ))}
                </div>
                {s.rows.length >= MAX_ROWS && <p className="text-xs text-muted mt-1.5">{t('input.maxRows', { n: MAX_ROWS })}</p>}
              </div>
            </div>

            <div>
              <span id="hec-month-label" className="block text-sm font-medium text-body mb-2">{t('input.month')}</span>
              <div role="group" aria-labelledby="hec-month-label" className="grid grid-cols-6 gap-1.5">
                {MONTHS.map((m) => (
                  <button key={m} type="button" aria-pressed={s.month === m} className={seg(s.month === m)} onClick={() => update({ month: m })}>
                    {(t.raw('months') as string[])[m - 1]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`seasonHint.${season}`, { l1, l2, kwh: SUPER_USER_KWH.toLocaleString('ko-KR') })}</p>
            </div>

            <div>
              <span id="hec-volt-label" className="block text-sm font-medium text-body mb-2">{t('input.voltage')}</span>
              <div role="group" aria-labelledby="hec-volt-label" className="grid grid-cols-2 gap-2">
                {(['low', 'high'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={s.voltage === v} className={`${seg(s.voltage === v)} px-3`} onClick={() => update({ voltage: v })}>
                    {t(`input.${v}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('input.voltageHint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          <div id="heater-electricity-cost-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label', vars)}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">+{won(r.extra)}{W}</p>
              <p className="text-sm text-sub mt-1">{r.kwh > 0 ? t('result.sub', vars) : t('result.empty')}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <Stat label={t('result.extraKwh')} value={`${kwhFmt(r.kwh)} kWh`} note={t('result.extraKwhNote', { base: won(s.base) })} />
              <Stat label={t('result.perDay')} value={`${won(r.perDay)}${W}`} note={t('result.perDayNote', { days: r.days })} />
              <Stat label={t('result.before')} value={`${won(r.before.total)}${W}`} note={t('result.kwhTier', { kwh: won(r.before.kwh), tier: tierText(r.before) })} />
              <Stat label={t('result.after')} value={`${won(r.after.total)}${W}`} note={t('result.kwhTier', { kwh: won(r.after.kwh), tier: tierText(r.after) })} />
            </dl>

            {r.after.tier > r.before.tier && <p className="text-sm text-body">{t('result.tierUp', { from: tierText(r.before), to: tierText(r.after) })}</p>}
            {r.tip && (
              <div className={`rounded-2xl p-4 text-sm space-y-1 ${r.tip.kind === 'above' ? 'bg-amber-50 text-amber-800' : 'bg-subtle text-sub'}`}>
                {r.tip.kind === 'above' ? (
                  <>
                    <p>{t('tip.above', { limit: r.tip.tier === 2 ? l1 : l2, over: r.tip.over, tier: r.tip.tier - 1, save: won(r.tip.save) })}</p>
                    {r.cutHours !== null && r.top && <p>{t('tip.cut', { name: name(r.top.kind), h: kwhFmt(Math.ceil(r.cutHours * 10) / 10) })}</p>}
                  </>
                ) : (
                  <p>{t('tip.below', { left: r.tip.left + 1, tier: r.tip.tier, rate: TARIFF[s.voltage].rate[r.tip.tier - 1], base: won(TARIFF[s.voltage].base[r.tip.tier - 1]) })}</p>
                )}
              </div>
            )}
            {r.after.isSuper && (
              <p className="rounded-2xl p-4 text-sm bg-amber-50 text-amber-800">{t('tip.super', { kwh: SUPER_USER_KWH.toLocaleString('ko-KR'), rate: TARIFF[s.voltage].superRate })}</p>
            )}

            {r.kwh > 0 && (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">{t('table.caption')}</caption>
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.device')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('table.kwh')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('table.share')}</th>
                      <th scope="col" className="text-right font-medium py-2 pl-2">{t('table.cost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((x, i) => (
                      <tr key={s.rows[i].id} className="border-b border-line">
                        <th scope="row" className="text-left font-medium py-3 pr-2 text-body">
                          {name(x.kind)}
                          <span className="block text-xs font-normal text-muted">{t('table.usage', { watt: x.watt.toLocaleString('ko-KR'), hours: x.hours, days: x.days })}</span>
                        </th>
                        <td className="text-right py-3 px-2 text-sub whitespace-nowrap">{kwhFmt(x.kwh)}</td>
                        <td className="py-3 px-2 text-right text-sub whitespace-nowrap">
                          {Math.round(x.share * 100)}%
                          <span className="block h-1.5 w-16 ml-auto mt-1 rounded-full bg-track overflow-hidden" aria-hidden>
                            <span className="block h-full bg-primary rounded-full" style={{ width: `${x.share * 100}%` }} />
                          </span>
                        </td>
                        <td className="text-right py-3 pl-2 text-fg whitespace-nowrap">{won(x.cost)}{W}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {r.kwh > 0 && <p className="text-xs text-muted">{t('table.note')}</p>}

            <ShareResult card={card} text={t('share.text', vars)} fileName="heater-electricity-cost" />
            <div className="space-y-2">
              <Link href={electricityLink} className="ui-btn inline-block px-4 py-3 text-sm">{t('toElectricity', { kwh: won(r.after.kwh) })}</Link>
              <p className="text-xs text-muted">{t('toElectricityNote')}</p>
            </div>
          </div>

          {/* 같은 시간 비교 */}
          <section aria-labelledby="hec-sim" className="ui-card p-6 space-y-4">
            <div>
              <h2 id="hec-sim" className="text-lg font-semibold text-fg">{t('sim.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('sim.desc', { base: won(s.base), h: s.sh, month: monthName })}</p>
            </div>
            <div>
              <label htmlFor="hec-sh" className="flex justify-between text-sm font-medium text-body mb-2">
                <span>{t('sim.hours')}</span><span className="text-fg tabular-nums">{t('sim.hoursValue', { h: s.sh })}</span>
              </label>
              <input id="hec-sh" type="range" min={1} max={24} value={s.sh} onChange={(e) => update({ sh: parseInt(e.target.value) })} className="w-full accent-[var(--primary)]" />
            </div>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('sim.caption', { h: s.sh })}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.device')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('sim.kwh')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('sim.extra')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('sim.perHour')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.map((x) => (
                    <tr key={x.kind} className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">
                        {name(x.kind)}
                        <span className="block text-xs font-normal text-muted">{t('sim.watt', { watt: x.watt.toLocaleString('ko-KR') })}</span>
                      </th>
                      <td className="text-right py-3 px-2 text-sub whitespace-nowrap">{kwhFmt(x.kwh)}</td>
                      <td className="text-right py-3 px-2 text-fg font-medium whitespace-nowrap">+{won(x.extra)}{W}</td>
                      <td className="text-right py-3 pl-2 text-sub whitespace-nowrap">{won(x.perHour)}{W}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('sim.note')}</p>
          </section>
        </div>
      </div>

      <section aria-labelledby="hec-tips" className="ui-card p-6 space-y-3">
        <h2 id="hec-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section aria-labelledby="hec-next" className="ui-card p-6 space-y-3">
        <h2 id="hec-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {([['electricity', '/electricity-calculator/'], ['gasBill', '/gas-bill/'], ['energyVoucher', '/energy-voucher/']] as const).map(([k, href]) => (
            <li key={k}>
              <Link href={href} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('source', { date: RATE_DATE, climate: CLIMATE.toFixed(1), fuel: FUEL.toFixed(1), fund: (FUND * 100).toFixed(1) })}</p>
      </section>
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-subtle rounded-2xl p-4 min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold text-fg tabular-nums mt-0.5 [overflow-wrap:anywhere]">{value}</dd>
      <dd className="text-xs text-sub mt-0.5">{note}</dd>
    </div>
  )
}
