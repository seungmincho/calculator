'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/alcoholCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  PRESETS, KINDS, R, BETA, LIMIT, somaek, bacAt, hoursUntil, peak, status, series, totalGrams, sojuBottles,
  clockAt, elapsedH, parseHM, fmtHM, encodeDrinks, decodeDrinks, type Drink, type Kind, type Gender,
} from '@/utils/alcohol'

const DEFAULT_DRINKS: Drink[] = [
  { kind: 'sojuBottle', ...PRESETS.sojuBottle, n: 1, t: 0 },
  { kind: 'beer500', ...PRESETS.beer500, n: 1, t: 1 },
]
const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => i / 2) // 시작 후 0~8시간
const SOMAEK_RATIOS: [number, number][] = [[50, 150], [60, 140], [70, 130], [100, 200]]
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString()

export default function AlcoholCalculator() {
  const t = useTranslations('alcoholCalculator')
  const sp = useSearchParams()

  const [gender, setGender] = useState<Gender>(() => (sp.get('gender') === 'female' ? 'female' : 'male'))
  const [weight, setWeight] = useState<number>(() => {
    const w = parseFloat(sp.get('weight') ?? '')
    return w >= 30 && w <= 250 ? w : 70
  })
  const [start, setStart] = useState<number>(() => parseHM(sp.get('start')) ?? 20 * 60)
  const [nowMin, setNowMin] = useState<number>(() => (parseHM(sp.get('start')) ?? 20 * 60) + 120)
  const [drinks, setDrinks] = useState<Drink[]>(() => decodeDrinks(sp.get('d')) ?? DEFAULT_DRINKS)
  const [sm, setSm] = useState<[number, number]>([50, 150])

  // 실제 현재 시각은 마운트 후 반영(SSR 일치). 공유 링크가 없으면 '2시간 전 시작'으로 기본값.
  useEffect(() => {
    const d = new Date()
    const cur = d.getHours() * 60 + d.getMinutes()
    setNowMin(cur)
    if (parseHM(sp.get('start')) == null) setStart(Math.floor((cur - 120 + 1440) / 30) * 30 % 1440)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('gender', gender)
    url.searchParams.set('weight', String(weight))
    url.searchParams.set('start', fmtHM(start))
    url.searchParams.set('d', encodeDrinks(drinks))
    ;['duration', 'timeSince'].forEach((k) => url.searchParams.delete(k)) // 구버전 파라미터
    window.history.replaceState({}, '', url)
  }, [gender, weight, start, drinks])

  const r = R[gender]
  const kg = weight > 0 ? weight : 70
  const elapsed = elapsedH(start, nowMin)

  const res = useMemo(() => {
    const cur = bacAt(drinks, kg, r, BETA.typical, elapsed)
    const zeroSlow = hoursUntil(drinks, kg, r, BETA.slow)
    const g = totalGrams(drinks)
    return {
      cur,
      lo: bacAt(drinks, kg, r, BETA.fast, elapsed),
      hi: bacAt(drinks, kg, r, BETA.slow, elapsed),
      zeroSlow,
      zeroTypical: hoursUntil(drinks, kg, r, BETA.typical),
      pk: peak(drinks, kg, r, BETA.typical),
      g,
      bottles: sojuBottles(g),
      chart: series(drinks, kg, r, Math.max(zeroSlow, elapsed) + 1, 0.25),
    }
  }, [drinks, kg, r, elapsed])

  const dayLabel = (day: number) => t(`u.day${Math.min(day, 2)}`)
  const clock = (h: number) => {
    const c = clockAt(start, h)
    return `${dayLabel(c.day)} ${c.hm}`
  }
  const st = status(res.hi) // 상태는 보수적(느린 분해) 값으로
  const zeroClock = clockAt(start, res.zeroSlow)
  // 다음날 새벽 5시 이후까지 남으면 아침 운전 경고
  const morning = drinks.length > 0 && start + res.zeroSlow * 60 > 1440 + 5 * 60
  const summary = t('u.summary', { n: fmt1(res.bottles) })
  const zeroH = fmt1(res.zeroSlow)

  const add = (kind: Kind, over?: { ml: number; abv: number }) => {
    const last = drinks.length ? drinks[drinks.length - 1].t : 0
    setDrinks((p) => [...p, { kind, ...PRESETS[kind], ...over, n: 1, t: last }])
  }
  const upd = (i: number, patch: Partial<Drink>) => setDrinks((p) => p.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const num = (v: string, max: number) => Math.min(max, Math.max(0, Number(v) || 0))
  const smDrink = somaek(sm[0], sm[1])

  const legalRows = t.raw('u.legalRows') as { range: string; admin: string; penalty: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('gender')}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g} onClick={() => setGender(g)} aria-pressed={gender === g}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${gender === g ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {t(g)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="alc-weight" className="block text-sm font-medium text-body mb-2">{t('weight')}</label>
              <input id="alc-weight" type="number" inputMode="decimal" min={30} max={250} value={weight}
                onChange={(e) => setWeight(num(e.target.value, 250))} className="ui-field px-4 py-3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="alc-start" className="block text-sm font-medium text-body mb-2">{t('u.startTime')}</label>
                <input id="alc-start" type="time" value={fmtHM(start)}
                  onChange={(e) => { const m = parseHM(e.target.value); if (m != null) setStart(m) }} className="ui-field px-3 py-3" />
              </div>
              <div>
                <label htmlFor="alc-now" className="block text-sm font-medium text-body mb-2">{t('u.nowTime')}</label>
                <input id="alc-now" type="time" value={fmtHM(nowMin)}
                  onChange={(e) => { const m = parseHM(e.target.value); if (m != null) setNowMin(m) }} className="ui-field px-3 py-3" />
              </div>
            </div>
            <p className="text-xs text-muted">{t('u.nowNote')}</p>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-fg">{t('u.presetTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.filter((k) => k !== 'somaek').map((k) => (
                <button key={k} onClick={() => add(k)}
                  className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-2 text-xs text-left">
                  <span className="block font-medium">{t(`u.kinds.${k}`)}</span>
                  {k !== 'custom' && <span className="block text-muted tabular-nums">{PRESETS[k].ml}ml · {PRESETS[k].abv}%</span>}
                </button>
              ))}
            </div>
            <div className="bg-subtle rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium text-body">{t('u.somaekTitle')}</p>
              <div className="flex flex-wrap gap-1.5">
                {SOMAEK_RATIOS.map(([a, b]) => (
                  <button key={`${a}-${b}`} onClick={() => setSm([a, b])}
                    className={`px-2.5 py-1 rounded-full text-xs tabular-nums ${sm[0] === a && sm[1] === b ? 'bg-primary text-white' : 'bg-surface text-body border border-line'}`}>
                    {a}:{b}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-sub">{t('u.somaekSoju')}
                  <input type="number" min={0} value={sm[0]} onChange={(e) => setSm([num(e.target.value, 1000), sm[1]])} className="ui-field px-3 py-2 mt-1" />
                </label>
                <label className="text-xs text-sub">{t('u.somaekBeer')}
                  <input type="number" min={0} value={sm[1]} onChange={(e) => setSm([sm[0], num(e.target.value, 2000)])} className="ui-field px-3 py-2 mt-1" />
                </label>
              </div>
              <button onClick={() => add('somaek', smDrink)} disabled={smDrink.ml <= 0} className="ui-btn w-full px-4 py-2.5 text-sm">
                <Plus className="w-4 h-4" />{t('u.somaekAdd', { ml: smDrink.ml, abv: smDrink.abv })}
              </button>
            </div>
          </div>

          <div className="ui-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">{t('drinks')}</h2>
              {drinks.length > 0 && <button onClick={() => setDrinks([])} className="text-xs text-muted hover:text-body">{t('reset')}</button>}
            </div>
            {drinks.length === 0 && <p className="text-sm text-muted py-4 text-center">{t('addDrinksPrompt')}</p>}
            {drinks.map((d, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-fg">{t(`u.kinds.${d.kind}`)}</span>
                  <button onClick={() => setDrinks((p) => p.filter((_, j) => j !== i))} aria-label={t('removeDrink')}
                    className="p-1.5 rounded-lg text-muted hover:text-body hover:bg-soft"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <label className="text-[11px] text-sub">{t('u.ml')}
                    <input type="number" min={0} value={d.ml} onChange={(e) => upd(i, { ml: num(e.target.value, 5000) })} className="ui-field px-2 py-1.5 text-sm mt-0.5" />
                  </label>
                  <label className="text-[11px] text-sub">{t('u.abv')}
                    <input type="number" min={0} max={100} step={0.1} value={d.abv} onChange={(e) => upd(i, { abv: num(e.target.value, 100) })} className="ui-field px-2 py-1.5 text-sm mt-0.5" />
                  </label>
                  <label className="text-[11px] text-sub">{t('u.count')}
                    <input type="number" min={0} step={0.5} value={d.n} onChange={(e) => upd(i, { n: num(e.target.value, 50) })} className="ui-field px-2 py-1.5 text-sm mt-0.5" />
                  </label>
                  <label className="text-[11px] text-sub">{t('u.drinkAt')}
                    <select value={d.t} onChange={(e) => upd(i, { t: Number(e.target.value) })} className="ui-field px-1 py-1.5 text-sm mt-0.5">
                      {(TIME_OPTIONS.includes(d.t) ? TIME_OPTIONS : [...TIME_OPTIONS, d.t].sort((a, b) => a - b)).map((h) => (
                        <option key={h} value={h}>{fmtHM(start + h * 60)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6 sm:p-8">
            <p className="text-sm text-white/70">{t('u.heroLabel', { time: fmtHM(nowMin) })}</p>
            <p className="text-4xl font-bold mt-1 tabular-nums">{res.cur.toFixed(3)}%</p>
            <p className="text-sm text-white/80 mt-1 tabular-nums">
              {t(`u.status.${st}`)} · {t('u.heroRange', { lo: res.lo.toFixed(3), hi: res.hi.toFixed(3) })}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className="text-white/70">{t('u.zeroAt')}</p>
                <p className="text-xl font-bold tabular-nums">{drinks.length ? `${dayLabel(zeroClock.day)} ${zeroClock.hm}` : '-'}</p>
                <p className="text-white/70 text-xs mt-0.5">{t('u.zeroIn', { h: zeroH })}</p>
              </div>
              <div>
                <p className="text-white/70">{t('u.peak')}</p>
                <p className="text-xl font-bold tabular-nums">{res.pk.bac.toFixed(3)}%</p>
                <p className="text-white/70 text-xs mt-0.5">{t('u.alcoholG', { g: Math.round(res.g), n: fmt1(res.bottles) })}</p>
              </div>
            </div>
            <p className="mt-6 pt-4 border-t border-white/20 text-sm font-semibold">{t('u.noDrive')}</p>
          </div>

          {drinks.length > 0 && (
            <ShareResult
              card={{
                tool: t('title'),
                label: summary,
                headline: t('u.share.headline', { h: zeroH }),
                sub: t('u.share.sub'),
                rows: [
                  { label: t('u.zeroAt'), value: `${dayLabel(zeroClock.day)} ${zeroClock.hm}` },
                  { label: t('u.peak'), value: `${res.pk.bac.toFixed(3)}%` },
                  { label: t('u.share.alcohol'), value: `${Math.round(res.g)}g` },
                ],
              }}
              text={t('u.share.text', { summary, h: zeroH })}
              fileName="alcohol-calculator"
            />
          )}

          {morning && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">{t('u.morningTitle')}</p>
                <p className="mt-1">{t('u.morningBody', { time: `${dayLabel(zeroClock.day)} ${zeroClock.hm}` })}</p>
              </div>
            </div>
          )}

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.chartTitle')}</h2>
            <p className="text-xs text-muted mt-1">{t('u.chartNote')}</p>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={res.chart} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="h" type="number" domain={[0, 'dataMax']} tickFormatter={(h: number) => fmtHM(start + h * 60)}
                    tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis tickFormatter={(v: number) => v.toFixed(2)} tick={{ fontSize: 11, fill: 'var(--muted)' }} domain={[0, (m: number) => Math.max(0.1, m)]} />
                  <Tooltip
                    labelFormatter={(h) => clock(Number(h ?? 0))}
                    formatter={(v, name) => [`${Number(v ?? 0).toFixed(3)}%`, name === 'slow' ? t('u.chartSlow') : t('u.chartTypical')]}
                  />
                  <ReferenceLine y={LIMIT.suspend} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: t('u.lineSuspend'), position: 'insideTopRight', fontSize: 10, fill: '#b45309' }} />
                  <ReferenceLine y={LIMIT.revoke} stroke="#ef4444" strokeDasharray="4 3" label={{ value: t('u.lineRevoke'), position: 'insideTopRight', fontSize: 10, fill: '#dc2626' }} />
                  <ReferenceLine x={elapsed} stroke="var(--fg)" strokeDasharray="2 3" label={{ value: t('u.lineNow'), position: 'top', fontSize: 10, fill: 'var(--fg)' }} />
                  <Line type="linear" dataKey="typical" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                  <Line type="linear" dataKey="slow" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.legalTitle')}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-line">
                    <th className="py-2 pr-3 font-medium">{t('u.legalHead.range')}</th>
                    <th className="py-2 pr-3 font-medium">{t('u.legalHead.admin')}</th>
                    <th className="py-2 font-medium">{t('u.legalHead.penalty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {legalRows.map((row) => (
                    <tr key={row.range} className="border-b border-line last:border-0 text-body">
                      <td className="py-2 pr-3 font-medium text-fg whitespace-nowrap tabular-nums">{row.range}</td>
                      <td className="py-2 pr-3">{row.admin}</td>
                      <td className="py-2">{row.penalty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('u.legalNote')}</p>
          </div>

          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            <p className="font-semibold text-body">{t('warning')}</p>
            <p>{t('u.assumptions')}</p>
          </div>
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['formula', 'factors'] as const).map((s) => (
          <div key={s}>
            <h3 className="font-medium text-fg mb-2">{t(`guide.${s}.title`)}</h3>
            <ul className="bg-subtle rounded-2xl p-4 space-y-1.5 text-sm text-body list-disc list-inside">
              {(t.raw(`guide.${s}.items`) as string[]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <GuideSection namespace="alcoholCalculator" />
    </div>
  )
}
