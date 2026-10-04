'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/biorhythm'
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import { todayKST, isValidDate, weekday, addDays } from '@/utils/dday'
import {
  CYCLES, CLASSIC, type CycleKey, type DayPoint, type Profile, band, rising, dayPoint, series, monthPoints,
  bestWorst, upcomingCritical, compatibility, daysAlive, sanitizeProfiles,
} from '@/utils/biorhythm'

const STORE_KEY = 'biorhythm.profiles'
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
// 차트 계열 색 (데이터 구분용)
const COLOR: Record<CycleKey, string> = { physical: '#f04452', emotional: '#03b26c', intellectual: 'var(--primary)', intuitive: '#f59f00' }

const readProfiles = (): Profile[] => {
  try { return sanitizeProfiles(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')) } catch { return [] }
}
const writeProfiles = (list: Profile[]) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)) } catch { /* 시크릿 모드 등 */ }
}
const signed = (v: number) => (v > 0 ? `+${v}` : String(v))
const md = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`
const compatBand = (v: number) => (v >= 80 ? 'high' : v >= 60 ? 'good' : v >= 40 ? 'mid' : 'low')

export default function BiorhythmCalculator() {
  const t = useTranslations('biorhythm')
  const searchParams = useSearchParams()

  const [today, setToday] = useState<string | null>(null)
  const [mode, setMode] = useState<'single' | 'compat'>('single')
  const [birthA, setBirthA] = useState('')
  const [birthB, setBirthB] = useState('')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [target, setTarget] = useState('')
  const [intuitive, setIntuitive] = useState(false)
  const [hideBirth, setHideBirth] = useState(false)
  const [isExample, setIsExample] = useState(false)
  const [compatCycle, setCompatCycle] = useState<CycleKey>('emotional')
  const [profiles, setProfiles] = useState<Profile[]>([])

  // ── 초기화: URL → 예시 기본값 ──
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const now = todayKST()
    const y = +now.slice(0, 4)
    setToday(now)
    setProfiles(readProfiles())
    const a = searchParams.get('birthDate'), b = searchParams.get('birthDate2'), td = searchParams.get('targetDate')
    setIsExample(!isValidDate(a))
    setBirthA(isValidDate(a) ? a : `${y - 30}-03-15`)
    setBirthB(isValidDate(b) ? b : `${y - 28}-07-20`)
    setTarget(isValidDate(td) ? td : now)
    setNameA((searchParams.get('name') ?? '').slice(0, 20))
    setNameB((searchParams.get('name2') ?? '').slice(0, 20))
    setIntuitive(searchParams.get('intuitive') === '1')
    if (searchParams.get('mode') === 'compat' || isValidDate(b)) setMode('compat')
  }, [searchParams])

  // ── URL 동기화 ──
  useEffect(() => {
    if (!today || !isValidDate(birthA)) return
    const p = new URLSearchParams({ birthDate: birthA })
    if (nameA.trim()) p.set('name', nameA.trim())
    if (mode === 'compat') {
      p.set('mode', 'compat')
      if (isValidDate(birthB)) p.set('birthDate2', birthB)
      if (nameB.trim()) p.set('name2', nameB.trim())
    }
    if (target && target !== today) p.set('targetDate', target)
    if (intuitive) p.set('intuitive', '1')
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p}`)
  }, [today, mode, birthA, birthB, nameA, nameB, target, intuitive])

  const fmt = (d: string) => t('dateFmt', { m: +d.slice(5, 7), d: +d.slice(8, 10), w: t(`calendar.${DAY_KEYS[weekday(d)]}`) })
  const keys: CycleKey[] = intuitive ? [...CLASSIC, 'intuitive'] : CLASSIC
  const ok = (b: string) => isValidDate(b) && isValidDate(target) && b <= target
  const errA = birthA && isValidDate(target) && !ok(birthA) ? t('input.invalid') : ''
  const errB = mode === 'compat' && birthB && isValidDate(target) && !ok(birthB) ? t('input.invalid') : ''

  const r = useMemo(() => {
    if (!today || !ok(birthA)) return null
    const now = dayPoint(birthA, target)
    const month = monthPoints(birthA, target.slice(0, 7))
    return {
      now, chart: series(birthA, target), month: bestWorst(month),
      monthCritical: month.filter(p => p.critical.length),
      upcoming: upcomingCritical(birthA, target, 14),
    }
  }, [today, birthA, target]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = useMemo(() => {
    if (mode !== 'compat' || !r || !ok(birthB)) return null
    const sa = r.chart, sb = series(birthB, target)
    return {
      ...compatibility(birthA, birthB),
      nowB: dayPoint(birthB, target),
      chart: sa.map((p, i) => ({ date: p.date, a: p[compatCycle], b: sb[i][compatCycle] })),
    }
  }, [mode, r, birthA, birthB, target, compatCycle]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 프로필 ──
  const saveProfile = (name: string, date: string) => {
    if (!isValidDate(date)) return
    const nm = name.trim() || t('profiles.defaultName', { n: profiles.length + 1 })
    const list = [...profiles.filter(p => !(p.date === date && p.name === nm)), { id: Date.now().toString(36), name: nm, date }].slice(-20)
    setProfiles(list); writeProfiles(list)
  }
  const removeProfile = (id: string) => { const list = profiles.filter(p => p.id !== id); setProfiles(list); writeProfiles(list) }
  const loadA = (p: Profile) => { setBirthA(p.date); setNameA(p.name); setIsExample(false) }
  const loadB = (p: Profile) => { setBirthB(p.date); setNameB(p.name) }

  const segBtn = (active: boolean) => `flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`
  const chipBtn = (active: boolean) => `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const critNames = (ks: CycleKey[]) => ks.map(k => t(k)).join('·')
  const tDate = isValidDate(target) ? fmt(target) : ''
  const heroLabel = nameA.trim() ? t('hero.labelNamed', { name: nameA.trim(), date: tDate }) : t('hero.label', { date: tDate })
  const pair = { a: nameA.trim() || t('compat.me'), b: nameB.trim() || t('compat.partner') }
  const rootUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined

  const shareCard = mode === 'compat'
    ? c && {
      tool: t('title'),
      label: t('compat.label', pair),
      headline: `${c.overall}%`,
      sub: t(`compat.band.${compatBand(c.overall)}`),
      rows: CLASSIC.map(k => ({ label: t(k), value: `${c[k as 'physical']}%` })),
    }
    : r && {
      tool: t('title'),
      label: heroLabel,
      headline: t('share.headline', { v: signed(r.now.composite) }),
      sub: t(`band.composite.${band(r.now.composite / 100)}`),
      rows: keys.map(k => ({ label: t(k), value: `${signed(r.now[k])} · ${t(`bandName.${band(r.now[k] / 100)}`)}` })),
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ChartTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface border border-line rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-fg mb-1">{fmt(label)}</p>
        {payload.map((e: { color: string; name: string; value: number }) => (
          <p key={e.name} className="flex justify-between gap-4 text-body">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: e.color }} />{e.name}</span>
            <span className="font-semibold tabular-nums">{signed(e.value)}</span>
          </p>
        ))}
      </div>
    )
  }

  const chartFrame = (data: object[], lines: React.ReactNode) => (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={md} tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={4} stroke="var(--line)" />
          <YAxis domain={[-100, 100]} ticks={[-100, -50, 0, 50, 100]} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
          <Tooltip content={<ChartTip />} />
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          {today && today !== target && <ReferenceLine x={today} stroke="var(--muted)" strokeDasharray="3 3" label={{ value: t('today'), position: 'top', fontSize: 11, fill: 'var(--muted)' }} />}
          <ReferenceLine x={target} stroke="var(--fg)" strokeDasharray="3 3" label={{ value: target === today ? t('today') : t('chart.selected'), position: 'top', fontSize: 11, fill: 'var(--fg)' }} />
          {lines}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  const legend = (items: { name: string; color: string; dashed?: boolean }[]) => (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub mb-3">
      {items.map(i => (
        <span key={i.name} className="flex items-center gap-1.5">
          <span className="w-4 h-0 border-t-2" style={{ borderColor: i.color, borderStyle: i.dashed ? 'dashed' : 'solid' }} />{i.name}
        </span>
      ))}
    </div>
  )

  const dayList = (list: DayPoint[]) => (
    <ul className="space-y-1.5">
      {list.map(p => (
        <li key={p.date}>
          <button onClick={() => setTarget(p.date)} className="w-full flex justify-between text-sm hover:text-primary">
            <span className="text-body">{fmt(p.date)}</span>
            <span className="font-semibold text-fg tabular-nums">{signed(p.composite)}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div className="flex gap-1 p-1 bg-soft rounded-2xl" role="tablist">
              <button role="tab" aria-selected={mode === 'single'} onClick={() => setMode('single')} className={segBtn(mode === 'single')}>{t('mode.single')}</button>
              <button role="tab" aria-selected={mode === 'compat'} onClick={() => setMode('compat')} className={segBtn(mode === 'compat')}>{t('mode.compat')}</button>
            </div>

            {[
              { id: 'a', label: t('birthDate'), name: nameA, setName: setNameA, birth: birthA, setBirth: (v: string) => { setBirthA(v); setIsExample(false) }, err: errA },
              ...(mode === 'compat' ? [{ id: 'b', label: t('compatibility.birthDate2'), name: nameB, setName: setNameB, birth: birthB, setBirth: setBirthB, err: errB }] : []),
            ].map(f => (
              <div key={f.id} className="space-y-2">
                <label className="block text-sm font-medium text-body" htmlFor={`bio-birth-${f.id}`}>{f.label}</label>
                <div className="flex gap-2">
                  <input id={`bio-birth-${f.id}`} type="date" value={f.birth} min="1900-01-01" max={target || undefined}
                    onChange={e => f.setBirth(e.target.value)} className="ui-field px-4 py-3 flex-1 min-w-0" />
                  <input aria-label={t('input.name')} value={f.name} maxLength={20} onChange={e => f.setName(e.target.value)}
                    placeholder={f.id === 'a' ? t('input.namePlaceholder') : t('compat.partner')} className="ui-field px-3 py-3 w-24" />
                </div>
                {f.err && <p className="text-sm text-red-600" role="alert">{f.err}</p>}
                {f.id === 'a' && isExample && <p className="text-xs text-muted">{t('input.example')}</p>}
                {f.id === 'a' && r && <p className="text-xs text-muted">{t('daysLived', { days: r.now.days.toLocaleString('ko-KR') })}</p>}
                <button onClick={() => saveProfile(f.name, f.birth)} disabled={!isValidDate(f.birth)} className="text-sm font-medium text-primary disabled:text-faint">{t('profiles.save')}</button>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-body mb-1.5" htmlFor="bio-target">{t('targetDate')}</label>
              <div className="flex gap-2">
                <button onClick={() => setTarget(addDays(target, -1))} disabled={!isValidDate(target)} className="ui-btn-soft px-3 py-2 shrink-0" aria-label={t('chart.prev')}><ChevronLeft className="w-4 h-4" /></button>
                <input id="bio-target" type="date" value={target} onChange={e => setTarget(e.target.value)} className="ui-field px-4 py-3 flex-1 min-w-0" />
                <button onClick={() => setTarget(addDays(target, 1))} disabled={!isValidDate(target)} className="ui-btn-soft px-3 py-2 shrink-0" aria-label={t('chart.next')}><ChevronRight className="w-4 h-4" /></button>
              </div>
              {today && target !== today && (
                <button onClick={() => setTarget(today)} className="mt-2 text-sm font-medium text-primary">{t('input.backToday')}</button>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={intuitive} onChange={e => { setIntuitive(e.target.checked); if (!e.target.checked && compatCycle === 'intuitive') setCompatCycle('emotional') }} className="w-4 h-4 accent-[var(--primary)]" />
              {t('input.showIntuitive')}
            </label>
          </div>

          {/* 저장한 사람 */}
          <div className="ui-card p-6">
            <h2 className="text-base font-semibold text-fg mb-3">{t('profiles.title')}</h2>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted">{t('profiles.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {profiles.map(p => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-fg truncate">{p.name}</p>
                      <p className="text-xs text-muted tabular-nums">{p.date}</p>
                    </div>
                    {mode === 'compat' ? (
                      <>
                        <button onClick={() => loadA(p)} className={chipBtn(birthA === p.date && nameA === p.name)}>{t('profiles.asA')}</button>
                        <button onClick={() => loadB(p)} className={chipBtn(birthB === p.date && nameB === p.name)}>{t('profiles.asB')}</button>
                      </>
                    ) : (
                      <button onClick={() => loadA(p)} className={chipBtn(birthA === p.date && nameA === p.name)}>{t('profiles.load')}</button>
                    )}
                    <button onClick={() => removeProfile(p.id)} className="p-1.5 text-faint hover:text-red-600" aria-label={t('profiles.remove')}><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {!r ? (
            <div className="ui-card p-12 text-center text-muted">{today ? (errA || t('emptyState')) : null}</div>
          ) : mode === 'compat' ? (
            c ? (
              <>
                <div className="ui-hero p-6 sm:p-8">
                  <p className="text-sm text-white/70">{t('compat.label', pair)}</p>
                  <p className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{c.overall}%</p>
                  <p className="mt-2 text-white/90">{t(`compat.band.${compatBand(c.overall)}`)}</p>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {CLASSIC.map(k => (
                      <div key={k} className="rounded-2xl bg-white/15 p-4">
                        <p className="text-xs text-white/70">{t(k)}</p>
                        <p className="text-2xl font-bold tabular-nums">{c[k as 'physical']}%</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-white/70">{t('hero.fun')}</p>
                </div>

                {shareCard && (
                  <div className="space-y-2">
                    <ShareResult card={shareCard} url={hideBirth ? rootUrl : undefined} text={t('share.textCompat', { v: c.overall })} fileName="biorhythm-match" />
                    <label className="flex items-center gap-2 text-sm text-sub">
                      <input type="checkbox" checked={hideBirth} onChange={e => setHideBirth(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                      {t('share.hideBirth')}
                    </label>
                  </div>
                )}

                <div className="ui-card p-6 space-y-3">
                  <h2 className="text-base font-semibold text-fg">{t('compat.howTitle')}</h2>
                  <p className="bg-subtle rounded-2xl p-4 text-sm text-body font-medium">{t('compat.formula')}</p>
                  <p className="text-sm text-sub">{t('compat.formulaNote', { n: c.gap.toLocaleString('ko-KR') })}</p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[{ n: pair.a, p: r.now }, { n: pair.b, p: c.nowB }].map(x => (
                      <div key={x.n} className="bg-subtle rounded-2xl p-4">
                        <p className="text-xs text-muted">{t('compat.todayOf', { name: x.n, date: fmt(target) })}</p>
                        <p className="text-2xl font-bold text-fg tabular-nums">{signed(x.p.composite)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ui-card p-6">
                  <h2 className="text-base font-semibold text-fg mb-3">{t('compat.chartTitle')}</h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {keys.map(k => <button key={k} onClick={() => setCompatCycle(k)} className={chipBtn(compatCycle === k)}>{t(k)}</button>)}
                  </div>
                  {legend([{ name: pair.a, color: 'var(--primary)' }, { name: pair.b, color: '#f04452', dashed: true }])}
                  {chartFrame(c.chart, [
                    <Line key="a" type="monotone" dataKey="a" name={pair.a} stroke="var(--primary)" strokeWidth={2.5} dot={false} />,
                    <Line key="b" type="monotone" dataKey="b" name={pair.b} stroke="#f04452" strokeWidth={2} strokeDasharray="5 4" dot={false} />,
                  ])}
                  <p className="mt-2 text-xs text-muted">{t('chart.hint')}</p>
                </div>
              </>
            ) : (
              <div className="ui-card p-12 text-center text-muted">{errB || t('compat.needB')}</div>
            )
          ) : (
            <>
              <div className="ui-hero p-6 sm:p-8">
                <p className="text-sm text-white/70">{heroLabel}</p>
                <p className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{t('share.headline', { v: signed(r.now.composite) })}</p>
                <p className="mt-2 text-white/90">{t(`band.composite.${band(r.now.composite / 100)}`)}</p>
                {r.now.critical.length > 0 && (
                  <p className="mt-3 inline-block rounded-xl bg-white/20 px-3 py-1.5 text-sm font-semibold">{t('crit.todayShort', { list: critNames(r.now.critical) })}</p>
                )}
                <div className={`mt-6 grid gap-3 ${keys.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                  {keys.map(k => (
                    <div key={k} className="rounded-2xl bg-white/15 p-4">
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs text-white/70">{t(k)} · {t('cycleDays', { n: CYCLES[k] })}</p>
                        <p className="text-xs text-white/70">{t(rising(r.now.days, CYCLES[k]) ? 'hero.rising' : 'hero.falling')}</p>
                      </div>
                      <p className="text-2xl font-bold tabular-nums">{signed(r.now[k])}</p>
                      <p className="text-xs text-white/90 mt-1">{t(`band.${k}.${band(r.now[k] / 100)}`)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-white/70">{t('hero.fun')}</p>
              </div>

              {shareCard && (
                <div className="space-y-2">
                  <ShareResult card={shareCard} url={hideBirth ? rootUrl : undefined} text={t('share.text', { v: signed(r.now.composite) })} fileName="biorhythm" />
                  <label className="flex items-center gap-2 text-sm text-sub">
                    <input type="checkbox" checked={hideBirth} onChange={e => setHideBirth(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    {t('share.hideBirth')}
                  </label>
                </div>
              )}

              {/* 위험일 */}
              <div className="ui-card p-6 space-y-3">
                <h2 className="text-base font-semibold text-fg">{t('crit.title')}</h2>
                {r.now.critical.length > 0
                  ? <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('crit.today', { list: critNames(r.now.critical) })}</p>
                  : <p className="text-sm text-sub">{t('crit.none')}</p>}
                <p className="text-sm font-medium text-body pt-1">{t('crit.upcoming')}</p>
                {r.upcoming.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {r.upcoming.map(u => (
                      <li key={u.date}>
                        <button onClick={() => setTarget(u.date)} className="px-3 py-1.5 rounded-full bg-soft text-sm text-body hover:bg-subtle">
                          {fmt(u.date)} <span className="text-muted">{critNames(u.keys)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted">{t('crit.noneUpcoming')}</p>}
              </div>

              {/* 차트 */}
              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg mb-3">{t('chartTitle')}</h2>
                {legend(keys.map(k => ({ name: t(k), color: COLOR[k], dashed: k === 'intuitive' })))}
                {chartFrame(r.chart, keys.map(k => (
                  <Line key={k} type="monotone" dataKey={k} name={t(k)} stroke={COLOR[k]} strokeWidth={2}
                    strokeDasharray={k === 'intuitive' ? '5 4' : undefined} dot={false} activeDot={{ r: 4 }} />
                )))}
                <p className="mt-2 text-xs text-muted">{t('chart.hint')}</p>
              </div>

              {/* 이번 달 */}
              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg mb-4">{t('month.title', { m: +target.slice(5, 7) })}</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-primary mb-2">{t('month.best')}</p>
                    {dayList(r.month.best)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-sub mb-2">{t('month.worst')}</p>
                    {dayList(r.month.worst)}
                  </div>
                </div>
                {r.monthCritical.length > 0 && (
                  <p className="mt-5 text-sm text-sub">
                    <span className="font-medium text-body">{t('month.critical', { n: r.monthCritical.length })}</span>{' '}
                    {r.monthCritical.map(p => `${md(p.date)}(${critNames(p.critical)})`).join(', ')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {(['rhythms', 'critical'] as const).map(s => (
            <div key={s} className="space-y-3">
              <h3 className="font-medium text-fg">{t(`guide.${s}.title`)}</h3>
              <ul className="text-sm text-sub space-y-2">
                {(t.raw(`guide.${s}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
          <div className="space-y-3 md:col-span-2">
            <h3 className="font-medium text-fg">{t('guide.disclaimer.title')}</h3>
            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
              {(t.raw('guide.disclaimer.items') as string[]).map((item, i) => <p key={i}>{item}</p>)}
            </div>
          </div>
        </div>
      </div>
      <GuideSection namespace="biorhythm" />
    </div>
  )
}
