/**
 * PcElectricityCalculator - 컴퓨터 전기세 계산기 (번역 네임스페이스: pcElectricity)
 * 요금 로직: src/utils/pcElectricity.ts (한전 주택용 저압 누진제, 한계비용)
 */
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pcElectricity'
import ShareResult from '@/components/ShareResult'
import { marginalCost, yearlyMarginal, pcMonthlyKwh, TARIFF, type Season, type Bill } from '@/utils/pcElectricity'

// 제조사 공식 TDP/PBP·TBP 대략값 (W). 같은 W는 한 줄로 묶어 선택 표시가 겹치지 않게 함
const CPU_MODELS: [string, number][] = [
  ['Ryzen 5 7600 / Core i5-14400F', 65],
  ['Ryzen 7 7700X', 105],
  ['Ryzen 7 7800X3D / 9800X3D', 120],
  ['Core i5-14600K / i7-14700K / Ultra 7 265K', 125],
  ['Ryzen 9 9950X', 170],
  ['Core i9-14900K (MTP)', 253],
]
const GPU_MODELS: [string, number][] = [
  ['RTX 4060', 115],
  ['RTX 5060', 145],
  ['RTX 4060 Ti', 160],
  ['RTX 4070', 200],
  ['RTX 4070 SUPER', 220],
  ['RTX 5070', 250],
  ['RX 7800 XT', 263],
  ['RTX 5070 Ti', 300],
  ['RX 9070 XT', 304],
  ['RTX 4080 SUPER', 320],
  ['RTX 5080', 360],
  ['RTX 4090', 450],
  ['RTX 5090', 575],
]
const MONITOR_PRESETS = [
  { size: 24, watt: 30 },
  { size: 27, watt: 40 },
  { size: 32, watt: 50 },
]
const PSU_OPTIONS: [string, number][] = [['none', 1], ['bronze', 0.85], ['gold', 0.88], ['platinum', 0.91]]
const HOUSEHOLD_PRESETS = [200, 300, 400]

const DEFAULTS = {
  cpu: 125, gpu: 200, cmp: 115, ram: 2, ssd: 1, hdd: 0, mon: 40, dual: 0, etc: 20,
  g: 3, w: 2, i: 0, d: 30, hh: 300, psu: 0.88, rate: 0,
}
type State = typeof DEFAULTS
const LIMITS: Record<keyof State, [number, number]> = {
  cpu: [0, 1000], gpu: [0, 1500], cmp: [0, 1500], ram: [1, 4], ssd: [0, 4], hdd: [0, 4], mon: [0, 500], dual: [0, 1], etc: [0, 1000],
  g: [0, 24], w: [0, 24], i: [0, 24], d: [0, 31], hh: [0, 2000], psu: [0.5, 1], rate: [0, 2000],
}
const clamp = (k: keyof State, v: number) => Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Number.isFinite(v) ? v : 0))

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fmt = (n: number, d = 1) => n.toLocaleString('ko-KR', { maximumFractionDigits: d })

const seg = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function PcElectricityCalculator() {
  const t = useTranslations('pcElectricity')
  const [s, setS] = useState<State>(DEFAULTS)
  const [season, setSeason] = useState<Season>('normal')
  const [loaded, setLoaded] = useState(false)
  const set = (k: keyof State, v: number) => setS((p) => ({ ...p, [k]: clamp(k, v) }))

  // 공유 링크 복원 → 이후 상태를 URL에 동기화
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = { ...DEFAULTS }
    for (const k of Object.keys(DEFAULTS) as (keyof State)[]) {
      const v = params.get(k)
      if (v !== null && v !== '') next[k] = clamp(k, parseFloat(v))
    }
    setS(next)
    if (params.get('s') === 'summer') setSeason('summer')
    else if (!params.get('s') && [6, 7].includes(new Date().getMonth())) setSeason('summer')
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const url = new URL(window.location.href)
    for (const k of Object.keys(DEFAULTS) as (keyof State)[]) {
      if (s[k] === DEFAULTS[k]) url.searchParams.delete(k)
      else url.searchParams.set(k, String(s[k]))
    }
    url.searchParams.set('s', season)
    window.history.replaceState(window.history.state, '', url)
  }, [loaded, s, season])

  const flat = s.rate > 0
  const parts = useMemo(() => ({
    cpu: s.cpu,
    gpu: s.gpu,
    ram: s.ram * 10,
    storage: s.ssd * 5 + s.hdd * 10,
    monitor: s.mon * (s.dual ? 2 : 1),
    etc: s.etc,
  }), [s])
  const baseWatt = parts.cpu + parts.ram + parts.storage + parts.monitor + parts.etc
  const totalWatt = baseWatt + parts.gpu
  const usage = { gaming: s.g, work: s.w, idle: s.i, days: s.d }
  const hoursPerDay = s.g + s.w + s.i

  const cost = (watt: number) => {
    const kwh = pcMonthlyKwh(watt, usage, s.psu)
    if (flat) return { kwh, monthly: kwh * s.rate, yearly: kwh * s.rate * 12 }
    return { kwh, monthly: marginalCost(s.hh, kwh, season).added, yearly: yearlyMarginal(s.hh, kwh) }
  }

  const cur = cost(totalWatt)
  const cmp = cost(baseWatt + s.cmp)
  const m = marginalCost(s.hh, cur.kwh, season)
  const avgWatt = hoursPerDay > 0 && s.d > 0 ? (cur.kwh * 1000) / (hoursPerDay * s.d) : 0
  const saving = cur.monthly - cmp.monthly
  const saveYear = cur.yearly - cmp.yearly

  const breakdown: [string, number][] = (['base', 'energy', 'climate', 'fuel', 'vat', 'fund'] as (keyof Bill)[]).map(
    (k) => [k, (m.after[k] as number) - (m.before[k] as number)]
  )
  const partEntries = (Object.keys(parts) as (keyof typeof parts)[]).filter((k) => parts[k] > 0)

  const modelSelect = (label: string, models: [string, number][], value: number, onChange: (w: number) => void, extra?: [string, number]) => {
    const list = extra ? [extra, ...models] : models
    const match = list.find(([, w]) => w === value)
    return (
      <div>
        <label className="block text-sm font-medium text-body mb-2">{label}</label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ui-field px-3 py-2 flex-1 min-w-[200px]"
            value={match ? String(match[1]) : 'custom'}
            onChange={(e) => e.target.value !== 'custom' && onChange(Number(e.target.value))}
          >
            {list.map(([name, w]) => <option key={name} value={w}>{name} ({w}W)</option>)}
            <option value="custom">{t('custom')}</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            className="ui-field px-3 py-2 w-24"
            value={value}
            min={0}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${label} (W)`}
          />
          <span className="text-sm text-muted">{t('watt')}</span>
        </div>
      </div>
    )
  }

  const numRow = (label: string, k: keyof State, unit: string, step = 1) => (
    <div>
      <label className="block text-sm font-medium text-body mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" inputMode="decimal" step={step} className="ui-field px-3 py-2 w-full" value={s[k]} min={LIMITS[k][0]} max={LIMITS[k][1]} onChange={(e) => set(k, Number(e.target.value))} />
        <span className="text-sm text-muted whitespace-nowrap">{unit}</span>
      </div>
    </div>
  )

  const partLabel: Record<keyof typeof parts, string> = {
    cpu: t('components.cpuLabel'), gpu: t('components.gpuLabel'), ram: t('components.ramLabel'),
    storage: t('components.storageLabel'), monitor: t('components.monitorLabel'), etc: t('components.etcLabel'),
  }
  const limits = TARIFF.limits[season]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 결과 — 모바일에서 먼저 보이도록 DOM 앞쪽, 데스크톱에선 오른쪽 열 */}
        <div className="space-y-4 lg:col-start-3 lg:row-start-1">
          <div className="ui-hero p-6">
            <p className="text-sm text-white/70">{flat ? t('result.flatMonthly') : t('result.addedMonthly')}</p>
            <p className="text-3xl font-bold tabular-nums mt-1" aria-live="polite" aria-atomic="true">{won(cur.monthly)}{t('result.won')}</p>
            <p className="text-sm text-white/70 mt-2 tabular-nums">
              {t('result.yearlyShort', { v: won(cur.yearly) })} · {fmt(cur.kwh)} {t('result.kwh')}/{t('usage.month')}
            </p>
            {!flat && <p className="text-xs text-white/70 mt-1">{t('result.yearlyNote')}</p>}
          </div>

          {/* 공유: 링크(URL 파라미터)로 같은 결과 재현 */}
          <ShareResult
            card={{
              tool: t('title'),
              label: flat ? t('result.flatMonthly') : t('result.addedMonthly'),
              headline: `${won(cur.monthly)}${t('result.won')}`,
              sub: `${t('result.yearlyShort', { v: won(cur.yearly) })} · ${fmt(cur.kwh)} ${t('result.kwh')}/${t('usage.month')}`,
              rows: [
                { label: t('result.totalWatt'), value: `${won(totalWatt)}W` },
                { label: t('usage.hoursPerDay'), value: `${fmt(hoursPerDay)}${t('usage.hours')} × ${s.d}${t('usage.days')}` },
                { label: t('result.monthlyKwh'), value: `${fmt(cur.kwh)} ${t('result.kwh')}` },
                ...(flat ? [] : [{ label: t('result.tierMove'), value: `${t('result.tierLabel', { n: m.before.tier })} → ${t('result.tierLabel', { n: m.after.tier })}` }]),
              ],
            }}
            text={t('share.text', { w: won(totalWatt), v: won(cur.monthly) })}
            fileName="pc-electricity"
          />

          <div className="ui-card p-5 space-y-3 text-sm">
            <Row label={t('result.totalWatt')} value={`${won(totalWatt)}W`} />
            <Row label={t('result.avgWatt')} value={`${fmt(avgWatt)}W`} />
            <Row label={t('result.monthlyKwh')} value={`${fmt(cur.kwh)} ${t('result.kwh')}`} />
            <Row label={t('result.yearlyKwh')} value={`${fmt(cur.kwh * 12)} ${t('result.kwh')}`} />
            {!flat && cur.kwh > 0 && (
              <Row label={t('result.unitCost')} value={`${fmt(cur.monthly / cur.kwh)}${t('tariff.wonPerKwh')}`} />
            )}
          </div>

          {!flat && (
            <div className="ui-card p-5 space-y-3 text-sm">
              <Row
                label={t('result.tierMove')}
                value={`${t('result.tierLabel', { n: m.before.tier })} → ${t('result.tierLabel', { n: m.after.tier })}`}
              />
              <Row label={t('result.householdBill')} value={`${won(m.before.total)} → ${won(m.after.total)}${t('result.won')}`} />
              {m.after.tier > m.before.tier && (
                <p className="rounded-xl bg-amber-50 text-amber-800 p-3 text-xs">
                  {t('result.tierUpWarning', { from: m.before.tier, to: m.after.tier })}
                </p>
              )}
              <div className="border-t border-line pt-3 space-y-2">
                <p className="font-medium text-fg">{t('result.breakdown')}</p>
                {breakdown.map(([k, v]) => (
                  <Row key={k} label={t(`result.${k}`)} value={`${won(v)}${t('result.won')}`} muted />
                ))}
              </div>
            </div>
          )}

          <div className="ui-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-fg">{t('compare.title')}</h3>
            <select className="ui-field px-3 py-2 w-full text-sm" value={s.cmp} onChange={(e) => set('cmp', Number(e.target.value))}>
              {!GPU_MODELS.some(([, w]) => w === s.cmp) && s.cmp !== 0 && <option value={s.cmp}>{s.cmp}W</option>}
              <option value={0}>{t('gpuIntegrated')} (0W)</option>
              {GPU_MODELS.map(([name, w]) => <option key={name} value={w}>{name} ({w}W)</option>)}
            </select>
            <p className="text-sm text-sub">
              {s.gpu}W → {s.cmp}W · {saving >= 0 ? t('compare.saving') : t('compare.extra')}
            </p>
            <p className="text-xl font-bold text-fg tabular-nums">
              {t('compare.monthly')} {won(Math.abs(saving))}{t('result.won')}
              <span className="text-sm font-medium text-muted ml-2">{t('compare.yearly')} {won(Math.abs(saveYear))}{t('result.won')}</span>
            </p>
          </div>
        </div>

        {/* 입력 */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('sections.parts')}</h2>
            {modelSelect(t('components.cpuLabel'), CPU_MODELS, s.cpu, (w) => set('cpu', w))}
            {modelSelect(t('components.gpuLabel'), GPU_MODELS, s.gpu, (w) => set('gpu', w), [t('gpuIntegrated'), 0])}

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('components.ramLabel')} ({t('ram.perSlot')})</label>
                <select className="ui-field px-3 py-2 w-full" value={s.ram} onChange={(e) => set('ram', Number(e.target.value))}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{t('ram.slots')} {n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('storage.ssd')}</label>
                <select className="ui-field px-3 py-2 w-full" value={s.ssd} onChange={(e) => set('ssd', Number(e.target.value))}>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}{t('storage.count')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('storage.hdd')}</label>
                <select className="ui-field px-3 py-2 w-full" value={s.hdd} onChange={(e) => set('hdd', Number(e.target.value))}>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}{t('storage.count')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('components.monitorLabel')}</label>
              <div className="flex flex-wrap items-center gap-2">
                {MONITOR_PRESETS.map((p) => (
                  <button key={p.size} type="button" className={seg(s.mon === p.watt)} onClick={() => set('mon', p.watt)}>
                    {p.size}{t('monitor.inch')} ({p.watt}W)
                  </button>
                ))}
                <input type="number" inputMode="numeric" className="ui-field px-3 py-1.5 w-20" value={s.mon} min={0} onChange={(e) => set('mon', Number(e.target.value))} aria-label={`${t('components.monitorLabel')} (W)`} />
                <span className="text-sm text-muted">{t('watt')}</span>
                <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                  <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={!!s.dual} onChange={(e) => set('dual', e.target.checked ? 1 : 0)} />
                  <span className="text-sm text-body">{t('monitor.dual')}</span>
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {numRow(t('components.etc'), 'etc', t('watt'))}
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('psu.title')}</label>
                <select className="ui-field px-3 py-2 w-full" value={s.psu} onChange={(e) => set('psu', Number(e.target.value))}>
                  {PSU_OPTIONS.map(([k, v]) => <option key={k} value={v}>{t(`psu.${k}`)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ui-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('usage.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('usage.profileHint', { h: fmt(hoursPerDay) })}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {numRow(t('load.gaming'), 'g', t('usage.hours'), 0.5)}
              {numRow(t('load.normal'), 'w', t('usage.hours'), 0.5)}
              {numRow(t('load.idle'), 'i', t('usage.hours'), 0.5)}
            </div>
            {hoursPerDay > 24 && <p className="text-xs text-red-600">{t('usage.over24')}</p>}
            <div className="flex flex-wrap gap-2">
              {(['gamer', 'office', 'server'] as const).map((p) => {
                const v = { gamer: [4, 2, 0], office: [0, 8, 2], server: [0, 0, 24] }[p]
                const active = s.g === v[0] && s.w === v[1] && s.i === v[2]
                return (
                  <button key={p} type="button" className={seg(active)} onClick={() => setS((o) => ({ ...o, g: v[0], w: v[1], i: v[2] }))}>
                    {t(`usage.preset.${p}`)}
                  </button>
                )
              })}
            </div>
            <div className="sm:w-1/3">{numRow(t('usage.daysPerMonth'), 'd', t('usage.days'))}</div>
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('tariff.title')}</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={seg(!flat)} onClick={() => set('rate', 0)}>{t('tariff.progressive')}</button>
              <button type="button" className={seg(flat)} onClick={() => set('rate', 200)}>{t('tariff.custom')}</button>
            </div>

            {flat ? (
              <div className="flex items-center gap-2">
                <input type="number" inputMode="decimal" className="ui-field px-3 py-2 w-32" value={s.rate} min={1} onChange={(e) => set('rate', Math.max(1, Number(e.target.value)))} />
                <span className="text-sm text-muted">{t('tariff.wonPerKwh')}</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">{t('household.title')}</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="number" inputMode="numeric" className="ui-field px-3 py-2 w-28" value={s.hh} min={0} onChange={(e) => set('hh', Number(e.target.value))} />
                    <span className="text-sm text-muted">{t('result.kwh')}</span>
                    {HOUSEHOLD_PRESETS.map((v) => (
                      <button key={v} type="button" className={seg(s.hh === v)} onClick={() => set('hh', v)}>{v}kWh</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">{t('household.hint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-2">{t('season.title')}</label>
                  <div className="flex flex-wrap gap-2">
                    {(['normal', 'summer'] as Season[]).map((v) => (
                      <button key={v} type="button" className={seg(season === v)} onClick={() => setSeason(v)}>{t(`season.${v}`)}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-subtle rounded-2xl p-4 text-xs text-sub space-y-1">
                  <p>{t('tariff.tierRange', { a: limits[0], b: limits[1] })}</p>
                  <p>{t('tariff.extras')}</p>
                </div>
              </>
            )}
          </div>

          <div className="ui-card p-6">
            <h3 className="text-sm font-semibold text-fg mb-4">{t('ratio.title')}</h3>
            <div className="space-y-3">
              {partEntries.map((k) => {
                const pct = (parts[k] / (totalWatt || 1)) * 100
                return (
                  <div key={k}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-body">{partLabel[k]}</span>
                      <span className="text-muted tabular-nums">{parts[k]}W ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-track overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {(['section3', 'section1', 'section2'] as const).map((sec) => {
            const items = t.raw(`guide.${sec}.items`)
            if (!Array.isArray(items)) return null
            return (
              <div key={sec}>
                <h3 className="font-medium text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
                <ul className="space-y-2 list-disc pl-4">
                  {(items as string[]).map((item, i) => <li key={i} className="text-sm text-sub">{item}</li>)}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={muted ? 'text-muted' : 'text-sub'}>{label}</span>
      <span className="text-fg font-medium tabular-nums text-right">{value}</span>
    </div>
  )
}
