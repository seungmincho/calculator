'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/bodyFat'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  METHODS, ERR, ACE, CATEGORIES, ABDOMINAL, estimate, category, healthyRange, healthyStatus, composition, targetWeight,
  weeksToLose, abdominalObese, whtr, bmi, bmiClass, parseMethod, sanitizeLog, upsertLog, logDelta, LOG_KEY,
  type Sex, type Method, type LogEntry,
} from '@/utils/bodyFat'

const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const signed = (n: number) => `${n > 0 ? '+' : ''}${f1(n)}`
/** URL 값 → 범위 안이면 문자열, 아니면 기본값 */
const pick = (v: string | null, min: number, max: number, def: string) => {
  const n = parseFloat(v ?? '')
  return n >= min && n <= max ? String(n) : def
}
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BodyFatCalculator() {
  const t = useTranslations('bodyFat')
  const sp = useSearchParams()

  const [sex, setSex] = useState<Sex>(() => (sp.get('gender') === 'female' ? 'female' : 'male'))
  const [age, setAge] = useState(() => pick(sp.get('age'), 10, 100, '35'))
  const [height, setHeight] = useState(() => pick(sp.get('height'), 100, 250, '175'))
  const [weight, setWeight] = useState(() => pick(sp.get('weight'), 25, 300, '75'))
  const [neck, setNeck] = useState(() => pick(sp.get('neck'), 15, 80, '38'))
  const [waist, setWaist] = useState(() => pick(sp.get('waist'), 40, 200, '85'))
  const [hip, setHip] = useState(() => pick(sp.get('hip'), 50, 200, '96'))
  const [method, setMethod] = useState<Method>(() => parseMethod(sp.get('formula')))
  const [goalIn, setGoalIn] = useState<number | null>(() => {
    const g = parseFloat(sp.get('goal') ?? '')
    return g >= 5 && g <= 40 ? g : null
  })
  const [log, setLog] = useState<LogEntry[]>([])

  useEffect(() => {
    try { setLog(sanitizeLog(JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]'))) } catch { /* 없음 */ }
  }, [])
  const saveLog = (next: LogEntry[]) => {
    setLog(next)
    try { localStorage.setItem(LOG_KEY, JSON.stringify(next)) } catch { /* 저장 불가 */ }
  }

  const goal = goalIn ?? (sex === 'male' ? 15 : 23)

  useEffect(() => {
    const url = new URL(window.location.href)
    const set = { gender: sex, age, height, weight, neck, waist, formula: method } as Record<string, string>
    Object.entries(set).forEach(([k, v]) => url.searchParams.set(k, v))
    if (sex === 'female') url.searchParams.set('hip', hip)
    else url.searchParams.delete('hip')
    if (goalIn != null) url.searchParams.set('goal', String(goalIn))
    else url.searchParams.delete('goal')
    window.history.replaceState({}, '', url)
  }, [sex, age, height, weight, neck, waist, hip, method, goalIn])

  const input = useMemo(() => ({
    sex, age: Number(age) || 0, heightCm: Number(height) || 0, weightKg: Number(weight) || 0,
    waistCm: Number(waist) || 0, neckCm: Number(neck) || 0, hipCm: Number(hip) || 0,
  }), [sex, age, height, weight, waist, neck, hip])

  const est = useMemo(() => estimate(input), [input])
  // 고른 방법이 계산 불가(예: 목 ≥ 허리)면 계산되는 첫 방법으로
  const used: Method | null = est[method] != null ? method : (METHODS.find((m) => est[m] != null) ?? null)
  const bf = used ? est[used]! : null
  const values = METHODS.map((m) => est[m]).filter((v): v is number => v != null)
  const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0

  const comp = bf != null ? composition(input.weightKg, bf) : null
  const cat = bf != null ? category(sex, bf) : null
  const range = healthyRange(sex, input.age)
  const hs = bf != null ? healthyStatus(sex, input.age, bf) : null
  const b = input.heightCm > 0 && input.weightKg > 0 ? bmi(input.heightCm, input.weightKg) : 0
  const ratio = input.heightCm > 0 ? whtr(input.waistCm, input.heightCm) : 0
  const abdominal = abdominalObese(sex, input.waistCm)
  const target = comp ? targetWeight(comp.leanKg, goal) : 0
  const toLose = comp ? input.weightKg - target : 0
  const delta = logDelta(log)

  const lo = bf != null && used ? Math.max(2, bf - ERR[used]) : 0
  const hi = bf != null && used ? bf + ERR[used] : 0

  const addLog = () => {
    if (bf == null || !used) return
    saveLog(upsertLog(log, { d: todayStr(), bf: Math.round(bf * 10) / 10, w: input.weightKg, waist: input.waistCm, m: used }))
  }

  const numField = (label: string, value: string, set: (v: string) => void, unit: string, note?: string) => (
    <div>
      <label className="block text-sm font-medium text-body mb-1.5">
        {label} <span className="text-faint font-normal">({unit})</span>
        <input type="number" inputMode="decimal" step="0.1" min="0" value={value} onChange={(e) => set(e.target.value)}
          className="ui-field px-3 py-3 mt-1.5 tabular-nums font-normal" />
      </label>
      {note && <p className="text-xs text-muted mt-1">{note}</p>}
    </div>
  )

  const aceRows = CATEGORIES.map((c, i) => {
    const lower = ACE[sex][c]
    const next = CATEGORIES[i + 1]
    const label = next ? `${lower}~${ACE[sex][next] - 1}%` : `${lower}%+`
    return { c, label }
  })

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
              <label className="block text-sm font-medium text-body mb-2">{t('input.gender')}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setSex(g)} aria-pressed={sex === g}
                    className={`py-2.5 rounded-xl font-medium transition-colors ${sex === g ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {t(`input.${g}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {numField(t('u.age'), age, setAge, t('u.unitAge'))}
              {numField(t('u.height'), height, setHeight, 'cm')}
              {numField(t('u.weight'), weight, setWeight, 'kg')}
            </div>
            <div className="border-t border-line pt-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-fg">{t('input.measurements')}</h2>
                <a href="#measure" className="text-xs text-primary">{t('u.howToMeasure')}</a>
              </div>
              {numField(t('u.neck'), neck, setNeck, 'cm', t('u.neckNote'))}
              {numField(t('u.waist'), waist, setWaist, 'cm', t(sex === 'male' ? 'u.waistNoteMale' : 'u.waistNoteFemale'))}
              {sex === 'female' && numField(t('u.hip'), hip, setHip, 'cm', t('u.hipNote'))}
            </div>
            <div className="border-t border-line pt-5">
              <label className="block text-sm font-medium text-body mb-2">{t('u.headlineMethod')}</label>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                    className={`py-2 px-2 rounded-xl text-sm font-medium transition-colors ${method === m ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                    {t(`u.m.${m}.name`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          {bf == null || !used || !comp || !cat ? (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{t('u.invalid')}</p>
            </div>
          ) : (
            <>
              <div className="ui-hero p-6 sm:p-8">
                <p className="text-sm text-white/70">{t('u.heroLabel', { method: t(`u.m.${used}.name`) })}</p>
                <p className="text-5xl font-bold mt-1 tabular-nums">{f1(bf)}%</p>
                <p className="text-sm text-white/80 mt-2">
                  {t(`categories.${cat}`)} · {t('u.heroRange', { lo: f1(lo), hi: f1(hi) })}
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                  <div>
                    <p className="text-white/70">{t('u.fatMass')}</p>
                    <p className="text-xl font-bold tabular-nums">{f1(comp.fatKg)}kg</p>
                  </div>
                  <div>
                    <p className="text-white/70">{t('u.leanMass')}</p>
                    <p className="text-xl font-bold tabular-nums">{f1(comp.leanKg)}kg</p>
                  </div>
                  <div>
                    <p className="text-white/70">BMI</p>
                    <p className="text-xl font-bold tabular-nums">{f1(b)}</p>
                  </div>
                </div>
                {used !== method && <p className="mt-4 text-xs text-white/80">{t('u.fallback', { method: t(`u.m.${method}.name`) })}</p>}
              </div>

              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('u.share.label', { method: t(`u.m.${used}.name`) }),
                  headline: `${f1(bf)}%`,
                  sub: `${t(`categories.${cat}`)} · ${t('u.heroRange', { lo: f1(lo), hi: f1(hi) })}`,
                  rows: [
                    { label: t('u.fatMass'), value: `${f1(comp.fatKg)}kg` },
                    { label: t('u.leanMass'), value: `${f1(comp.leanKg)}kg` },
                    ...METHODS.filter((m) => m !== used && est[m] != null).map((m) => ({ label: t(`u.m.${m}.name`), value: `${f1(est[m]!)}%` })),
                  ],
                }}
                text={t('u.share.text', { bf: f1(bf), category: t(`categories.${cat}`) })}
                fileName="body-fat"
              />

              {/* 방법별 비교 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('u.compareTitle')}</h2>
                <p className="text-xs text-muted mt-1">{t('u.compareNote')}</p>
                <div className="mt-4 space-y-2">
                  {METHODS.map((m) => {
                    const v = est[m]
                    const sel = m === used
                    return (
                      <button key={m} type="button" onClick={() => setMethod(m)}
                        className={`w-full text-left rounded-xl border p-3 sm:p-4 transition-colors ${sel ? 'bg-primary-soft border-primary' : 'border-line hover:bg-subtle'}`}>
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`font-semibold ${sel ? 'text-primary' : 'text-fg'}`}>{t(`u.m.${m}.name`)}</p>
                            <p className="text-xs text-muted mt-0.5">{t(`u.m.${m}.uses`)}</p>
                          </div>
                          <p className={`text-xl font-bold tabular-nums shrink-0 ${sel ? 'text-primary' : 'text-fg'}`}>
                            {v != null ? `${f1(v)}%` : '-'}
                          </p>
                        </div>
                        {v != null && (
                          <div className="mt-3">
                            {/* 0~50% 막대 위에 ±오차 구간 */}
                            <div className="relative h-2 rounded-full bg-track">
                              <div className="absolute h-2 rounded-full bg-primary/30"
                                style={{ left: `${Math.max(0, v - ERR[m]) * 2}%`, width: `${Math.min(100, (v + ERR[m]) * 2) - Math.max(0, v - ERR[m]) * 2}%` }} />
                              <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 -ml-[5px] rounded-full bg-primary" style={{ left: `${Math.min(100, v * 2)}%` }} />
                            </div>
                            <p className="text-xs text-muted mt-1.5 tabular-nums">
                              {t('u.errNote', { err: ERR[m] })} · {t(`u.m.${m}.note`)}
                            </p>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {spread >= 6 && (
                  <div className="mt-4 bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                    {t('u.spreadWarn', { spread: f1(spread) })}
                  </div>
                )}
              </div>

              {/* 분류 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('u.classTitle')}</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-body mb-2">{t('u.aceTitle', { sex: t(`input.${sex}`) })}</p>
                    <div className="space-y-1">
                      {aceRows.map(({ c, label }) => (
                        <div key={c} className={`flex justify-between rounded-lg px-3 py-2 text-sm ${c === cat ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                          <span>{t(`categories.${c}`)}</span>
                          <span className="tabular-nums">{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted mt-2">{t('u.aceSource')}</p>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-muted">{t('u.ageRange', { band: range.band })}</p>
                      <p className="text-lg font-bold text-fg tabular-nums mt-0.5">{range.min}~{range.max}%</p>
                      <p className="text-body mt-1">{t(`u.hs.${hs}`)}</p>
                      <p className="text-xs text-muted mt-1">{t('u.ageSource')}{input.age < 20 ? ` ${t('u.ageUnder20')}` : ''}</p>
                    </div>
                    <div className="bg-subtle rounded-xl p-4 space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">{t('u.waistKr', { cut: ABDOMINAL[sex] })}</span>
                        <span className={`font-semibold ${abdominal ? 'text-amber-700' : 'text-fg'}`}>{t(abdominal ? 'u.abdYes' : 'u.abdNo')}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">{t('u.whtr')}</span>
                        <span className={`font-semibold tabular-nums ${ratio >= 0.5 ? 'text-amber-700' : 'text-fg'}`}>{ratio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">{t('u.bmiKr')}</span>
                        <span className="font-semibold text-fg tabular-nums">{f1(b)} · {t(`u.bmiClass.${bmiClass(b)}`)}</span>
                      </div>
                      <p className="text-xs text-muted pt-1">{t('u.krSource')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 목표 */}
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg">{t('u.goalTitle')}</h2>
                <p className="text-xs text-muted mt-1">{t('u.goalNote')}</p>
                <div className="mt-4 flex items-center gap-4">
                  <input type="range" min={5} max={40} step={1} value={goal} onChange={(e) => setGoalIn(Number(e.target.value))}
                    aria-label={t('u.goalLabel')} className="flex-1 accent-[var(--primary)]" />
                  <span className="text-lg font-bold text-primary tabular-nums w-14 text-right">{goal}%</span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs text-muted">{t('u.targetWeight')}</p>
                    <p className="text-2xl font-bold text-fg tabular-nums">{f1(target)}kg</p>
                  </div>
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs text-muted">{toLose >= 0 ? t('u.fatToLose') : t('u.weightToGain')}</p>
                    <p className="text-2xl font-bold text-fg tabular-nums">{f1(Math.abs(toLose))}kg</p>
                  </div>
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs text-muted">{t('u.weeks')}</p>
                    <p className="text-2xl font-bold text-fg tabular-nums">{toLose > 0 ? t('u.weeksValue', { n: Math.ceil(weeksToLose(toLose)) }) : '-'}</p>
                  </div>
                </div>
                {goal < ACE[sex].athletic && (
                  <p className="mt-3 bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{t('u.goalTooLow')}</p>
                )}
                <p className="text-sm text-body mt-4">
                  {t('u.nextSteps')}{' '}
                  <Link href="/calorie-calculator/" className="text-primary font-medium">{t('u.linkCalorie')}</Link>
                  {' · '}
                  <Link href="/bmi-calculator/" className="text-primary font-medium">{t('u.linkBmi')}</Link>
                </p>
              </div>

              {/* 기록 */}
              <div className="ui-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-fg">{t('u.logTitle')}</h2>
                    <p className="text-xs text-muted mt-1">{t('u.logNote')}</p>
                  </div>
                  <button type="button" onClick={addLog} className="ui-btn px-4 py-2 text-sm shrink-0">{t('u.logSave')}</button>
                </div>
                {log.length === 0 ? (
                  <p className="text-sm text-muted mt-4">{t('u.logEmpty')}</p>
                ) : (
                  <>
                    {delta && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        {([['bf', '%p'], ['fatKg', 'kg'], ['leanKg', 'kg'], ['w', 'kg']] as const).map(([k, unit]) => (
                          <div key={k} className="bg-subtle rounded-xl p-3">
                            <p className="text-xs text-muted">{t(`u.delta.${k}`)}</p>
                            <p className="font-bold text-fg tabular-nums">{signed(delta[k])}{unit}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {log.length > 1 && (
                      <div className="h-48 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={log} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="d" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v: number) => String(Math.round(v))} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`, t('u.chartBf')]} />
                            <Line type="monotone" dataKey="bf" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <ul className="mt-4 divide-y divide-line text-sm">
                      {[...log].reverse().slice(0, 10).map((e) => (
                        <li key={e.d} className="flex items-center justify-between gap-2 py-2">
                          <span className="text-muted tabular-nums">{e.d}</span>
                          <span className="text-body tabular-nums flex-1 text-right">{f1(e.bf)}% · {f1(e.w)}kg · {t(`u.m.${e.m}.name`)}</span>
                          <button type="button" onClick={() => saveLog(log.filter((x) => x.d !== e.d))} aria-label={t('u.logDelete')}
                            className="p-1.5 rounded-lg text-faint hover:text-body hover:bg-soft">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 측정 방법 */}
      <div id="measure" className="ui-card p-6 scroll-mt-24">
        <h2 className="text-xl font-semibold text-fg">{t('measurementGuide.title')}</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <svg viewBox="0 0 200 270" className="w-full max-w-[220px] mx-auto text-faint" role="img" aria-label={t('u.svgAlt')}>
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <circle cx="80" cy="30" r="20" />
              <path d="M72 50 V62 L46 70 Q38 73 40 84 L50 120 Q55 140 53 150 Q45 172 50 192 L58 262 M88 50 V62 L114 70 Q122 73 120 84 L110 120 Q105 140 107 150 Q115 172 110 192 L102 262 M80 205 V262" />
            </g>
            <g className="text-primary" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3">
              <line x1="66" y1="57" x2="94" y2="58" />
              <line x1="46" y1="140" x2="114" y2="140" />
              <line x1="42" y1="172" x2="118" y2="172" />
            </g>
            <g className="text-body" fill="currentColor" fontSize="12">
              <text x="128" y="61">{t('u.neckShort')}</text>
              <text x="128" y="144">{t('u.waistShort')}</text>
              <text x="128" y="176">{t('u.hipShort')}</text>
            </g>
          </svg>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {(['neck', 'waist', 'hip'] as const).map((k) => (
              <div key={k}>
                <h3 className="font-semibold text-fg mb-2">{t(`measurementGuide.${k}`)}</h3>
                <ul className="space-y-1.5 text-sm text-body list-disc pl-4">
                  {(t.raw(`u.tips.${k}`) as string[]).map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p><strong className="text-fg">{t('u.commonTitle')}</strong> {t('u.common')}</p>
          <p><strong className="text-fg">{t('u.inbodyTitle')}</strong> {t('u.inbody')}</p>
        </div>
      </div>

      <GuideSection namespace="bodyFat" defaultOpen />

      <p className="text-xs text-muted">{t('u.disclaimer')}</p>
    </div>
  )
}
