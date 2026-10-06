'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/nutritionCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Search, Plus, Trash2, Copy, Check, X } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  FOODS, CATEGORIES, DV, AMDR, PORTIONS, MAX_AMOUNT, DEFAULT_MEAL,
  scale, per100, sum, macroRatio, ratioStatus, dvPct, encodeMeal, decodeMeal, norm,
  type Food, type Macro, type Nutrients,
} from '@/utils/nutrition'

interface MealEntry { uid: number; food: Food; amount: number }

let nextUid = 1
const withUid = (list: { food: Food; amount: number }[]): MealEntry[] => list.map((e) => ({ ...e, uid: nextUid++ }))

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fmtG = (n: number) => (n < 10 ? (Math.round(n * 10) / 10).toString() : fmt(n))
const MACROS: Macro[] = ['carbs', 'protein', 'fat']
const MACRO_BAR: Record<Macro, string> = { carbs: 'bg-primary', protein: 'bg-primary/55', fat: 'bg-primary/25' }

const EMPTY_CUSTOM = { name: '', serving: '100', cal: '', carbs: '', protein: '', fat: '', sodium: '' }
type CustomForm = typeof EMPTY_CUSTOM

export default function NutritionCalculator() {
  const t = useTranslations('nutritionCalculator')
  const sp = useSearchParams()

  const [category, setCategory] = useState<string>(() => {
    const c = sp.get('category') ?? 'all'
    return (CATEGORIES as readonly string[]).includes(c) ? c : 'all'
  })
  const [query, setQuery] = useState(() => sp.get('q') ?? '')
  const [entries, setEntries] = useState<MealEntry[]>(() =>
    withUid(decodeMeal(sp.get('m'), sp.get('c')) ?? decodeMeal(DEFAULT_MEAL, null)!))
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState<CustomForm>(EMPTY_CUSTOM)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const { m, c } = encodeMeal(entries)
    url.searchParams.set('m', m)
    if (c) url.searchParams.set('c', c); else url.searchParams.delete('c')
    if (category !== 'all') url.searchParams.set('category', category); else url.searchParams.delete('category')
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q')
    window.history.replaceState({}, '', url)
  }, [entries, category, query])

  const nameOf = useCallback((food: Food) =>
    food.category === 'custom' ? (food.name || t('u.custom.defaultName')) : t(`foods.${food.id}`), [t])
  const unitOf = (food: Food) => food.unit ?? 'g'

  const filtered = useMemo(() => {
    const q = norm(query)
    return FOODS.filter((food) =>
      (category === 'all' || food.category === category) && (!q || norm(t(`foods.${food.id}`)).includes(q)))
  }, [category, query, t])

  const inMeal = useMemo(() => new Set(entries.map((e) => e.food.id)), [entries])

  // ── 계산 ──
  const total = useMemo(() => sum(entries.map((e) => scale(e.food, e.amount))), [entries])
  const pct = dvPct(total)
  const ratio = macroRatio(total)
  const alcoholKcal = total.cal - (total.carbs * 4 + total.protein * 4 + total.fat * 9)

  // ── 액션 ──
  const addFood = useCallback((food: Food) => {
    setEntries((prev) => {
      const hit = prev.find((e) => e.food.id === food.id)
      if (hit) return prev.map((e) => e === hit ? { ...e, amount: Math.min(e.amount + food.serving, MAX_AMOUNT) } : e)
      return [...prev, { uid: nextUid++, food, amount: food.serving }]
    })
  }, [])
  const setAmount = (uid: number, amount: number) =>
    setEntries((prev) => prev.map((e) => e.uid === uid ? { ...e, amount: Math.min(Math.max(amount, 0), MAX_AMOUNT) } : e))
  const remove = (uid: number) => setEntries((prev) => prev.filter((e) => e.uid !== uid))

  const numOf = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) && n >= 0 ? n : 0 }
  const customValid = numOf(custom.serving) > 0 && custom.cal.trim() !== ''
  const addCustom = () => {
    if (!customValid) return
    const uid = nextUid++
    const serving = numOf(custom.serving)
    const food: Food = {
      id: `c${uid}`, category: 'custom', name: custom.name.trim().slice(0, 40), serving,
      cal: numOf(custom.cal), carbs: numOf(custom.carbs), protein: numOf(custom.protein), fat: numOf(custom.fat), sodium: numOf(custom.sodium),
    }
    setEntries((prev) => [...prev, { uid, food, amount: serving }])
    setCustom(EMPTY_CUSTOM)
    setCustomOpen(false)
  }

  const shareLabel = entries.length === 0 ? t('u.heroLabel')
    : entries.length === 1 ? t('u.share.labelOne', { first: nameOf(entries[0].food) })
    : t('u.share.label', { first: nameOf(entries[0].food), n: entries.length })
  const ratioText = t('u.share.ratio', { c: Math.round(ratio.carbs), p: Math.round(ratio.protein), f: Math.round(ratio.fat) })

  const copySummary = async () => {
    const lines = [`[${t('title')}]`, ...entries.map((e) => `${nameOf(e.food)} ${fmtG(e.amount)}${unitOf(e.food)} - ${fmt(scale(e.food, e.amount).cal)} kcal`), '',
      `${t('summary.totalCal')}: ${fmt(total.cal)} kcal (${ratioText})`,
      `${t('macros.carbs')} ${fmtG(total.carbs)}g · ${t('macros.protein')} ${fmtG(total.protein)}g · ${t('macros.fat')} ${fmtG(total.fat)}g · ${t('u.sodium')} ${fmt(total.sodium)}mg`]
    try { await navigator.clipboard.writeText(lines.join('\n')) } catch { /* 권한 없음 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const labelRows: { key: keyof Nutrients; label: string; unit: string }[] = [
    { key: 'cal', label: t('macros.calories'), unit: 'kcal' },
    { key: 'sodium', label: t('u.sodium'), unit: 'mg' },
    { key: 'carbs', label: t('macros.carbs'), unit: 'g' },
    { key: 'protein', label: t('macros.protein'), unit: 'g' },
    { key: 'fat', label: t('macros.fat'), unit: 'g' },
  ]

  const customFields: { key: keyof CustomForm; label: string }[] = [
    { key: 'serving', label: t('u.custom.serving') },
    { key: 'cal', label: t('u.custom.cal') },
    { key: 'carbs', label: `${t('macros.carbs')} (g)` },
    { key: 'protein', label: `${t('macros.protein')} (g)` },
    { key: 'fat', label: `${t('macros.fat')} (g)` },
    { key: 'sodium', label: `${t('u.sodium')} (mg)` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── 음식 고르기 ── */}
        <section className="lg:col-span-2 ui-card p-4 sm:p-5 space-y-4">
          <MobileResultLink href="#nutrition-calculator-result" label={t('u.heroLabel')} value={`${fmt(total.cal)} kcal`} />
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ui-field w-full pl-10 pr-10 py-3 text-sm"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-body" aria-label={t('clearSearch')}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  category === cat ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`}
              >
                {t(`categories.${cat}`)}
              </button>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-fg mb-2">
              {t('foodDatabase')} <span className="font-normal text-faint">({filtered.length})</span>
            </p>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-faint space-y-3">
                <p>{t('noResults')}</p>
                <button onClick={() => { setCustomOpen(true); setCustom({ ...EMPTY_CUSTOM, name: query }) }} className="ui-btn-soft px-4 py-2 text-sm">
                  {t('u.custom.open')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 max-h-[26rem] overflow-y-auto lg:max-h-none lg:overflow-visible">
                {filtered.map((food) => {
                  const on = inMeal.has(food.id)
                  return (
                    <button
                      key={food.id}
                      onClick={() => addFood(food)}
                      aria-label={`${t(`foods.${food.id}`)} ${food.cal}kcal ${t('addToMeal')}`}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        on ? 'bg-primary-soft border-primary' : 'bg-subtle border-transparent hover:border-line-strong'}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm font-semibold truncate ${on ? 'text-primary' : 'text-fg'}`}>{t(`foods.${food.id}`)}</p>
                        {on ? <Check className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-faint shrink-0" />}
                      </div>
                      <p className="mt-1 text-base font-bold text-fg tabular-nums">{fmt(food.cal)}<span className="text-xs font-normal text-muted"> kcal</span></p>
                      <p className="text-xs text-muted tabular-nums">
                        {t('perServing')} {food.serving}{unitOf(food)} · {t(food.unit === 'ml' ? 'u.per100ml' : 'u.per100g', { kcal: fmt(per100(food).cal) })}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-faint">{t('u.dataNote')}</p>
        </section>

        {/* ── 결과 + 내 식단 ── */}
        <div className="space-y-4">
          <div id="nutrition-calculator-result" className="ui-hero p-6 scroll-mt-20">
            <p className="text-sm text-white/70">{t('u.heroLabel')}</p>
            <p className="text-4xl font-bold mt-1 tabular-nums">{fmt(total.cal)}<span className="text-xl font-semibold"> kcal</span></p>
            <p className="text-sm text-white/80 mt-1">{t('u.heroSub', { pct: Math.round(pct.cal), n: entries.length })}</p>
            <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/20 text-sm">
              {[...MACROS.map((m) => ({ label: t(`macros.${m}`), value: `${fmtG(total[m])}g` })),
                { label: t('u.sodium'), value: `${fmt(total.sodium)}mg` }].map((x) => (
                <div key={x.label} className="min-w-0">
                  <p className="text-white/70 text-xs truncate">{x.label}</p>
                  <p className="font-bold tabular-nums truncate">{x.value}</p>
                </div>
              ))}
            </div>
          </div>

          {entries.length > 0 && (
            <ShareResult
              card={{
                tool: t('title'),
                label: shareLabel,
                headline: `${fmt(total.cal)} kcal`,
                sub: ratioText,
                rows: [
                  ...MACROS.map((m) => ({ label: t(`macros.${m}`), value: `${fmtG(total[m])}g` })),
                  { label: t('u.sodium'), value: `${fmt(total.sodium)}mg (${Math.round(pct.sodium)}%)` },
                ],
              }}
              text={t('u.share.text', { label: shareLabel, kcal: fmt(total.cal), ratio: ratioText })}
              fileName="nutrition-calculator"
            />
          )}

          <div className="ui-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-fg">
                {t('mealList')} <span className="text-sm font-normal text-faint">({entries.length})</span>
              </h2>
              {entries.length > 0 && (
                <button onClick={() => setEntries([])} className="text-xs text-muted hover:text-fg">{t('clearAll')}</button>
              )}
            </div>

            {entries.length === 0 ? (
              <p className="text-center py-6 text-sm text-faint">{t('mealEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => {
                  const unit = unitOf(e.food)
                  return (
                    <li key={e.uid} className="rounded-xl border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-fg truncate">{nameOf(e.food)}</p>
                          <p className="text-xs text-muted tabular-nums">
                            {fmt(scale(e.food, e.amount).cal)} kcal · {t('u.sodium')} {fmt(scale(e.food, e.amount).sodium)}mg
                          </p>
                        </div>
                        <button onClick={() => remove(e.uid)} className="p-1 text-faint hover:text-fg shrink-0" aria-label={t('removeItem')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5">
                          <span className="sr-only">{t('u.amount')}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={MAX_AMOUNT}
                            step={10}
                            value={e.amount || ''}
                            onChange={(ev) => setAmount(e.uid, parseFloat(ev.target.value) || 0)}
                            className="ui-field w-20 px-2.5 py-1.5 text-sm tabular-nums"
                          />
                          <span className="text-xs text-muted">{unit}</span>
                        </label>
                        <div className="flex gap-1">
                          {PORTIONS.map((p) => {
                            const on = Math.abs(e.amount - e.food.serving * p) < 0.05
                            return (
                              <button
                                key={p}
                                onClick={() => setAmount(e.uid, Math.round(e.food.serving * p * 10) / 10)}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-track'}`}
                              >
                                {t('u.portionChip', { n: p })}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* 직접 입력 */}
            {customOpen ? (
              <div className="mt-3 bg-subtle rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-fg">{t('u.custom.title')}</p>
                  <p className="text-xs text-muted mt-0.5">{t('u.custom.hint')}</p>
                </div>
                <label className="block">
                  <span className="text-xs text-sub">{t('u.custom.name')}</span>
                  <input
                    value={custom.name}
                    maxLength={40}
                    placeholder={t('u.custom.namePh')}
                    onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                    className="ui-field w-full mt-1 px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {customFields.map(({ key, label }) => (
                    <label key={key} className="block">
                      <span className="text-xs text-sub">{label}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={custom[key]}
                        onChange={(e) => setCustom({ ...custom, [key]: e.target.value })}
                        className="ui-field w-full mt-1 px-3 py-2 text-sm tabular-nums"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addCustom} disabled={!customValid} className="ui-btn flex-1 px-4 py-2.5 text-sm">{t('u.custom.add')}</button>
                  <button onClick={() => setCustomOpen(false)} className="ui-btn-soft px-4 py-2.5 text-sm">{t('u.custom.cancel')}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCustomOpen(true)} className="mt-3 w-full ui-btn-soft px-4 py-2.5 text-sm">
                <Plus className="w-4 h-4" /> {t('u.custom.open')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 상세: 영양정보 + 탄단지 ── */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <section className="ui-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-fg">
            <div>
              <h2 className="text-lg font-bold text-fg">{t('u.label.title')}</h2>
              <p className="text-xs text-muted mt-0.5">{t('u.label.basis')}</p>
            </div>
            <button onClick={copySummary} disabled={!entries.length} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-soft text-body hover:bg-track disabled:opacity-40">
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <ul className="divide-y divide-line">
            {labelRows.map(({ key, label, unit }) => {
              const p = pct[key]
              const over = p > 100
              return (
                <li key={key} className="py-3">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-body"><span className="font-semibold text-fg">{label}</span> <span className="tabular-nums">{key === 'carbs' || key === 'protein' || key === 'fat' ? fmtG(total[key]) : fmt(total[key])}{unit}</span></span>
                    <span className={`font-bold tabular-nums ${over ? 'text-amber-600' : 'text-fg'}`}>{Math.round(p)}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-track rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                  <p className="text-xs text-faint mt-1 tabular-nums">{t('u.label.dv', { v: `${fmt(DV[key])}${unit}` })}</p>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted mt-2">{t('u.label.note')}</p>
        </section>

        <section className="ui-card p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-bold text-fg">{t('u.ratio.title')}</h2>
          <div className="flex h-3 rounded-full overflow-hidden bg-track">
            {MACROS.map((m) => <div key={m} className={MACRO_BAR[m]} style={{ width: `${ratio[m]}%` }} />)}
          </div>
          <ul className="space-y-3">
            {MACROS.map((m) => {
              const st = ratioStatus(m, ratio[m])
              const has = total.carbs + total.protein + total.fat > 0
              return (
                <li key={m} className="flex items-center gap-3 text-sm">
                  <span className={`w-3 h-3 rounded-sm shrink-0 ${MACRO_BAR[m]}`} />
                  <span className="text-fg font-semibold w-16 shrink-0">{t(`macros.${m}`)}</span>
                  <span className="font-bold text-fg tabular-nums w-12">{Math.round(ratio[m])}%</span>
                  <span className="text-xs text-muted flex-1">{t('u.ratio.range', { lo: AMDR[m][0], hi: AMDR[m][1] })}</span>
                  {has && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st === 0 ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`}>
                      {t(st === 0 ? 'u.ratio.ok' : st < 0 ? 'u.ratio.low' : 'u.ratio.high')}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {alcoholKcal > 30 && <p className="text-xs text-muted">{t('u.ratio.alcohol', { kcal: fmt(alcoholKcal) })}</p>}
          <p className="text-xs text-faint">{t('u.ratio.note')}</p>
          {pct.sodium > 100 && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">
              {t('u.sodiumWarn', { mg: fmt(total.sodium), pct: Math.round(pct.sodium) })}
            </div>
          )}
        </section>
      </div>

      {/* ── 가이드 ── */}
      <section className="ui-card p-6 space-y-6 text-sm text-body">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['howToUse', 'macros', 'tips'] as const).map((k) => (
          <div key={k}>
            <h3 className="font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1">
              {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <dl className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((x, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <dt className="font-semibold text-fg">{x.q}</dt>
                <dd className="mt-1 text-sub">{x.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
