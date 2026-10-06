'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/exerciseCalorie'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Plus, Trash2, Link2, Search } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import MobileResultLink from '@/components/MobileResultLink'
import {
  ACTIVITIES, CATEGORIES, FOODS, STEP_PACES, FAT_KCAL_PER_KG,
  findActivity, findFood, kcal, netKcal, harrisBenedict, rmrMl, correctedMet, personalNetKcal,
  minutesToBurn, stepsToCalories, encodePlan, decodePlan, weekTotal, clampNum, matches,
  type Category, type Sex, type StepPace, type Session,
} from '@/utils/exerciseCalorie'

type Tab = 'calc' | 'food' | 'steps' | 'week'
const TABS: Tab[] = ['calc', 'food', 'steps', 'week']
const DEF = { w: 65, a: 'run8', m: 30, h: 170, age: 30, steps: 10_000, food: 'ramen', fk: 500 }
const DEF_PLAN: Session[] = [{ a: 'run8', m: 30, n: 3 }, { a: 'walkBrisk', m: 40, n: 2 }, { a: 'gymGeneral', m: 45, n: 2 }]
const MINUTE_PRESETS = [10, 20, 30, 45, 60, 90]
const EQ_FOODS = ['rice', 'ramen', 'chicken', 'soju', 'latte', 'banana']
const BURN_SET = ['walkModerate', 'walkBrisk', 'run8', 'run10', 'bike21', 'freestyleSlow', 'jumpRope', 'hiking', 'stairs', 'badminton', 'gymGeneral', 'yoga', 'cleaning']
const COMPENDIUM_URL = 'https://pacompendium.com/adult-compendium/'

const n0 = (n: number) => Math.round(n).toLocaleString('ko-KR')
const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR')
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

function NumField({ id, label, value, onChange, unit, min, max, step = 1 }: {
  id: string; label: string; value: number; onChange: (n: number) => void; unit: string; min: number; max: number; step?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id} type="number" inputMode="decimal" min={min} max={max} step={step}
          value={value || ''} placeholder="0"
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="ui-field px-4 py-2.5 pr-12 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">{unit}</span>
      </div>
    </div>
  )
}

export default function ExerciseCalorie() {
  const t = useTranslations('exerciseCalorie')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [tab, setTab] = useState<Tab>('calc')
  const [weight, setWeight] = useState(DEF.w)
  const [actId, setActId] = useState(DEF.a)
  const [minutes, setMinutes] = useState(DEF.m)
  const [adv, setAdv] = useState(false)
  const [sex, setSex] = useState<Sex>('m')
  const [age, setAge] = useState(DEF.age)
  const [height, setHeight] = useState(DEF.h)
  const [foodId, setFoodId] = useState<string>(DEF.food)
  const [customKcal, setCustomKcal] = useState(DEF.fk)
  const [steps, setSteps] = useState(DEF.steps)
  const [pace, setPace] = useState<StepPace>('walkModerate')
  const [plan, setPlan] = useState<Session[]>(DEF_PLAN)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // URL → 상태 (한 번). 예전 링크(?weight=&activity=&duration=)도 읽음
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    const tb = TABS.find((x) => x === g('tab')); if (tb) setTab(tb)
    setWeight(clampNum(g('w') ?? g('weight'), 20, 300, DEF.w))
    const act = findActivity(g('a') ?? g('activity'))
    if (act) { setActId(act.id); setCat(act.cat) }
    setMinutes(clampNum(g('m') ?? g('duration'), 1, 600, DEF.m))
    if (g('adv') === '1') setAdv(true)
    if (g('sex') === 'f') setSex('f')
    setAge(clampNum(g('age'), 15, 100, DEF.age))
    setHeight(clampNum(g('h'), 100, 230, DEF.h))
    const f = g('food'); if (f === 'custom' || findFood(f)) setFoodId(f!)
    setCustomKcal(clampNum(g('fk'), 1, 10_000, DEF.fk))
    setSteps(clampNum(g('steps'), 0, 200_000, DEF.steps))
    const p = STEP_PACES.find((x) => x === g('pace')); if (p) setPace(p)
    const pl = decodePlan(g('p')); if (pl) setPlan(pl)
    ready.current = true
  }, [searchParams])

  // 상태 → URL (공유 링크가 결과를 재현)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams()
    if (tab !== 'calc') p.set('tab', tab)
    p.set('w', String(weight))
    if (tab === 'calc') { p.set('a', actId); p.set('m', String(minutes)) }
    if (tab === 'food') { p.set('food', foodId); if (foodId === 'custom') p.set('fk', String(customKcal)) }
    if (tab === 'steps') { p.set('steps', String(steps)); p.set('pace', pace); p.set('h', String(height)) }
    if (tab === 'week') p.set('p', encodePlan(plan))
    if (adv || tab === 'steps') { if (sex === 'f') p.set('sex', 'f') }
    if (adv && tab === 'calc') { p.set('adv', '1'); p.set('age', String(age)); p.set('h', String(height)) }
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [tab, weight, actId, minutes, adv, sex, age, height, foodId, customKcal, steps, pace, plan])

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
    } catch { /* 권한 없음: 표시만 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const kg = clampNum(weight, 20, 300, DEF.w)
  const weightOff = weight !== kg
  const act = findActivity(actId) ?? findActivity(DEF.a)!
  const actName = (id: string) => t(`act.${id}`)
  const fmtMin = (m: number) => {
    const r = Math.round(m)
    return r < 60 ? t('fmt.min', { m: r }) : t('fmt.hm', { h: Math.floor(r / 60), m: r % 60 })
  }

  // ── 단일 계산 ──
  const calc = useMemo(() => {
    const gross = kcal(act.met, kg, minutes)
    const rmr = harrisBenedict(sex, kg, height, age)
    const ml = rmrMl(rmr, kg)
    return {
      gross, net: netKcal(act.met, kg, minutes), perMin: kcal(act.met, kg, 1),
      rmr, ml, corr: correctedMet(act.met, ml), pNet: personalNetKcal(act.met, kg, minutes, rmr),
    }
  }, [act, kg, minutes, sex, height, age])

  const list = useMemo(
    () => ACTIVITIES.filter((a) => (cat === 'all' || a.cat === cat) && matches(query, t(`act.${a.id}`), a.id)),
    [cat, query, t],
  )

  // ── 음식 역산 ──
  const target = foodId === 'custom' ? clampNum(customKcal, 1, 10_000, DEF.fk) : (findFood(foodId)?.kcal ?? DEF.fk)
  const targetName = foodId === 'custom' ? t('food.custom') : t(`foodName.${foodId}`)
  const burn = useMemo(() => {
    const ids = BURN_SET.includes(actId) ? BURN_SET : [actId, ...BURN_SET]
    return ids.map((id) => {
      const a = findActivity(id)!
      return { id, met: a.met, min: minutesToBurn(target, a.met, kg) }
    }).sort((x, y) => x.min - y.min)
  }, [actId, target, kg])
  const burnMax = Math.max(...burn.map((b) => b.min), 1)

  // ── 걸음 ──
  const st = useMemo(() => stepsToCalories(steps, clampNum(height, 100, 230, DEF.h), sex, pace, kg), [steps, height, sex, pace, kg])

  // ── 주간 ──
  const week = useMemo(() => weekTotal(plan, kg), [plan, kg])
  const sessions = plan.reduce((s, x) => s + x.n, 0)
  const updSession = (i: number, patch: Partial<Session>) => setPlan((p) => p.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const heroLabel = t('hero.label', { w: n1(kg), act: actName(act.id), min: minutes })
  const shareText = t('share.text', { w: n1(kg), act: actName(act.id), min: minutes, kcal: n0(calc.gross) })

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button type="button" onClick={() => copy(text, id)} aria-label={t('copy')}
      className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors shrink-0">
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  const weightField = (
    <div>
      <NumField id="ec-weight" label={t('weight')} value={weight} onChange={setWeight} unit="kg" min={20} max={300} step={0.1} />
      {weightOff && <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mt-1.5">{t('weightNote')}</p>}
    </div>
  )

  const sexToggle = (
    <div>
      <span className="block text-sm font-medium text-body mb-1.5">{t('sex')}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {(['m', 'f'] as Sex[]).map((s) => (
          <button key={s} type="button" onClick={() => setSex(s)} aria-pressed={sex === s} className={seg(sex === s)}>
            {t(s === 'm' ? 'male' : 'female')}
          </button>
        ))}
      </div>
    </div>
  )

  const actSelect = (value: string, onChange: (id: string) => void, id: string) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="ui-field px-3 py-2.5 text-sm">
      {CATEGORIES.map((c) => (
        <optgroup key={c} label={t(`categories.${c}`)}>
          {ACTIVITIES.filter((a) => a.cat === c).map((a) => (
            <option key={a.id} value={a.id}>{actName(a.id)} · MET {a.met}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button type="button" onClick={() => copy(window.location.href, 'link')} className="ui-btn-soft shrink-0 px-3 py-2 text-sm">
          {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {copiedId === 'link' ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={seg(tab === x)}>
            {t(`tab.${x}`)}
          </button>
        ))}
      </div>

      {/* ── 운동 → 칼로리 ── */}
      {tab === 'calc' && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="ui-card p-6 space-y-5">
              <MobileResultLink href="#exercise-calorie-result" label={heroLabel} value={t('hero.value', { kcal: n0(calc.gross) })} />
              {weightField}
              <div>
                <label htmlFor="ec-min" className="block text-sm font-medium text-body mb-1.5">
                  {t('duration')} <span className="text-primary font-semibold tabular-nums">{fmtMin(minutes)}</span>
                </label>
                <input id="ec-min" type="range" min={5} max={180} step={5} value={Math.min(180, minutes)}
                  onChange={(e) => setMinutes(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {MINUTE_PRESETS.map((m) => (
                    <button key={m} type="button" onClick={() => setMinutes(m)} className={`${seg(minutes === m)} px-2.5 py-1 text-xs`}>
                      {t('fmt.min', { m })}
                    </button>
                  ))}
                  <input type="number" min={1} max={600} value={minutes || ''} aria-label={t('duration')}
                    onChange={(e) => setMinutes(clampNum(e.target.value, 1, 600, 1))}
                    className="ui-field w-20 px-2 py-1 text-xs tabular-nums" />
                </div>
              </div>

              <div>
                <button type="button" onClick={() => setAdv((v) => !v)} aria-expanded={adv}
                  className="text-sm font-medium text-primary">
                  {adv ? t('adv.hide') : t('adv.show')}
                </button>
                {adv && (
                  <div className="mt-3 bg-subtle rounded-2xl p-4 space-y-3">
                    {sexToggle}
                    <div className="grid grid-cols-2 gap-3">
                      <NumField id="ec-age" label={t('age')} value={age} onChange={setAge} unit={t('ageUnit')} min={15} max={100} />
                      <NumField id="ec-h" label={t('height')} value={height} onChange={setHeight} unit="cm" min={100} max={230} />
                    </div>
                    <p className="text-xs text-sub">{t('adv.note')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="ui-card p-6 space-y-3">
              <h2 className="text-base font-semibold text-fg">{t('pick')}</h2>
              <div className="relative">
                <Search className="w-4 h-4 text-faint absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')}
                  className="ui-field pl-10 pr-4 py-2.5 text-sm" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', ...CATEGORIES] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`${seg(cat === c)} px-2.5 py-1 text-xs`}>
                    {c === 'all' ? t('all') : t(`categories.${c}`)}
                  </button>
                ))}
              </div>
              <ul className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
                {list.map((a) => {
                  const on = a.id === act.id
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => setActId(a.id)} aria-pressed={on}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'border-transparent text-body hover:bg-soft'}`}>
                        <span className="truncate">{actName(a.id)}</span>
                        <span className={`shrink-0 text-xs tabular-nums ${on ? 'text-primary' : 'text-muted'}`}>
                          MET {a.met} · {n0(kcal(a.met, kg, minutes))} kcal
                        </span>
                      </button>
                    </li>
                  )
                })}
                {list.length === 0 && <li className="text-sm text-muted px-3 py-4">{t('noMatch')}</li>}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div id="exercise-calorie-result" className="ui-hero p-6 scroll-mt-20">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white/70">{heroLabel}</p>
                <CopyBtn text={shareText} id="hero" />
              </div>
              <p className="text-4xl font-bold tabular-nums mt-1">{t('hero.value', { kcal: n0(calc.gross) })}</p>
              <p className="text-sm text-white/70 mt-2">
                {t('hero.sub', { perMin: n1(calc.perMin), met: act.met, net: n0(calc.net) })}
              </p>
            </div>

            <div className="ui-card p-6 space-y-4">
              <h2 className="text-base font-semibold text-fg">{t('eq.title')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EQ_FOODS.map((id) => (
                  <div key={id} className="bg-subtle rounded-xl p-3">
                    <p className="text-xs text-sub truncate">{t(`foodName.${id}`)}</p>
                    <p className="text-lg font-bold text-fg tabular-nums">× {n1(calc.gross / findFood(id)!.kcal)}</p>
                  </div>
                ))}
              </div>
              <dl className="divide-y divide-line text-sm">
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('fatBurn')}</dt><dd className="font-semibold text-fg tabular-nums">{t('fmt.g', { g: n0(calc.gross / FAT_KCAL_PER_KG * 1000) })}</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('netLabel')}</dt><dd className="font-semibold text-fg tabular-nums">{n0(calc.net)} kcal</dd></div>
                {adv && (
                  <>
                    <div className="flex justify-between py-2.5"><dt className="text-sub">{t('adv.rmr')}</dt><dd className="font-semibold text-fg tabular-nums">{t('adv.rmrValue', { kcal: n0(calc.rmr), ml: n1(calc.ml) })}</dd></div>
                    <div className="flex justify-between py-2.5"><dt className="text-sub">{t('adv.corrMet')}</dt><dd className="font-semibold text-fg tabular-nums">{n1(calc.corr)}</dd></div>
                    <div className="flex justify-between py-2.5"><dt className="text-sub">{t('adv.personalNet')}</dt><dd className="font-semibold text-fg tabular-nums">{n0(calc.pNet)} kcal</dd></div>
                  </>
                )}
              </dl>
              <p className="text-xs text-muted">{t('formula', { met: act.met, w: n1(kg), h: Math.round((minutes / 60) * 100) / 100,kcal: n0(calc.gross) })}</p>
              {adv && <p className="text-xs text-muted">{t('adv.explain')}</p>}
              <p className="text-xs text-muted">
                {t('eq.note')}{' '}
                <a href={COMPENDIUM_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {t('source', { code: act.code })}
                </a>
              </p>
            </div>

            <ShareResult
              card={{
                tool: t('title'), label: heroLabel, headline: t('hero.value', { kcal: n0(calc.gross) }),
                sub: t('share.sub', { met: act.met }),
                rows: [
                  { label: t('foodName.rice'), value: `× ${n1(calc.gross / 300)}` },
                  { label: t('foodName.ramen'), value: `× ${n1(calc.gross / 500)}` },
                  { label: t('fatBurn'), value: t('fmt.g', { g: n0(calc.gross / FAT_KCAL_PER_KG * 1000) }) },
                ],
              }}
              text={shareText}
              fileName="exercise-calorie"
            />
          </div>
        </div>
      )}

      {/* ── 음식 → 운동 시간 ── */}
      {tab === 'food' && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 ui-card p-6 space-y-5">
            {weightField}
            <div>
              <span className="block text-sm font-medium text-body mb-1.5">{t('food.pick')}</span>
              <div className="grid grid-cols-2 gap-1.5">
                {FOODS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFoodId(f.id)} aria-pressed={foodId === f.id}
                    className={`px-3 py-2 rounded-xl border text-left text-sm transition-colors ${foodId === f.id ? 'bg-primary-soft text-primary border-primary' : 'border-line text-body hover:bg-soft'}`}>
                    <span className="block truncate">{t(`foodName.${f.id}`)}</span>
                    <span className="text-xs opacity-70 tabular-nums">{t('food.approx', { kcal: f.kcal })}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setFoodId('custom')} aria-pressed={foodId === 'custom'}
                  className={`px-3 py-2 rounded-xl border text-left text-sm transition-colors ${foodId === 'custom' ? 'bg-primary-soft text-primary border-primary' : 'border-line text-body hover:bg-soft'}`}>
                  {t('food.custom')}
                </button>
              </div>
            </div>
            {foodId === 'custom' && (
              <NumField id="ec-fk" label={t('food.customLabel')} value={customKcal} onChange={setCustomKcal} unit="kcal" min={1} max={10000} />
            )}
            <p className="text-xs text-muted">{t('eq.note')}</p>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t('food.heroLabel', { food: targetName, kcal: n0(target), w: n1(kg) })}</p>
              <p className="text-4xl font-bold mt-1">{t('food.heroValue', { act: actName(burn[0].id), time: fmtMin(burn[0].min) })}</p>
              <p className="text-sm text-white/70 mt-2">{t('food.heroSub', { act: actName('walkModerate'), time: fmtMin(minutesToBurn(target, findActivity('walkModerate')!.met, kg)) })}</p>
            </div>
            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg mb-3">{t('food.tableTitle')}</h2>
              <ul className="space-y-2.5">
                {burn.map((b) => (
                  <li key={b.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className={`truncate ${b.id === actId ? 'text-primary font-semibold' : 'text-body'}`}>{actName(b.id)}</span>
                      <span className="shrink-0 font-semibold text-fg tabular-nums">{fmtMin(b.min)}</span>
                    </div>
                    <div className="h-1.5 bg-track rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(b.min / burnMax) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <ShareResult
              card={{
                tool: t('title'), label: t('food.heroLabel', { food: targetName, kcal: n0(target), w: n1(kg) }),
                headline: t('food.heroValue', { act: actName(burn[0].id), time: fmtMin(burn[0].min) }),
                rows: burn.slice(0, 5).map((b) => ({ label: actName(b.id), value: fmtMin(b.min) })),
              }}
              text={t('food.shareText', { food: targetName, act: actName('walkModerate'), time: fmtMin(minutesToBurn(target, findActivity('walkModerate')!.met, kg)) })}
              fileName="exercise-calorie-food"
            />
          </div>
        </div>
      )}

      {/* ── 걸음 수 ── */}
      {tab === 'steps' && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 ui-card p-6 space-y-5">
            <NumField id="ec-steps" label={t('steps.count')} value={steps} onChange={(n) => setSteps(clampNum(n, 0, 200_000, 0))} unit={t('steps.unit')} min={0} max={200000} step={100} />
            <div className="flex flex-wrap gap-1.5">
              {[5000, 7000, 10000, 15000, 20000].map((s) => (
                <button key={s} type="button" onClick={() => setSteps(s)} className={`${seg(steps === s)} px-2.5 py-1 text-xs`}>
                  {t('steps.preset', { n: s.toLocaleString('ko-KR') })}
                </button>
              ))}
            </div>
            {weightField}
            <NumField id="ec-h2" label={t('height')} value={height} onChange={setHeight} unit="cm" min={100} max={230} />
            {sexToggle}
            <div>
              <span className="block text-sm font-medium text-body mb-1.5">{t('steps.pace')}</span>
              <div className="grid grid-cols-1 gap-1.5">
                {STEP_PACES.map((p) => (
                  <button key={p} type="button" onClick={() => setPace(p)} aria-pressed={pace === p} className={`${seg(pace === p)} text-left`}>
                    {actName(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t('steps.heroLabel', { n: n0(steps), w: n1(kg) })}</p>
              <p className="text-4xl font-bold tabular-nums mt-1">{t('hero.value', { kcal: n0(st.kcal) })}</p>
              <p className="text-sm text-white/70 mt-2">{t('steps.heroSub', { km: (Math.round(st.km * 100) / 100).toLocaleString('ko-KR'), time: fmtMin(st.minutes) })}</p>
            </div>
            <div className="ui-card p-6 space-y-3">
              <dl className="divide-y divide-line text-sm">
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('steps.stride')}</dt><dd className="font-semibold text-fg tabular-nums">{n1(st.stride)} cm</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('steps.distance')}</dt><dd className="font-semibold text-fg tabular-nums">{(Math.round(st.km * 100) / 100).toLocaleString('ko-KR')} km</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('steps.time')}</dt><dd className="font-semibold text-fg tabular-nums">{fmtMin(st.minutes)}</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('steps.perThousand')}</dt><dd className="font-semibold text-fg tabular-nums">{steps > 0 ? n1(st.kcal / steps * 1000) : 0} kcal</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-sub">{t('foodName.rice')}</dt><dd className="font-semibold text-fg tabular-nums">× {n1(st.kcal / 300)}</dd></div>
              </dl>
              <p className="text-xs text-muted">{t('steps.note', { met: st.met, kmh: st.kmh })}</p>
            </div>
            <ShareResult
              card={{
                tool: t('title'), label: t('steps.heroLabel', { n: n0(steps), w: n1(kg) }), headline: t('hero.value', { kcal: n0(st.kcal) }),
                sub: t('steps.heroSub', { km: (Math.round(st.km * 100) / 100).toLocaleString('ko-KR'), time: fmtMin(st.minutes) }),
              }}
              text={t('steps.shareText', { n: n0(steps), kcal: n0(st.kcal) })}
              fileName="exercise-calorie-steps"
            />
          </div>
        </div>
      )}

      {/* ── 주간 계획 ── */}
      {tab === 'week' && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 ui-card p-6 space-y-4">
            {weightField}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">{t('week.title')}</h2>
              <button type="button" onClick={() => setPlan((p) => [...p, { a: 'walkBrisk', m: 30, n: 1 }])} disabled={plan.length >= 10}
                className="ui-btn px-3 py-1.5 text-sm">
                <Plus className="w-4 h-4" />{t('addExercise')}
              </button>
            </div>
            {plan.map((s, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">{actSelect(s.a, (a) => updSession(i, { a }), `ec-s${i}`)}</div>
                  {plan.length > 1 && (
                    <button type="button" onClick={() => setPlan((p) => p.filter((_, j) => j !== i))} aria-label={t('removeExercise')}
                      className="p-2 text-faint hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField id={`ec-sm${i}`} label={t('week.minutes')} value={s.m} onChange={(m) => updSession(i, { m: clampNum(m, 0, 600, 0) })} unit={t('minutes')} min={1} max={600} />
                  <NumField id={`ec-sn${i}`} label={t('week.times')} value={s.n} onChange={(n) => updSession(i, { n: clampNum(Math.round(n), 0, 14, 0) })} unit={t('week.timesUnit')} min={1} max={14} />
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t('week.heroLabel', { n: sessions, time: fmtMin(week.minutes), w: n1(kg) })}</p>
              <p className="text-4xl font-bold tabular-nums mt-1">{t('hero.value', { kcal: n0(week.total) })}</p>
              <p className="text-sm text-white/70 mt-2">{t('week.heroSub', { month: n0(week.month), fat: n1(week.fatKgMonth) })}</p>
            </div>
            <div className="ui-card p-6 space-y-3">
              <ul className="space-y-2.5">
                {week.rows.map((r, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-body truncate">{actName(r.a)} · {t('week.rowDetail', { m: r.m, n: r.n })}</span>
                      <span className="shrink-0 font-semibold text-fg tabular-nums">{n0(r.week)} kcal</span>
                    </div>
                    <div className="h-1.5 bg-track rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${week.total > 0 ? (r.week / week.total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs bg-amber-50 text-amber-800 rounded-xl p-3">{t('week.fatCaveat')}</p>
            </div>
            <ShareResult
              card={{
                tool: t('title'), label: t('week.heroLabel', { n: sessions, time: fmtMin(week.minutes), w: n1(kg) }),
                headline: t('hero.value', { kcal: n0(week.total) }),
                sub: t('week.heroSub', { month: n0(week.month), fat: n1(week.fatKgMonth) }),
                rows: week.rows.slice(0, 5).map((r) => ({ label: `${actName(r.a)} ${t('week.rowDetail', { m: r.m, n: r.n })}`, value: `${n0(r.week)} kcal` })),
              }}
              text={t('week.shareText', { kcal: n0(week.total), fat: n1(week.fatKgMonth) })}
              fileName="exercise-calorie-week"
            />
          </div>
        </div>
      )}

      <GuideSection namespace="exerciseCalorie" />
    </div>
  )
}
