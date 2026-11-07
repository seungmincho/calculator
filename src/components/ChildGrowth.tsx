'use client'

import { useState, useSyncExternalStore } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/childGrowth'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import { MAX_MONTH, MPH_RANGE, Z97, ageMonths, bmiClass, bmiOf, lmsAt, midParental, rankOf, score, valueAtZ, type Score, type Sex } from '@/utils/childGrowth'

// URL 키: s 성별, a 나이 입력 방식(mo 개월·b 생년월일), mo 개월, b 생년월일, d 측정일, h 키, w 몸무게, f 아버지, m 어머니
const DEF = { s: 'm', a: 'mo', mo: '72', b: '', d: '', h: '116', w: '21', f: '175', m: '162' }
type Key = keyof typeof DEF
const KEYS = Object.keys(DEF) as Key[]
const ADULT = 216 // 만 18세
const num = (s: string) => (s.trim() === '' ? NaN : Number(s))
const r1 = (n: number) => Math.round(n * 10) / 10
const fmt1 = (n: number) => r1(n).toFixed(1)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const noop = () => () => {}
const todayIso = () => iso(new Date())
/** 날짜에서 n개월 전(말일 보정) — 개월 입력에서 생년월일 입력으로 바꿀 때 결과가 이어지게 */
const monthsBefore = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number)
  const first = new Date(y, m - 1 - n, 1)
  return iso(new Date(first.getFullYear(), first.getMonth(), Math.min(d, new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate())))
}
const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5)

export default function ChildGrowth() {
  const t = useTranslations('childGrowth')
  const hydrated = useHydrated()
  const sp = useSearchParams()
  const today = useSyncExternalStore(noop, todayIso, () => '')
  const [edit, setEdit] = useState<Partial<Record<Key, string>>>({})
  const f = Object.fromEntries(KEYS.map(k => [k, edit[k] ?? (hydrated ? sp.get(k) : null) ?? (k === 'd' ? today : DEF[k])])) as Record<Key, string>
  const sex: Sex = f.s === 'f' ? 'f' : 'm'
  const byBirth = f.a === 'b'

  const set = (patch: Partial<Record<Key, string>>) => {
    setEdit(prev => ({ ...prev, ...patch }))
    const next = { ...f, ...patch }
    const keys: Key[] = next.a === 'b' ? ['s', 'a', 'b', 'd', 'h', 'w', 'f', 'm'] : ['s', 'a', 'mo', 'h', 'w', 'f', 'm']
    history.replaceState(history.state, '', `?${new URLSearchParams(keys.map(k => [k, next[k]]))}`)
  }

  const months = byBirth ? ageMonths(f.b, f.d) : /^\d{1,3}$/.test(f.mo.trim()) ? Number(f.mo) : null
  const ageOk = months !== null && months <= MAX_MONTH
  const ageErr = byBirth ? (f.b && f.d && !ageOk ? (months === null ? 'errBirth' : 'errAge') : null) : f.mo.trim() && !ageOk ? 'errAge' : null
  const h = num(f.h), w = num(f.w)
  const hOk = h >= 30 && h <= 220, wOk = w >= 1 && w <= 200
  const mo = ageOk ? months : 0
  const sH = ageOk && hOk ? score(sex, 'height', mo, h) : null
  const sW = ageOk && wOk ? score(sex, 'weight', mo, w) : null
  const bmi = hOk && wOk ? bmiOf(h, w) : NaN
  const sB = ageOk && hOk && wOk ? score(sex, 'bmi', mo, bmi) : null
  const mph = midParental(sex, num(f.f), num(f.m))
  const adult = lmsAt(sex, 'height', ADULT)!
  const mphScore = mph ? score(sex, 'height', ADULT, mph.mid) : null
  const track = sH && mo < ADULT ? valueAtZ(adult, sH.z) : null

  const pText = (p: number) => (p < 0.1 ? t('result.pBelow') : p > 99.9 ? t('result.pAbove') : t('result.pValue', { p: fmt1(p) }))
  const sexName = t(sex === 'm' ? 'input.male' : 'input.female')
  const ageP = { sex: sexName, y: Math.floor(mo / 12), m: mo % 12, n: mo }
  const ageText = ageOk ? t('result.age', ageP) : ''

  const notes: string[] = []
  if (sH && sH.p < 3) notes.push(t('notes.heightLow'))
  if (sH && sH.p > 97) notes.push(t('notes.heightHigh'))
  if (sW && sW.p < 5) notes.push(t('notes.weightLow'))
  if (sW && sW.p > 97 && !sB) notes.push(t('notes.weightHigh'))
  const bClass = sB ? bmiClass(sB.p) : null
  if (bClass && bClass !== 'normal') notes.push(t(`notes.bmi.${bClass}`))

  // 성장 곡선: 아이 나이 앞뒤 4년(8년 폭), 0~227개월 안
  const lo = Math.max(0, Math.min((ageOk ? mo : 72) - 48, MAX_MONTH - 96))
  const chart = Array.from({ length: 97 }, (_, i) => {
    const l = lmsAt(sex, 'height', lo + i)!
    return { x: (lo + i) / 12, p3: r1(valueAtZ(l, -Z97)), p50: r1(l[1]), p97: r1(valueAtZ(l, Z97)) }
  })
  const ticks = Array.from({ length: 9 }, (_, i) => Math.ceil(chart[0].x) + i).filter(y => y <= chart[chart.length - 1].x)

  const rows: { key: 'height' | 'weight' | 'bmi'; value: string; s: Score | null; extra?: string }[] = [
    { key: 'height', value: hOk ? t('result.cm', { v: fmt1(h) }) : '—', s: sH },
    { key: 'weight', value: wOk ? t('result.kg', { v: fmt1(w) }) : '—', s: sW },
    { key: 'bmi', value: Number.isFinite(bmi) ? fmt1(bmi) : '—', s: sB, extra: bClass ? t(`result.bmiClass.${bClass}`) : ageOk && mo < 24 ? t('result.bmiUnder2') : undefined },
  ]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const field = 'ui-field px-4 py-3 w-full pr-12 tabular-nums min-h-[44px]'
  const seg = (on: boolean) => `min-h-[44px] rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const unit = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
  const numberInput = (id: string, k: Key, label: string, u: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} inputMode="decimal" autoComplete="off" className={field} value={f[k]} onChange={e => set({ [k]: decimal(e.target.value) })} />
        <span className={unit}>{u}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5 min-w-0">
          <MobileResultLink href="#child-growth-result" label={t('result.heightLabel')} value={sH ? pText(sH.p) : '—'} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>
          <div>
            <p id="cg-sex" className="text-sm font-medium text-body mb-1.5">{t('input.sex')}</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="cg-sex">
              {(['m', 'f'] as const).map(s => (
                <button key={s} type="button" aria-pressed={sex === s} onClick={() => set({ s })} className={seg(sex === s)}>
                  {t(s === 'm' ? 'input.male' : 'input.female')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p id="cg-age-mode" className="text-sm font-medium text-body mb-1.5">{t('input.ageMode')}</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="cg-age-mode">
              <button type="button" aria-pressed={!byBirth} onClick={() => set({ a: 'mo', ...(ageOk ? { mo: String(mo) } : {}) })} className={seg(!byBirth)}>{t('input.byMonths')}</button>
              <button type="button" aria-pressed={byBirth} onClick={() => set({ a: 'b', ...(!f.b && ageOk && f.d ? { b: monthsBefore(f.d, mo) } : {}) })} className={seg(byBirth)}>{t('input.byBirth')}</button>
            </div>
          </div>
          {byBirth ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div>
                <label htmlFor="cg-birth" className="block text-sm font-medium text-body mb-1.5">{t('input.birth')}</label>
                <input id="cg-birth" type="date" className="ui-field px-4 py-3 w-full min-h-[44px]" value={f.b} max={f.d || undefined} onChange={e => set({ b: e.target.value })} />
              </div>
              <div>
                <label htmlFor="cg-date" className="block text-sm font-medium text-body mb-1.5">{t('input.measured')}</label>
                <input id="cg-date" type="date" className="ui-field px-4 py-3 w-full min-h-[44px]" value={f.d} onChange={e => set({ d: e.target.value })} />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="cg-months" className="block text-sm font-medium text-body mb-1.5">{t('input.months')}</label>
              <div className="relative">
                <input id="cg-months" inputMode="numeric" autoComplete="off" className={field} value={f.mo} aria-describedby="cg-months-hint"
                  onChange={e => set({ mo: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                <span className={unit}>{t('input.monthUnit')}</span>
              </div>
              <p id="cg-months-hint" className="text-xs text-muted mt-1 tabular-nums">{ageOk ? t('input.monthsHint', { y: Math.floor(mo / 12), m: mo % 12 }) : t('input.monthsRange')}</p>
            </div>
          )}
          {ageErr && <p className="text-sm text-red-600" role="alert">{t(`input.${ageErr}`)}</p>}
          <div className="grid grid-cols-2 gap-3">
            {numberInput('cg-height', 'h', t('input.height'), 'cm')}
            {numberInput('cg-weight', 'w', t('input.weight'), 'kg')}
          </div>
          {((f.h.trim() && !hOk) || (f.w.trim() && !wOk)) && <p className="text-sm text-red-600" role="alert">{t('input.errBody')}</p>}
          <div className="border-t border-line pt-5 space-y-3">
            <p className="font-semibold text-fg">{t('input.parents')}</p>
            <div className="grid grid-cols-2 gap-3">
              {numberInput('cg-father', 'f', t('input.father'), 'cm')}
              {numberInput('cg-mother', 'm', t('input.mother'), 'cm')}
            </div>
            <p className="text-xs text-muted">{t('input.parentsHint')}</p>
          </div>
        </div>

        <div id="child-growth-result" className="lg:col-span-2 ui-card p-6 space-y-6 scroll-mt-20 min-w-0" aria-live="polite">
          <div>
            <p className="text-sm text-sub">{ageText || t('result.needAge')}</p>
            <p className="text-sm text-sub mt-3">{t('result.heightLabel')}</p>
            <p className="text-4xl font-bold text-fg tabular-nums mt-1">{sH ? pText(sH.p) : '—'}</p>
            {sH && <p className="text-base text-body mt-2">{t('result.rank.height', { n: rankOf(sH.p) })}</p>}
          </div>

          <ul className="divide-y divide-line border-y border-line">
            {rows.map(r => (
              <li key={r.key} className="py-4 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm font-medium text-body">{t(`result.${r.key}`)} <span className="text-fg font-semibold tabular-nums ml-1">{r.value}</span></span>
                  <span className="text-sm font-semibold text-fg tabular-nums">{r.s ? pText(r.s.p) : '—'}{r.extra && <span className="ml-2 font-normal text-sub">{r.extra}</span>}</span>
                </div>
                {r.s && (
                  <>
                    <div className="relative h-2 rounded-full bg-track" aria-hidden="true">
                      <span className="absolute inset-y-0 left-[3%] right-[3%] bg-line-strong rounded-full" />
                      <span className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-surface" style={{ left: `${Math.min(99.5, Math.max(0.5, r.s.p))}%` }} />
                    </div>
                    <p className="text-xs text-muted">{t(`result.rank.${r.key}`, { n: rankOf(r.s.p) })}</p>
                  </>
                )}
              </li>
            ))}
          </ul>

          {notes.length > 0 && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm space-y-2">
              {notes.map(n => <p key={n}>{n}</p>)}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="font-semibold text-fg">{t('predict.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-subtle rounded-2xl p-5">
                <p className="text-sm text-sub">{t('predict.mph')}</p>
                {mph ? (
                  <>
                    <p className="text-3xl font-bold text-fg tabular-nums mt-1">{t('result.cm', { v: fmt1(mph.mid) })}</p>
                    <p className="text-sm text-body mt-1 tabular-nums">{t('predict.range', { lo: fmt1(mph.lo), hi: fmt1(mph.hi), r: MPH_RANGE[sex] })}</p>
                    {mphScore && <p className="text-xs text-muted mt-2">{t('predict.mphPct', { p: pText(mphScore.p) })}</p>}
                  </>
                ) : <p className="text-sm text-muted mt-2">{t('predict.needParents')}</p>}
              </div>
              <div className="bg-subtle rounded-2xl p-5">
                <p className="text-sm text-sub">{t('predict.track')}</p>
                {track !== null ? (
                  <>
                    <p className="text-3xl font-bold text-fg tabular-nums mt-1">{t('result.cm', { v: fmt1(track) })}</p>
                    <p className="text-xs text-muted mt-2">{t('predict.trackNote')}</p>
                  </>
                ) : <p className="text-sm text-muted mt-2">{ageOk && mo >= ADULT ? t('predict.trackAdult') : t('predict.trackNeed')}</p>}
              </div>
            </div>
            <p className="text-xs text-muted">{t(sex === 'm' ? 'predict.formulaM' : 'predict.formulaF')} {t('predict.limits')}</p>
          </div>

          <p className="text-xs text-muted">{t('result.disclaimer')}</p>
          {sH && (
            <ShareResult
              card={{
                tool: t('share.tool'), label: t('share.label', ageP), headline: pText(sH.p), sub: t('result.rank.height', { n: rankOf(sH.p) }),
                rows: [
                  { label: t('result.height'), value: t('result.cm', { v: fmt1(h) }) },
                  ...(sW ? [{ label: t('result.weight'), value: `${t('result.kg', { v: fmt1(w) })} · ${pText(sW.p)}` }] : []),
                  ...(sB ? [{ label: t('result.bmi'), value: `${fmt1(bmi)} · ${pText(sB.p)}` }] : []),
                  ...(mph ? [{ label: t('predict.mph'), value: t('result.cm', { v: fmt1(mph.mid) }) }] : []),
                ],
              }}
              text={t('share.text', { ...ageP, h: fmt1(h), p: pText(sH.p), n: rankOf(sH.p) })}
            />
          )}
        </div>
      </div>

      <section className="ui-card p-6 space-y-3 min-w-0" aria-labelledby="cg-chart">
        <h2 id="cg-chart" className="text-xl font-semibold text-fg">{t('chart.title', { sex: sexName })}</h2>
        <p className="text-sm text-sub">{t('chart.desc')}</p>
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} ticks={ticks} tickFormatter={(y: number) => t('chart.year', { y })} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={44} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--fg)' }}
                labelFormatter={(x) => { const m = Math.round(Number(x ?? 0) * 12); return t('chart.age', { y: Math.floor(m / 12), m: m % 12 }) }}
                formatter={(v, name) => [t('result.cm', { v: fmt1(Number(v ?? 0)) }), name]}
              />
              <Line type="monotone" dataKey="p97" name={t('chart.p97')} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="p50" name={t('chart.p50')} stroke="var(--primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="p3" name={t('chart.p3')} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              {sH && <ReferenceDot x={mo / 12} y={h} r={6} fill="var(--fg)" stroke="var(--surface)" strokeWidth={2} ifOverflow="extendDomain" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted">{sH ? t('chart.child', { ...ageP, h: fmt1(h) }) : t('chart.noChild')} {t('chart.note')}</p>
      </section>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['how', 'criteria', 'tips'] as const).map(sec => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">{(t.raw(`guide.${sec}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map(q => (
              <details key={q.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{q.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{q.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">{sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{s.label}</a></li>)}</ul>
          <p className="text-xs text-muted">{t('guide.sources.method')}</p>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
