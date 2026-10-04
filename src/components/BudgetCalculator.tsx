'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/budgetCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ChevronLeft, ChevronRight, Download, Trash2, Undo2 } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { calculateNetSalary } from '@/utils/netSalary'
import {
  CATEGORY_IDS, DEFAULT_INCOME, DEFAULT_PLAN, RULES, analyze, fillByRule, monthStatus, emergencyGoal,
  normalizeAmounts, normalizeMonths, readParams, toCSV, monthKey, shiftMonth, isRule,
  type Amounts, type CatId, type RuleId,
} from '@/utils/budget'

// 예전 프리셋 키(그대로 읽고 씀) + 계획·월별 기록 키
const PRESET_KEY = 'budgetCalculator_presets'
const STORAGE_KEY = 'budgetCalculator_v2'

interface Plan {
  mode: 'net' | 'annual'
  salary: number
  annual: number
  sideIncome: number
  otherIncome: number
  amounts: Amounts
  rule: RuleId
}
interface Preset { id: string; name: string; date: string; plan: Plan }

const DEFAULT: Plan = {
  mode: 'net', salary: DEFAULT_INCOME, annual: 50_000_000, sideIncome: 0, otherIncome: 0,
  amounts: { ...DEFAULT_PLAN }, rule: 'r503020',
}
const RULE_IDS = Object.keys(RULES) as RuleId[]

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d)

function normalizePlan(x: unknown): Plan | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Record<string, unknown>
  return {
    mode: p.mode === 'annual' ? 'annual' : 'net',
    salary: num(p.salary, DEFAULT_INCOME),
    annual: num(p.annual, DEFAULT.annual),
    sideIncome: num(p.sideIncome),
    otherIncome: num(p.otherIncome),
    amounts: normalizeAmounts(p.amounts),
    rule: isRule(p.rule) ? p.rule : 'r503020',
  }
}

/** 예전 프리셋 {income:{salary,…}, expenses:[{id,amount}]} 과 새 프리셋 {plan} 둘 다 읽는다 */
function normalizePreset(x: unknown): Preset | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Record<string, unknown>
  const inc = (p.income ?? {}) as Record<string, unknown>
  const plan = p.plan ? normalizePlan(p.plan) : {
    ...DEFAULT, salary: num(inc.salary), sideIncome: num(inc.sideIncome), otherIncome: num(inc.otherIncome),
    amounts: normalizeAmounts(p.expenses),
  }
  if (!plan) return null
  return { id: String(p.id ?? Date.now()), name: String(p.name ?? ''), date: String(p.date ?? ''), plan }
}

function WonInput({ value, onChange, label, unit, className = '' }: {
  value: number; onChange: (n: number) => void; label: string; unit: string; className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text" inputMode="numeric" aria-label={label}
        value={value === 0 ? '' : fmt(value)} placeholder="0"
        onChange={(e) => onChange(Math.min(Number(e.target.value.replace(/[^0-9]/g, '')) || 0, 1e12))}
        className="ui-field w-full pl-3 pr-8 py-2.5 text-right tabular-nums"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-sm pointer-events-none">{unit}</span>
    </div>
  )
}

export default function BudgetCalculator() {
  const t = useTranslations('budgetCalculator')
  const searchParams = useSearchParams()

  const [plan, setPlan] = useState<Plan>(DEFAULT)
  const [months, setMonths] = useState<Record<string, Partial<Amounts>>>({})
  const [emBalance, setEmBalance] = useState(0)
  const [emMonths, setEmMonths] = useState<3 | 6>(3)
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetName, setPresetName] = useState('')
  const [today, setToday] = useState('')
  const [monthSel, setMonthSel] = useState('')
  const [showAmounts, setShowAmounts] = useState(false)
  const [undoPlan, setUndoPlan] = useState<Amounts | null>(null)
  // 공유 링크로 들어왔는데 내 저장 계획이 있으면, 직접 고치기 전까지 내 계획을 덮어쓰지 않는다
  const [linkView, setLinkView] = useState(false)
  const storedPlan = useRef<Plan | null>(null)
  const [loaded, setLoaded] = useState(false)

  // ── 마운트: URL > 저장값 > 기본값 ──
  useEffect(() => {
    let stored: Record<string, unknown> = {}
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') ?? {} } catch { /* 깨진 값 무시 */ }
    storedPlan.current = normalizePlan(stored.plan)
    setMonths(normalizeMonths(stored.months))
    setEmBalance(num(stored.emBalance))
    setEmMonths(stored.emMonths === 6 ? 6 : 3)
    try {
      const raw = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]')
      if (Array.isArray(raw)) setPresets(raw.map(normalizePreset).filter((p): p is Preset => !!p))
    } catch { /* ignore */ }

    const fromUrl = readParams((k) => searchParams.get(k))
    const ruleParam = searchParams.get('rule')
    if (fromUrl) {
      setPlan({ ...fromUrl, rule: fromUrl.rule ?? storedPlan.current?.rule ?? 'r503020' })
      setLinkView(!!storedPlan.current)
    } else if (storedPlan.current) {
      setPlan({ ...storedPlan.current, rule: isRule(ruleParam) ? ruleParam : storedPlan.current.rule })
    } else if (isRule(ruleParam)) {
      setPlan((p) => ({ ...p, rule: ruleParam }))
    }
    const now = new Date()
    setToday(`${monthKey(now)}-${String(now.getDate()).padStart(2, '0')}`)
    setMonthSel(monthKey(now))
    setLoaded(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 저장 + URL ──
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        plan: linkView ? storedPlan.current : plan, months, emBalance, emMonths,
      }))
    } catch { /* 용량 초과 등 */ }
    const url = new URL(window.location.href)
    const sp = url.searchParams
    for (const k of [...sp.keys()]) if (k === 'salary' || k === 'annual' || k === 'sideIncome' || k === 'otherIncome' || k === 'rule' || k.startsWith('exp_')) sp.delete(k)
    if (plan.mode === 'annual') sp.set('annual', String(plan.annual))
    else sp.set('salary', String(plan.salary))
    if (plan.sideIncome) sp.set('sideIncome', String(plan.sideIncome))
    if (plan.otherIncome) sp.set('otherIncome', String(plan.otherIncome))
    for (const c of CATEGORY_IDS) sp.set(`exp_${c}`, String(plan.amounts[c]))
    sp.set('rule', plan.rule)
    window.history.replaceState(window.history.state, '', url)
  }, [loaded, plan, months, emBalance, emMonths, linkView])

  const edit = (patch: Partial<Plan>) => { setPlan((p) => ({ ...p, ...patch })); setLinkView(false); setUndoPlan(null) }
  const setAmount = (c: CatId, v: number) => { setPlan((p) => ({ ...p, amounts: { ...p.amounts, [c]: v } })); setLinkView(false) }

  // ── 계산 ──
  const net = useMemo(() => calculateNetSalary(plan.annual)?.netMonthly ?? 0, [plan.annual])
  const salary = plan.mode === 'annual' ? net : plan.salary
  const income = salary + plan.sideIncome + plan.otherIncome
  const a = useMemo(() => analyze(income, plan.amounts, plan.rule), [income, plan.amounts, plan.rule])
  const rate = Math.round(a.savingsRate)
  const em = emergencyGoal(a.need, emMonths, emBalance, plan.amounts.emergency)
  // ponytail: 월별 기록은 '현재 계획' 하나와 비교 — 달마다 계획이 달라야 하면 months[k]에 계획 스냅샷 저장
  const actual = months[monthSel] ?? {}
  const ms = monthSel && today ? monthStatus(plan.amounts, actual, monthSel, today) : null
  const cat = (c: CatId) => t(`categories.${c}`)
  const won = (n: number) => t('won', { n: fmt(n) })
  const unit = t('unit')

  const verdictText = income <= 0 ? t('verdict.noIncome')
    : a.verdict === 'over' ? t('verdict.over', { amount: fmt(-a.unallocated) }) : t(`verdict.${a.verdict}`)

  const shareCard = {
    tool: t('title'),
    label: t('share.label'),
    headline: `${rate}%`,
    sub: verdictText,
    rows: showAmounts
      ? [
          { label: t('hero.income'), value: won(income) },
          { label: t('hero.spend'), value: won(a.spend) },
          { label: t('hero.saving'), value: won(a.saving) },
          { label: t('hero.year1'), value: won(a.year1) },
        ]
      : a.buckets.map((b) => ({ label: t(`bucket.${b.id}`), value: `${Math.round(b.actualPct)}%` })),
  }

  // ── 핸들러 ──
  const fill = () => { setUndoPlan(plan.amounts); setPlan((p) => ({ ...p, amounts: fillByRule(income, p.amounts, p.rule) })); setLinkView(false) }
  const undo = () => { if (undoPlan) setPlan((p) => ({ ...p, amounts: undoPlan })); setUndoPlan(null) }

  const savePresets = (list: Preset[]) => {
    setPresets(list)
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)) } catch { /* ignore */ }
  }
  const savePreset = () => {
    const p: Preset = { id: Date.now().toString(), name: presetName.trim() || t('preset.defaultName'), date: new Date().toLocaleDateString('ko-KR'), plan }
    savePresets([p, ...presets].slice(0, 10))
    setPresetName('')
  }

  const setActual = (c: CatId, v: number) => setMonths((m) => ({ ...m, [monthSel]: { ...m[monthSel], [c]: v } }))
  const clearMonth = () => {
    if (!window.confirm(t('tracker.clearConfirm'))) return
    setMonths((m) => { const n = { ...m }; delete n[monthSel]; return n })
  }
  const exportCSV = () => {
    const csv = toCSV(months, plan.amounts, t.raw('tracker.csvHeader') as string[], cat)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `budget-${today || 'export'}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  const [selY, selM] = monthSel ? monthSel.split('-').map(Number) : [0, 0]
  const seg = (on: boolean, pad = 'px-3') => `${pad} py-2 text-sm rounded-xl transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {linkView && (
        <div className="bg-subtle rounded-2xl p-4 text-sm text-sub flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-[12rem]">{t('link.viewing')}</span>
          <button
            onClick={() => { if (storedPlan.current) setPlan(storedPlan.current); setLinkView(false) }}
            className="ui-btn-soft px-4 py-2 text-sm"
          >
            {t('link.loadMine')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── 왼쪽: 수입 · 비상금 · 저장 ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('income.title')}</h2>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('income.title')}>
              <button className={seg(plan.mode === 'net')} onClick={() => edit({ mode: 'net' })}>{t('income.modeNet')}</button>
              <button className={seg(plan.mode === 'annual')} onClick={() => edit({ mode: 'annual' })}>{t('income.modeAnnual')}</button>
            </div>
            {plan.mode === 'net' ? (
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1">{t('income.salary')}</span>
                <WonInput unit={unit} label={t('income.salary')} value={plan.salary} onChange={(v) => edit({ salary: v })} />
              </label>
            ) : (
              <div>
                <label className="block">
                  <span className="block text-sm font-medium text-body mb-1">{t('income.annual')}</span>
                  <WonInput unit={unit} label={t('income.annual')} value={plan.annual} onChange={(v) => edit({ annual: v })} />
                </label>
                <p className="mt-2 text-sm text-body">{t('income.netResult', { n: fmt(net) })}</p>
                <p className="mt-1 text-xs text-muted">
                  {t('income.netBasis')}{' '}
                  <a href={`/salary-calculator/?salary=${plan.annual}&type=annual`} className="text-primary hover:underline">
                    {t('income.netDetail')}
                  </a>
                </p>
              </div>
            )}
            {(['sideIncome', 'otherIncome'] as const).map((f) => (
              <label key={f} className="block">
                <span className="block text-sm font-medium text-body mb-1">{t(`income.${f}`)}</span>
                <WonInput unit={unit} label={t(`income.${f}`)} value={plan[f]} onChange={(v) => edit({ [f]: v })} />
              </label>
            ))}
            <div className="pt-3 border-t border-line flex justify-between items-center">
              <span className="text-sm font-medium text-body">{t('summary.totalIncome')}</span>
              <span className="text-lg font-bold text-fg tabular-nums">{won(income)}</span>
            </div>
          </div>

          {/* 비상금 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('emergency.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('emergency.desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([3, 6] as const).map((n) => (
                <button key={n} className={seg(emMonths === n)} onClick={() => setEmMonths(n)}>{t('emergency.months', { n })}</button>
              ))}
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-body mb-1">{t('emergency.balance')}</span>
              <WonInput unit={unit} label={t('emergency.balance')} value={emBalance} onChange={setEmBalance} />
            </label>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-sub">{t('emergency.target', { need: fmt(a.need), n: emMonths })}</span>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(em.target)}</p>
              <div className="mt-2 h-2 bg-track rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${em.progress}%` }} />
              </div>
              <p className="mt-2 text-sm text-body">
                {em.monthsToGoal === 0 ? t('emergency.done')
                  : em.monthsToGoal === null ? t('emergency.noPlan', { short: fmt(em.short) })
                  : t('emergency.eta', { pct: Math.floor(em.progress), monthly: fmt(plan.amounts.emergency), n: em.monthsToGoal })}
              </p>
            </div>
          </div>

          {/* 저장 */}
          <div className="ui-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-fg">{t('preset.title')}</h2>
            <div className="flex gap-2">
              <input
                type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('preset.placeholder')} aria-label={t('preset.placeholder')}
                className="ui-field flex-1 min-w-0 px-3 py-2.5 text-sm"
              />
              <button onClick={savePreset} className="ui-btn px-4 py-2.5 text-sm">{t('actions.save')}</button>
            </div>
            {presets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">{t('preset.saved')}</p>
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-subtle rounded-xl">
                    <button onClick={() => { edit(p.plan) }} className="flex-1 min-w-0 text-left text-sm text-body hover:text-primary">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-faint ml-2">{p.date}</span>
                    </button>
                    <button
                      onClick={() => savePresets(presets.filter((x) => x.id !== p.id))}
                      aria-label={t('preset.delete')} className="p-1 text-faint hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 판정 · 예산 짜기 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6 sm:p-8">
            <p className="text-sm text-white/70">{t('hero.label', { income: fmt(income) })}</p>
            <p className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{t('hero.rate', { n: rate })}</p>
            <p className="mt-2 text-white/90">{verdictText}</p>
            {a.unallocated > 0 && income > 0 && (
              <p className="mt-1 text-sm text-white/70">{t('hero.unallocated', { amount: fmt(a.unallocated), rate: Math.round(a.potentialRate) })}</p>
            )}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['hero.spend', a.spend],
                ['hero.saving', a.saving],
                ['hero.left', a.unallocated],
                ['hero.year1', a.year1],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-2xl bg-white/15 p-4 min-w-0">
                  <p className="text-xs text-white/70">{t(k as string)}</p>
                  <p className="text-lg font-bold tabular-nums break-all">{won(v as number)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/70">{t('hero.yearNote', { y3: fmt(a.year3) })}</p>
          </div>

          <div className="space-y-2">
            <ShareResult
              card={shareCard}
              url={showAmounts ? undefined : `${typeof window !== 'undefined' ? window.location.origin : ''}/budget-calculator/?rule=${plan.rule}`}
              text={t('share.text', { n: rate })}
              fileName="budget"
            />
            <label className="flex items-center gap-2 text-sm text-sub">
              <input type="checkbox" checked={showAmounts} onChange={(e) => setShowAmounts(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
              {t('share.showAmounts')}
            </label>
          </div>

          {/* 예산 짜기 */}
          <div className="ui-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('plan.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('plan.desc')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('plan.ruleLabel')}>
              {RULE_IDS.map((r) => (
                <button key={r} className={seg(plan.rule === r, 'px-2')} onClick={() => edit({ rule: r })}>{t(`rules.${r}.name`)}</button>
              ))}
            </div>
            <p className="text-sm text-sub">{t(`rules.${plan.rule}.desc`)}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={fill} disabled={income <= 0} className="ui-btn-soft px-4 py-2 text-sm">{t('plan.fill')}</button>
              {undoPlan && (
                <button onClick={undo} className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-1.5">
                  <Undo2 className="w-4 h-4" />{t('plan.undo')}
                </button>
              )}
            </div>

            {/* 통별 막대 */}
            <div className="flex h-3 rounded-full overflow-hidden bg-track" aria-hidden>
              {a.buckets.map((b, i) => (
                <div key={b.id} className="h-full bg-primary" style={{ width: `${Math.min(b.actualPct, 100)}%`, opacity: 1 - i * 0.22 }} />
              ))}
            </div>

            <div className="space-y-4">
              {a.buckets.map((b) => (
                <div key={b.id} className="bg-subtle rounded-2xl p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-semibold text-fg">{t(`bucket.${b.id}`)}</h3>
                    <span className={`text-sm font-semibold tabular-nums ${b.warn ? 'text-amber-600' : 'text-fg'}`}>
                      {won(b.actual)} · {b.actualPct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {t('plan.target', { pct: b.pct, amount: fmt(b.target) })}
                    {' · '}
                    <span className={b.warn ? 'text-amber-600' : ''}>
                      {Math.abs(b.actual - b.target) < 1 ? t('plan.onTarget')
                        : b.actual > b.target ? t('plan.overBy', { amount: fmt(b.actual - b.target) })
                        : t('plan.underBy', { amount: fmt(b.target - b.actual) })}
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 bg-track rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${b.warn ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${b.target > 0 ? Math.min((b.actual / b.target) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    {b.cats.map((c) => (
                      <div key={c} className="flex items-center gap-3">
                        <span className="flex-1 min-w-0 text-sm text-body">
                          {cat(c)}
                          {income > 0 && <span className="ml-1.5 text-xs text-faint tabular-nums">{((plan.amounts[c] / income) * 100).toFixed(1)}%</span>}
                        </span>
                        <WonInput unit={unit} label={cat(c)} value={plan.amounts[c]} onChange={(v) => setAmount(c, v)} className="w-36 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 월별 기록 ── */}
      {ms && (
        <div className="ui-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">{t('tracker.title')}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setMonthSel((k) => shiftMonth(k, -1))} aria-label={t('tracker.prev')} className="p-2 rounded-xl bg-soft hover:bg-subtle text-body">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold text-fg tabular-nums min-w-[7rem] text-center">{t('tracker.month', { y: selY, m: selM })}</span>
              <button onClick={() => setMonthSel((k) => shiftMonth(k, 1))} aria-label={t('tracker.next')} className="p-2 rounded-xl bg-soft hover:bg-subtle text-body">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted -mt-2">{t('tracker.desc')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-subtle rounded-2xl p-5">
              {ms.phase === 'current' ? (
                <>
                  <p className="text-sm text-sub">{t('tracker.daily')}</p>
                  <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(ms.daily)}</p>
                  <p className="text-xs text-muted mt-1">{t('tracker.dailyBasis', { days: ms.daysLeft, left: fmt(Math.max(0, ms.varPlanned - ms.varSpent)) })}</p>
                  <p className={`text-sm mt-2 ${ms.fast ? 'text-amber-600' : 'text-body'}`}>
                    {ms.fast ? t('tracker.fast', { limit: fmt(ms.paceLimit), spent: fmt(ms.varSpent) }) : t('tracker.onPace', { limit: fmt(ms.paceLimit) })}
                  </p>
                </>
              ) : ms.phase === 'past' ? (
                <>
                  <p className="text-sm text-sub">{t('tracker.result')}</p>
                  <p className={`text-3xl font-bold tabular-nums mt-1 ${ms.left < 0 ? 'text-amber-600' : 'text-fg'}`}>
                    {ms.left < 0 ? t('tracker.overSpent', { amount: fmt(-ms.left) }) : t('tracker.underSpent', { amount: fmt(ms.left) })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-sub">{t('tracker.future')}</p>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-3 content-start">
              {[
                ['tracker.planned', ms.planned, false],
                ['tracker.spent', ms.spent, false],
                ['tracker.left', ms.left, ms.left < 0],
              ].map(([k, v, warn]) => (
                <div key={k as string} className="min-w-0">
                  <dt className="text-xs text-muted">{t(k as string)}</dt>
                  <dd className={`text-base sm:text-lg font-bold tabular-nums break-all ${warn ? 'text-amber-600' : 'text-fg'}`}>{won(v as number)}</dd>
                </div>
              ))}
              <div className="col-span-3 text-sm text-sub">
                {t('tracker.savedLine', { saved: fmt(ms.saved), plan: fmt(ms.savedPlan) })}
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {CATEGORY_IDS.map((c) => {
              const p = plan.amounts[c]
              const v = actual[c] ?? 0
              const over = v > p
              return (
                <div key={c}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-body">{cat(c)}</p>
                      <p className={`text-xs tabular-nums ${over ? 'text-amber-600' : 'text-faint'}`}>
                        {over ? t('tracker.catOver', { plan: fmt(p), amount: fmt(v - p) }) : t('tracker.catPlan', { plan: fmt(p) })}
                      </p>
                    </div>
                    <WonInput unit={unit} label={t('tracker.actualOf', { cat: cat(c) })} value={v} onChange={(n) => setActual(c, n)} className="w-36 shrink-0" />
                  </div>
                  <div className="mt-1.5 h-1 bg-track rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${p > 0 ? Math.min((v / p) * 100, 100) : v > 0 ? 100 : 0}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
            <button onClick={exportCSV} disabled={Object.keys(months).length === 0} className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-1.5">
              <Download className="w-4 h-4" />{t('tracker.csv')}
            </button>
            <button onClick={clearMonth} disabled={!months[monthSel]} className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />{t('tracker.clear')}
            </button>
          </div>
        </div>
      )}

      {/* ── 가이드 ── */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <p className="text-sm text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        {(['usage', 'rule', 'accounts', 'tips'] as const).map((s) => (
          <div key={s}>
            <h3 className="text-base font-semibold text-fg mb-2">{t(`guide.${s}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-sub">
              {(t.raw(`guide.${s}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <dl className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <dt className="text-sm font-semibold text-fg">{f.q}</dt>
                <dd className="text-sm text-sub mt-1">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
