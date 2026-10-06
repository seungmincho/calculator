'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Save } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import CalculationHistory from './CalculationHistory'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/calorie'
import { useSearchParams } from '@/hooks/useSearchParams'
import {
  ACTIVITIES, ACTIVITY_FACTOR, FORMULAS, GOALS, PACES, MIN_KCAL, PROTEIN_G_PER_KG, FAT_PCT, LEGACY_GOAL,
  bmrAll, plan, macros, eer, bmi, dailyDelta, clampNum,
  type Sex, type Activity, type Formula, type Goal,
} from '@/utils/calorie'

const DEF = { age: 30, h: 175, w: 75, tw: 70, pace: 0.5 }
const n0 = (n: number) => Math.round(n).toLocaleString('en-US')
const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US')
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

// 히스토리 제목(localStorage.ts)은 예전 goal 값으로 라벨을 만듦
const legacyGoal = (g: Goal, pace: number) =>
  g === 'maintain' ? 'maintain'
    : g === 'lose' ? (pace >= 1 ? 'loseFast' : pace >= 0.75 ? 'loseModerate' : 'loseSlow')
      : (pace >= 0.5 ? 'gainModerate' : 'gainSlow')

function NumField({ id, label, value, onChange, unit, min, max, step = 1, placeholder }: {
  id: string; label: string; value: number; onChange: (n: number) => void; unit: string; min: number; max: number; step?: number; placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id} type="number" inputMode="decimal" min={min} max={max} step={step} placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="ui-field px-3 py-2.5 pr-10 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">{unit}</span>
      </div>
    </div>
  )
}

export default function CalorieCalculator() {
  const t = useTranslations('calorie')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState(DEF.age)
  const [height, setHeight] = useState(DEF.h)
  const [weight, setWeight] = useState(DEF.w)
  const [bodyFat, setBodyFat] = useState(0) // 0 = 미입력
  const [activity, setActivity] = useState<Activity>('light')
  const [formula, setFormula] = useState<Formula>('mifflin')
  const [goal, setGoal] = useState<Goal>('lose')
  const [pace, setPace] = useState(DEF.pace)
  const [target, setTarget] = useState(DEF.tw)
  const [today, setToday] = useState<Date | null>(null)
  const [saved, setSaved] = useState(false)

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('calorie')

  useEffect(() => { setToday(new Date()) }, [])

  const applyGoal = (gRaw: string | null | undefined, pRaw: unknown) => {
    const legacy = gRaw ? LEGACY_GOAL[gRaw] : undefined
    const g = GOALS.find((x) => x === gRaw) ?? legacy?.[0]
    if (!g) return
    setGoal(g)
    const p = Number(pRaw)
    setPace(PACES[g].includes(p) ? p : legacy?.[1] ?? DEF.pace)
  }

  // URL → 상태 (한 번). 예전 링크(height/weight/age/gender/activityLevel/goal=loseSlow…/bmrFormula/targetWeight)도 읽음
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    if (g('gender') === 'female') setSex('female')
    setAge(clampNum(g('age'), 15, 100, DEF.age))
    setHeight(clampNum(g('height'), 100, 230, DEF.h))
    setWeight(clampNum(g('weight'), 25, 300, DEF.w))
    setBodyFat(clampNum(g('bf'), 0, 60, 0))
    const a = ACTIVITIES.find((x) => x === g('activityLevel')); if (a) setActivity(a)
    const f = FORMULAS.find((x) => x === g('bmrFormula')); if (f) setFormula(f)
    applyGoal(g('goal'), g('pace'))
    const tw = clampNum(g('targetWeight'), 0, 300, 0); if (tw >= 25) setTarget(tw)
    ready.current = true
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // 상태 → URL
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams({
      gender: sex, age: String(age), height: String(height), weight: String(weight),
      activityLevel: activity, bmrFormula: formula, goal,
    })
    if (goal !== 'maintain') { p.set('pace', String(pace)); p.set('targetWeight', String(target)) }
    if (bodyFat) p.set('bf', String(bodyFat))
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
    setSaved(false)
  }, [sex, age, height, weight, bodyFat, activity, formula, goal, pace, target])

  // ── 계산 (입력은 범위로 정리) ──
  const body = {
    sex,
    age: clampNum(age, 15, 100, DEF.age),
    height: clampNum(height, 100, 230, DEF.h),
    weight: clampNum(weight, 25, 300, DEF.w),
    bodyFat: bodyFat >= 3 && bodyFat <= 60 ? bodyFat : null,
  }
  const tw = clampNum(target, 25, 300, DEF.tw)
  const useFormula: Formula = formula === 'katch' && body.bodyFat == null ? 'mifflin' : formula
  const res = useMemo(
    () => plan({ ...body, activity, formula: useFormula, goal, pace }, goal === 'maintain' ? null : tw),
    [body.sex, body.age, body.height, body.weight, body.bodyFat, activity, useFormula, goal, pace, tw], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const all = bmrAll(body)
  const basisKg = goal === 'lose' && res.reason !== 'direction' ? tw : body.weight
  const mac = macros(res.kcal, basisKg, goal)
  const ref = eer(sex, body.age)
  const targetBmi = bmi(tw, body.height)
  const weeks = res.weeks == null ? null : Math.ceil(res.weeks)
  const eta = today && weeks != null ? new Date(today.getTime() + weeks * 7 * 86_400_000) : null
  const fmtDate = (d: Date) => t('plan.date', { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() })
  const delta = res.kcal - res.tdee

  const heroLabel = goal === 'maintain' ? t('hero.labelMaintain') : t(`hero.label.${goal}`, { pace })
  const heroSub = goal === 'maintain'
    ? t('hero.subMaintain', { bmr: n0(res.bmr) })
    : t('hero.sub', { tdee: n0(res.tdee), delta: `${delta < 0 ? '−' : '+'}${n0(Math.abs(delta))}` })
  const etaText = res.reason === 'ok' && weeks != null
    ? (eta ? t('plan.etaDate', { kg: n1(tw), weeks, date: fmtDate(eta) }) : t('plan.eta', { kg: n1(tw), weeks }))
    : null

  const handleSave = () => {
    saveCalculation(
      { height: body.height, weight: body.weight, age: body.age, gender: sex, activityLevel: activity, goal: legacyGoal(goal, pace), goalV2: goal, pace, bmrFormula: formula, targetWeight: tw, bodyFat },
      { bmr: res.bmr, tdee: res.tdee, goalCalories: res.kcal, weightChangePerWeek: res.effPace, timeToGoal: res.weeks ?? 0 },
    )
    setSaved(true)
  }

  const chartData = res.series.length > 1 ? res.series.map((s) => ({ week: s.week, plan: Math.round(s.plan * 10) / 10, fixed: Math.round(s.fixed * 10) / 10 })) : null

  const goalBtn = (g: Goal) => (
    <button key={g} type="button" onClick={() => { setGoal(g); if (!PACES[g].includes(pace)) setPace(PACES[g][1] ?? PACES[g][0] ?? DEF.pace) }}
      className={`flex-1 ${seg(goal === g)}`} aria-pressed={goal === g}>
      {t(`goal.${g}`)}
    </button>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={(id) => {
            const i = loadFromHistory(id)
            if (!i) return
            setHeight(Number(i.height) || DEF.h)
            setWeight(Number(i.weight) || DEF.w)
            setAge(Number(i.age) || DEF.age)
            setSex(i.gender === 'female' ? 'female' : 'male')
            const a = ACTIVITIES.find((x) => x === i.activityLevel); if (a) setActivity(a)
            const f = FORMULAS.find((x) => x === i.bmrFormula); if (f) setFormula(f)
            applyGoal(typeof i.goalV2 === 'string' ? i.goalV2 : String(i.goal ?? ''), i.pace)
            if (Number(i.targetWeight) >= 25) setTarget(Number(i.targetWeight))
            setBodyFat(Number(i.bodyFat) || 0)
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(r: Record<string, unknown>) => {
            const k = Number(r.goalCalories) || 0
            return k ? `${n0(k)} kcal` : t('history.empty')
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-2 ui-card p-6 space-y-6">
          <MobileResultLink href="#calorie-calculator-result" label={heroLabel} value={`${n0(res.kcal)} kcal`} />
          <div>
            <p className="text-sm font-medium text-body mb-1.5">{t('input.gender')}</p>
            <div className="flex gap-2">
              {(['male', 'female'] as Sex[]).map((s) => (
                <button key={s} type="button" onClick={() => setSex(s)} className={`flex-1 ${seg(sex === s)}`} aria-pressed={sex === s}>
                  {t(`input.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NumField id="cal-age" label={t('form.age')} value={age} onChange={setAge} unit={t('unit.age')} min={15} max={100} />
            <NumField id="cal-h" label={t('form.height')} value={height} onChange={setHeight} unit="cm" min={100} max={230} step={0.1} />
            <NumField id="cal-w" label={t('form.weight')} value={weight} onChange={setWeight} unit="kg" min={25} max={300} step={0.1} />
          </div>
          {body.age < 19 && <p className="text-xs text-muted -mt-3">{t('form.teenNote')}</p>}

          <div>
            <p className="text-sm font-medium text-body mb-1.5">{t('input.activityLevel')}</p>
            <div className="space-y-2">
              {ACTIVITIES.map((a) => (
                <button key={a} type="button" onClick={() => setActivity(a)} aria-pressed={activity === a}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${activity === a ? 'bg-primary-soft text-primary border-primary' : 'border-line hover:bg-subtle'}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${activity === a ? 'text-primary' : 'text-fg'}`}>{t(`act.${a}.name`)}</span>
                    <span className="text-xs tabular-nums text-muted">× {ACTIVITY_FACTOR[a]}</span>
                  </span>
                  <span className="block text-xs text-muted mt-0.5">{t(`act.${a}.desc`)}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">{t('act.note')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-body mb-1.5">{t('input.goal')}</p>
            <div className="flex gap-2">{GOALS.map(goalBtn)}</div>
          </div>

          {goal !== 'maintain' && (
            <>
              <div>
                <p className="text-sm font-medium text-body mb-1.5">{t('form.pace')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PACES[goal].map((p) => (
                    <button key={p} type="button" onClick={() => setPace(p)} aria-pressed={pace === p}
                      className={`${seg(pace === p)} flex flex-col items-center leading-tight`}>
                      <span>{t('form.paceKg', { kg: p })}</span>
                      <span className={`text-xs ${pace === p ? 'text-white/70' : 'text-muted'}`}>
                        {goal === 'lose' ? '−' : '+'}{n0(dailyDelta(p))} kcal
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-2">{t(goal === 'lose' ? 'form.paceNoteLose' : 'form.paceNoteGain')}</p>
              </div>
              <div>
                <NumField id="cal-tw" label={t('form.target')} value={target} onChange={setTarget} unit="kg" min={25} max={300} step={0.1} />
                <p className="text-xs text-muted mt-1.5">{t('form.targetBmi', { bmi: n1(targetBmi) })}</p>
              </div>
            </>
          )}

          <div className="border-t border-line pt-5 space-y-4">
            <div>
              <NumField id="cal-bf" label={t('form.bodyFat')} value={bodyFat} onChange={setBodyFat} unit="%" min={3} max={60} step={0.1} placeholder={t('form.optional')} />
              <p className="text-xs text-muted mt-1.5">
                {t('form.bodyFatNote')}{' '}
                <Link href="/body-fat-calculator/" className="text-primary underline">{t('links.bodyFat')}</Link>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-body mb-1.5">{t('input.bmrFormula')}</p>
              <div className="flex flex-wrap gap-2">
                {FORMULAS.map((f) => {
                  const off = f === 'katch' && body.bodyFat == null
                  return (
                    <button key={f} type="button" disabled={off} onClick={() => setFormula(f)} aria-pressed={useFormula === f}
                      className={`${seg(useFormula === f)} disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {t(`formula.${f}`)}
                    </button>
                  )
                })}
              </div>
              {formula === 'katch' && body.bodyFat == null && <p className="text-xs text-muted mt-2">{t('formula.katchNeedsBf')}</p>}
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-3 space-y-4 min-w-0">
          <div id="calorie-calculator-result" className="ui-hero p-6 scroll-mt-20">
            <p className="text-sm text-white/70">{heroLabel}</p>
            <p className="text-4xl font-bold tabular-nums mt-1">{n0(res.kcal)} kcal</p>
            <p className="text-sm text-white/70 mt-2">{heroSub}</p>
            {etaText && <p className="text-sm font-medium mt-3">{etaText}</p>}
          </div>

          {res.clamped && res.reason !== 'floor' && (
            <p className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">
              {t('warn.clamped', { raw: n0(res.raw), floor: n0(res.floor), pace: (Math.round(res.effPace * 100) / 100).toString() })}
            </p>
          )}
          {res.reason === 'floor' && (
            <p className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">{t('warn.floor', { floor: n0(res.floor), tdee: n0(res.tdee) })}</p>
          )}
          {goal !== 'maintain' && targetBmi < 18.5 && (
            <p className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">{t('warn.underweight', { bmi: n1(targetBmi) })}</p>
          )}
          {res.reason === 'direction' && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t(`warn.direction.${goal}`)}</p>}
          {res.reason === 'tooLong' && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('warn.tooLong')}</p>}

          <ShareResult
            card={{
              tool: t('title'),
              label: heroLabel,
              headline: `${n0(res.kcal)} kcal`,
              sub: heroSub,
              rows: [
                { label: t('result.bmr'), value: `${n0(res.bmr)} kcal` },
                { label: t('result.tdee'), value: `${n0(res.tdee)} kcal` },
                ...(etaText ? [{ label: t('share.eta', { kg: n1(tw) }), value: t('share.weeks', { weeks: weeks ?? 0 }) }] : []),
                { label: t('result.protein'), value: `${n0(mac.protein.g)} g` },
              ],
            }}
            text={`${heroLabel} ${n0(res.kcal)} kcal`}
            fileName="calorie-plan"
          />

          {/* 내역 */}
          <div className="ui-card p-6">
            <h2 className="text-base font-semibold text-fg">{t('breakdown.title')}</h2>
            <dl className="divide-y divide-line text-sm mt-3">
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-sub">{t('result.bmr')} <span className="text-faint">· {t(`formula.${useFormula}`)}</span></dt>
                <dd className="font-semibold text-fg tabular-nums">{n0(res.bmr)} kcal</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-sub">{t('result.tdee')} <span className="text-faint">· × {ACTIVITY_FACTOR[activity]}</span></dt>
                <dd className="font-semibold text-fg tabular-nums">{n0(res.tdee)} kcal</dd>
              </div>
              {goal !== 'maintain' && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-sub">{t('breakdown.adjust')}</dt>
                  <dd className="font-semibold text-fg tabular-nums">{delta < 0 ? '−' : '+'}{n0(Math.abs(delta))} kcal</dd>
                </div>
              )}
              {goal === 'lose' && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-sub">{t('breakdown.floor', { min: n0(MIN_KCAL[sex]) })}</dt>
                  <dd className="font-semibold text-fg tabular-nums">{n0(res.floor)} kcal</dd>
                </div>
              )}
              {goal !== 'maintain' && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-sub">{t('breakdown.pace')}</dt>
                  <dd className="font-semibold text-fg tabular-nums">{t('form.paceKg', { kg: (Math.round(res.effPace * 100) / 100).toString() })}</dd>
                </div>
              )}
              {ref && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-sub">{t('breakdown.eer', { range: ref.to ? `${ref.from}~${ref.to}` : `${ref.from}+` })}</dt>
                  <dd className="font-semibold text-fg tabular-nums">{n0(ref.kcal)} kcal</dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-muted mt-3">{t('breakdown.note')}</p>
            <button type="button" onClick={handleSave} disabled={saved} className="ui-btn-soft px-4 py-2 mt-4 text-sm inline-flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" />{saved ? t('saved') : tCommon('save')}
            </button>
          </div>

          {/* 체중 변화 예상 */}
          {chartData && (
            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg">{t('chart.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('chart.note')}</p>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="week" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 11, fill: 'var(--muted)' }}
                      tickFormatter={(w: number) => t('chart.week', { w })} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v: number) => `${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12, color: 'var(--fg)' }}
                      labelFormatter={(w) => t('chart.week', { w: Number(w ?? 0) })}
                      formatter={(v, name) => [`${Number(v ?? 0).toFixed(1)} kg`, name === 'plan' ? t('chart.plan') : t('chart.fixed')]}
                    />
                    <ReferenceLine y={tw} stroke="var(--fg)" strokeDasharray="2 3" label={{ value: t('chart.target'), position: 'insideTopRight', fontSize: 10, fill: 'var(--fg)' }} />
                    <Line type="monotone" dataKey="plan" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="fixed" stroke="var(--faint)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub mt-3">
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 bg-primary" />{t('chart.plan')}</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-line-strong" />{t('chart.fixed')}</span>
              </div>
            </div>
          )}

          {/* 공식 비교 */}
          <div className="ui-card p-6">
            <h2 className="text-base font-semibold text-fg">{t('compare.title')}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-2 font-medium">{t('compare.formula')}</th>
                    <th className="py-2 font-medium text-right">{t('result.bmr')}</th>
                    <th className="py-2 font-medium text-right">{t('result.tdee')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {FORMULAS.map((f) => {
                    const v = all[f]
                    return (
                      <tr key={f} className={useFormula === f ? 'text-primary font-semibold' : 'text-body'}>
                        <td className="py-2.5">{t(`formula.${f}`)}</td>
                        <td className="py-2.5 text-right tabular-nums">{v == null ? '—' : n0(v)}</td>
                        <td className="py-2.5 text-right tabular-nums">{v == null ? t('compare.needBf') : n0(v * ACTIVITY_FACTOR[activity])}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('compare.note')}</p>
          </div>

          {/* 탄단지 */}
          <div className="ui-card p-6">
            <h2 className="text-base font-semibold text-fg">{t('macro.title')}</h2>
            <p className="text-xs text-muted mt-1">
              {t('macro.basis', { kg: n1(basisKg), lo: PROTEIN_G_PER_KG[goal][1], hi: PROTEIN_G_PER_KG[goal][2], gkg: PROTEIN_G_PER_KG[goal][0], fat: FAT_PCT })}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {(['protein', 'fat', 'carbs'] as const).map((k) => {
                const m = mac[k]
                const out = m.pct < m.range[0] || m.pct > m.range[1]
                return (
                  <div key={k} className="bg-subtle rounded-xl p-3">
                    <p className="text-xs text-sub">{t(`result.${k}`)}</p>
                    <p className="text-lg font-bold text-fg tabular-nums">{n0(m.g)} g</p>
                    <p className="text-xs text-muted tabular-nums">{n0(m.kcal)} kcal · {n0(m.pct)}%</p>
                    <p className={`text-xs mt-1 tabular-nums ${out ? 'text-amber-700' : 'text-faint'}`}>
                      {t('macro.kdri', { lo: m.range[0], hi: m.range[1] })}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-3">
              {t('macro.note')}{' '}
              <Link href="/nutrition-calculator/" className="text-primary underline">{t('links.nutrition')}</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── 가이드 (항상 표시) ── */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-semibold text-fg mb-2">{t('guide.bmrTitle')}</h3>
            <ul className="space-y-1.5 text-sm text-body list-disc pl-5">
              {[0, 1, 2, 3].map((i) => <li key={i}>{t(`guide.bmr.${i}`)}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg mb-2">{t('guide.calorieTitle')}</h3>
            <ul className="space-y-1.5 text-sm text-body list-disc pl-5">
              {[0, 1, 2, 3].map((i) => <li key={i}>{t(`guide.calorie.${i}`)}</li>)}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.formulas.title')}</h3>
          <ul className="space-y-1.5 text-sm text-body list-disc pl-5">
            {(t.raw('guide.formulas.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.howToUse.title')}</h3>
          <ol className="space-y-1.5 text-sm text-body">
            {(t.raw('guide.howToUse.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
          </ol>
        </div>

        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.tips.title')}</h3>
          <ul className="space-y-1.5 text-sm text-body list-disc pl-5">
            {(t.raw('guide.tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <dl className="space-y-3 text-sm">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((x, i) => (
              <div key={i}>
                <dt className="font-semibold text-fg">{x.q}</dt>
                <dd className="text-body mt-1">{x.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {([['/nutrition-calculator/', 'nutrition'], ['/exercise-calorie/', 'exercise'], ['/bmi-calculator/', 'bmi'], ['/body-fat-calculator/', 'bodyFat']] as const).map(([href, k]) => (
              <Link key={href} href={href} className="ui-btn-soft px-4 py-2 text-sm">{t(`links.${k}`)}</Link>
            ))}
          </div>
        </div>

        <p className="bg-subtle rounded-2xl p-5 text-xs text-sub">{t('guide.sources')} {t('guide.disclaimer')}</p>
      </div>
    </div>
  )
}
