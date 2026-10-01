'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import { STORAGE_KEYS } from '@/utils/localStorage'
import {
  STANDARDS, CLASSES, CUTS, GAUGE, ABDOMINAL, analyze, classRanges, gaugePos, waistCheck, ageNote, parseStd, valid,
  bmi, round1, sanitizeLog, upsertLog, fromLegacy, LOG_KEY,
  type Standard, type BmiClass, type Sex, type LogEntry,
} from '@/utils/bmi'

const f1 = (n: number) => round1(n).toFixed(1)
/** URL 값 → 범위 안이면 문자열, 아니면 기본값 */
const pick = (v: string | null, min: number, max: number, def: string) => {
  const n = parseFloat(v ?? '')
  return n >= min && n <= max ? String(n) : def
}
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BMICalculator() {
  const t = useTranslations('bmi')
  const sp = useSearchParams()

  const [sex, setSex] = useState<Sex>(() => (sp.get('gender') === 'female' ? 'female' : 'male'))
  const [height, setHeight] = useState(() => pick(sp.get('height'), 50, 250, '170'))
  const [weight, setWeight] = useState(() => pick(sp.get('weight'), 10, 400, '65'))
  const [age, setAge] = useState(() => pick(sp.get('age'), 1, 120, ''))
  const [waist, setWaist] = useState(() => pick(sp.get('waist'), 40, 200, ''))
  const [std, setStd] = useState<Standard>(() => parseStd(sp.get('std')))
  const [log, setLog] = useState<LogEntry[]>([])

  // 기록 불러오기. 새 기록이 없으면 예전 '계산 기록'(calculation_history)에서 한 번 이전
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOG_KEY)
      if (raw != null) { setLog(sanitizeLog(JSON.parse(raw))); return }
      const legacy = fromLegacy(JSON.parse(localStorage.getItem(STORAGE_KEYS.CALCULATION_HISTORY) ?? '[]'))
      setLog(legacy)
      localStorage.setItem(LOG_KEY, JSON.stringify(legacy))
    } catch { /* 저장소 없음 */ }
  }, [])
  const saveLog = (next: LogEntry[]) => {
    setLog(next)
    try { localStorage.setItem(LOG_KEY, JSON.stringify(next)) } catch { /* 저장 불가 */ }
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
    set('height', height)
    set('weight', weight)
    set('gender', sex)
    set('age', age)
    set('waist', waist)
    set('std', std === 'who' ? 'who' : null)
    window.history.replaceState({}, '', url)
  }, [sex, height, weight, age, waist, std])

  const h = Number(height) || 0
  const w = Number(weight) || 0
  const ok = valid(h, w)
  const r = useMemo(() => (ok ? analyze(h, w, std) : null), [ok, h, w, std])
  const rows = useMemo(() => (ok ? classRanges(h, std) : []), [ok, h, std])
  const wc = r ? waistCheck(sex, Number(waist) || 0, h, r.cls, std) : null
  const note = ageNote(Number(age) || 0)

  const cls = (c: BmiClass) => t(`u.cls.${std}.${c}`)
  const toNormalText = (kg: number) => (kg === 0 ? t('u.inNormal') : t(kg < 0 ? 'u.lose' : 'u.gain', { kg: f1(Math.abs(kg)) }))
  const bmiRange = (min: number | null, max: number | null) =>
    min == null ? `< ${CUTS[std][0]}` : max == null ? `≥ ${min}` : `${min.toFixed(1)}–${max.toFixed(1)}`
  const kgRange = (min: number | null, max: number | null) =>
    min == null ? `≤ ${f1(max!)}kg` : max == null ? `≥ ${f1(min)}kg` : `${f1(min)}–${f1(max)}kg`

  const delta = log.length > 1
    ? { w: log[log.length - 1].w - log[0].w, b: bmi(log[log.length - 1].h, log[log.length - 1].w) - bmi(log[0].h, log[0].w) }
    : null
  const chartData = log.map((e) => ({ d: e.d, bmi: round1(bmi(e.h, e.w)), w: e.w }))

  const numField = (label: string, value: string, set: (v: string) => void, unit: string, placeholder?: string, hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-body">
        {label} <span className="text-faint font-normal">({unit})</span>
        <input type="number" inputMode="decimal" step="0.1" min="0" value={value} placeholder={placeholder}
          onChange={(e) => set(e.target.value)} className="ui-field px-3 py-3 mt-1.5 tabular-nums font-normal" />
      </label>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )

  const [gLo, gHi] = GAUGE[std]
  const segs = [gLo, ...CUTS[std], gHi]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('input.gender')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setSex(g)} aria-pressed={sex === g}
                    className={`py-2.5 rounded-xl font-medium transition-colors ${sex === g ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {t(`input.${g}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numField(t('u.height'), height, setHeight, 'cm')}
              {numField(t('u.weight'), weight, setWeight, 'kg')}
            </div>
            <div className="border-t border-line pt-5 space-y-4">
              <p className="text-sm font-semibold text-fg">{t('u.optional')}</p>
              {numField(t('u.age'), age, setAge, t('u.unitAge'), t('u.agePlaceholder'), t('input.ageNote'))}
              {numField(t('u.waist'), waist, setWaist, 'cm', t('u.waistPlaceholder'), t('u.waistHint'))}
            </div>
            <div className="border-t border-line pt-5">
              <p className="text-sm font-medium text-body mb-2">{t('u.standard')}</p>
              <div className="grid grid-cols-2 gap-2">
                {STANDARDS.map((s) => (
                  <button key={s} type="button" onClick={() => setStd(s)} aria-pressed={std === s}
                    className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors ${std === s ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {t(`u.std.${s}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t(`u.stdNote.${std}`)}</p>
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          {!r ? (
            <div className="bg-subtle rounded-2xl p-8 text-center text-sub">{t('placeholder')}</div>
          ) : (
            <>
              {note === 'child' && (
                <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 flex gap-3 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{t('u.child.title')}</p>
                    <p className="mt-1">{t('u.child.body')}</p>
                    <a href="https://knhanes.kdca.go.kr/" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 font-medium underline">
                      {t('u.child.link')}
                    </a>
                  </div>
                </div>
              )}

              <div className="ui-hero p-6 sm:p-8">
                <p className="text-sm text-white/70">{t('u.heroLabel', { std: t(`u.std.${std}`) })}</p>
                <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                  <p className="text-5xl font-bold tabular-nums">{f1(r.bmi)}</p>
                  <p className="text-xl font-semibold">{cls(r.cls)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
                  <div>
                    <p className="text-white/70">{t('u.healthyRange')}</p>
                    <p className="text-xl font-bold tabular-nums">{f1(r.healthyMin)}–{f1(r.healthyMax)}kg</p>
                  </div>
                  <div>
                    <p className="text-white/70">{t('u.toNormal')}</p>
                    <p className="text-xl font-bold tabular-nums">{toNormalText(r.toNormal)}</p>
                  </div>
                  <div>
                    <p className="text-white/70">{t('u.standardKg')}</p>
                    <p className="text-xl font-bold tabular-nums">{f1(r.standardKg)}kg</p>
                  </div>
                </div>
              </div>

              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('u.share.label', { h: height, w: weight }),
                  headline: f1(r.bmi),
                  sub: `${cls(r.cls)} · ${t(`u.std.${std}`)}`,
                  rows: [
                    { label: t('u.healthyRange'), value: `${f1(r.healthyMin)}–${f1(r.healthyMax)}kg` },
                    { label: t('u.toNormal'), value: toNormalText(r.toNormal) },
                    { label: t('u.standardKg'), value: `${f1(r.standardKg)}kg` },
                    ...(wc ? [{ label: t('u.waistResult'), value: `${waist}cm · ${t(wc.abdominal ? 'u.abdYes' : 'u.abdNo')}` }] : []),
                  ],
                }}
                text={t('u.share.text', { bmi: f1(r.bmi), cls: cls(r.cls) })}
                fileName="bmi"
              />

              {/* 게이지 + 단계별 체중 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('u.gaugeTitle')}</h2>
                <div className="relative mt-4 pt-8" role="img" aria-label={t('u.gaugeAria', { bmi: f1(r.bmi), cls: cls(r.cls) })}>
                  <div className="absolute top-0 -translate-x-1/2 px-2 py-0.5 rounded-md bg-primary text-white text-xs font-bold tabular-nums"
                    style={{ left: `${Math.min(95, Math.max(5, gaugePos(r.bmi, std)))}%` }}>
                    {f1(r.bmi)}
                  </div>
                  <div className="flex h-3 gap-0.5">
                    {CLASSES.map((c, i) => (
                      <div key={c} className={`h-full first:rounded-l-full last:rounded-r-full ${c === r.cls ? 'bg-primary' : c === 'normal' ? 'bg-primary/25' : 'bg-track'}`}
                        style={{ width: `${((segs[i + 1] - segs[i]) / (gHi - gLo)) * 100}%` }} />
                    ))}
                  </div>
                  <div className="absolute top-7 h-5 w-0.5 -ml-px bg-fg" style={{ left: `${gaugePos(r.bmi, std)}%` }} />
                  <div className="relative h-5 mt-1.5 text-xs text-muted tabular-nums">
                    {CUTS[std].map((c) => (
                      <span key={c} className="absolute -translate-x-1/2" style={{ left: `${gaugePos(c, std)}%` }}>{c}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted mt-1">{t('u.gaugeNote')}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {r.toLower != null && (
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-xs text-muted">{t('u.toClass', { cls: cls(CLASSES[CLASSES.indexOf(r.cls) - 1]) })}</p>
                      <p className="text-xl font-bold text-fg tabular-nums">−{f1(r.toLower)}kg</p>
                    </div>
                  )}
                  {r.toUpper != null && (
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-xs text-muted">{t('u.toClass', { cls: cls(CLASSES[CLASSES.indexOf(r.cls) + 1]) })}</p>
                      <p className="text-xl font-bold text-fg tabular-nums">+{f1(r.toUpper)}kg</p>
                    </div>
                  )}
                </div>

                <table className="w-full mt-5 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-line">
                      <th className="py-2 pr-2 font-medium">{t('u.colClass')}</th>
                      <th className="py-2 pr-2 font-medium">BMI</th>
                      <th className="py-2 font-medium text-right">{t('u.colKg', { h: height })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const cur = row.c === r.cls
                      return (
                        <tr key={row.c} className={cur ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}>
                          <td className="py-2 px-2 rounded-l-lg">{cls(row.c)}{cur && <span className="sr-only"> ({t('u.current')})</span>}</td>
                          <td className="py-2 pr-2 tabular-nums">{bmiRange(row.bmiMin, row.bmiMax)}</td>
                          <td className="py-2 px-2 tabular-nums text-right rounded-r-lg">{kgRange(row.kgMin, row.kgMax)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-muted mt-3">{t(`u.source.${std}`)}</p>
              </div>

              {/* 허리둘레 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('u.waistTitle')}</h2>
                {!wc ? (
                  <p className="text-sm text-muted mt-2">{t('u.waistEmpty', { cut: ABDOMINAL[sex] })}</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-xs text-muted">{t('u.abdTitle', { sex: t(`input.${sex}`), cut: ABDOMINAL[sex] })}</p>
                      <p className={`text-xl font-bold ${wc.abdominal ? 'text-amber-700' : 'text-fg'}`}>{t(wc.abdominal ? 'u.abdYes' : 'u.abdNo')}</p>
                    </div>
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-xs text-muted">{t('u.whtr')}</p>
                      <p className={`text-xl font-bold tabular-nums ${wc.ratio >= 0.5 ? 'text-amber-700' : 'text-fg'}`}>{wc.ratio.toFixed(2)}</p>
                      <p className="text-xs text-muted mt-0.5">{t(wc.ratio >= 0.5 ? 'u.whtrHigh' : 'u.whtrOk')}</p>
                    </div>
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-xs text-muted">{t('u.riskTitle')}</p>
                      <p className="text-xl font-bold text-fg">{wc.risk ? t(`u.risk.${wc.risk}`) : '-'}</p>
                      {!wc.risk && <p className="text-xs text-muted mt-0.5">{t('u.riskKrOnly')}</p>}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted mt-3">{t('u.waistSource')}</p>
              </div>

              {note === 'senior' && (
                <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
                  <p className="font-semibold text-fg">{t('u.senior.title')}</p>
                  <p className="mt-1">{t('u.senior.body')}</p>
                </div>
              )}

              <p className="text-sm text-body">
                {t('u.nextSteps')}{' '}
                <Link href="/body-fat-calculator/" className="text-primary font-medium">{t('u.linkBodyFat')}</Link>
                {' · '}
                <Link href="/calorie-calculator/" className="text-primary font-medium">{t('u.linkCalorie')}</Link>
              </p>

              {/* 기록 */}
              <div className="ui-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-fg">{t('u.logTitle')}</h2>
                    <p className="text-xs text-muted mt-1">{t('u.logNote')}</p>
                  </div>
                  <button type="button" onClick={() => saveLog(upsertLog(log, { d: todayStr(), h, w }))}
                    className="ui-btn px-4 py-2 text-sm shrink-0">{t('u.logSave')}</button>
                </div>
                {log.length === 0 ? (
                  <p className="text-sm text-muted mt-4">{t('u.logEmpty')}</p>
                ) : (
                  <>
                    {delta && (
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-subtle rounded-xl p-3">
                          <p className="text-xs text-muted">{t('u.deltaW', { from: log[0].d })}</p>
                          <p className="font-bold text-fg tabular-nums">{delta.w > 0 ? '+' : ''}{f1(delta.w)}kg</p>
                        </div>
                        <div className="bg-subtle rounded-xl p-3">
                          <p className="text-xs text-muted">{t('u.deltaB')}</p>
                          <p className="font-bold text-fg tabular-nums">{delta.b > 0 ? '+' : ''}{f1(delta.b)}</p>
                        </div>
                      </div>
                    )}
                    {log.length > 1 && (
                      <div className="h-48 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <ReferenceArea y1={CUTS[std][0]} y2={CUTS[std][1]} fill="var(--primary)" fillOpacity={0.08} />
                            <XAxis dataKey="d" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v: number) => String(Math.round(v))} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <Tooltip formatter={(v) => [Number(v ?? 0).toFixed(1), 'BMI']} />
                            <Line type="monotone" dataKey="bmi" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <ul className="mt-4 divide-y divide-line text-sm">
                      {[...log].reverse().slice(0, 10).map((e) => {
                        const eb = round1(bmi(e.h, e.w))
                        return (
                          <li key={e.d} className="flex items-center justify-between gap-2 py-2">
                            <span className="text-muted tabular-nums">{e.d}</span>
                            <span className="text-body tabular-nums flex-1 text-right">{f1(e.w)}kg · BMI {f1(eb)}</span>
                            <button type="button" onClick={() => saveLog(log.filter((x) => x.d !== e.d))} aria-label={t('u.logDelete')}
                              className="p-1.5 rounded-lg text-faint hover:text-body hover:bg-soft">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* BMI의 의미 · 체중 관리 */}
      <div className="ui-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['meaning', 'management'] as const).map((k) => (
            <div key={k}>
              <h2 className="text-lg font-semibold text-fg mb-3">{t(`guide.${k}Title`)}</h2>
              <ul className="space-y-1.5 text-sm text-body list-disc pl-4">
                {[0, 1, 2, 3].map((i) => <li key={i}>{t(`guide.${k}.${i}`)}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <GuideSection namespace="bmi" defaultOpen />

      <p className="text-xs text-muted">{t('u.disclaimer')}</p>
    </div>
  )
}
