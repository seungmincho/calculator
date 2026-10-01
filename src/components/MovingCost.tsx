'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { RotateCcw, ChevronLeft, ChevronRight, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  estimate, monthDays, dayInfo, quoteStats, addDays, CHECKLIST_OFFSETS, MOVE_TYPES, ACCESS,
  type MoveType, type Access, type Piano, type Side, type DayInfo,
} from '@/utils/movingCost'

type SizeUnit = 'pyeong' | 'sqm'

const SIZE_PRESETS = [
  { label: 'oneRoom', pyeong: 6 },
  { label: 'twoRoom', pyeong: 10 },
  { label: 'twenty', pyeong: 20 },
  { label: 'thirty', pyeong: 30 },
  { label: 'forty', pyeong: 40 },
  { label: 'fiftyPlus', pyeong: 50 },
]
const KM_PRESETS = [
  { label: 'inCity', km: 10 },
  { label: 'nearBy', km: 40 },
  { label: 'longRange', km: 150 },
  { label: 'veryLong', km: 350 },
]
// 예전 링크(?dist=) 호환
const LEGACY_DIST: Record<string, number> = { inCity: 10, nearBy: 50, longRange: 150, veryLong: 350 }
const ACCESS_CODE: Record<Access, string> = { elevator: 'e', stairs: 's', ladder: 'l' }
const CHECK_KEY = 'moving-cost-checklist-v2'

const int = (v: string | null, def: number, min = 0, max = 99) => {
  const n = parseInt(v ?? '', 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
}
const parseSide = (v: string | null, def: Side): Side => {
  if (!v) return def
  const access = (Object.keys(ACCESS_CODE) as Access[]).find(a => ACCESS_CODE[a] === v[0]) ?? def.access
  return { access, floor: int(v.slice(1), def.floor, 1, 80) }
}
const DEFAULTS = {
  unit: 'pyeong' as SizeUnit, size: '20', type: 'full' as MoveType, km: '10',
  from: { floor: 3, access: 'elevator' } as Side, to: { floor: 5, access: 'elevator' } as Side,
  store: 0, ac: 1, piano: 'none' as Piano, clean: false, waste: 0,
}

export default function MovingCost() {
  const t = useTranslations('movingCost')
  const sp = useSearchParams()

  // ── 입력 (URL 복원) ──
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>(() => (sp.get('unit') === 'sqm' ? 'sqm' : 'pyeong'))
  const [sizeValue, setSizeValue] = useState(() => sp.get('size') || DEFAULTS.size)
  const [type, setType] = useState<MoveType>(() => {
    const p = sp.get('type') as MoveType
    return MOVE_TYPES.includes(p) ? p : DEFAULTS.type
  })
  const [km, setKm] = useState(() => sp.get('km') || String(LEGACY_DIST[sp.get('dist') ?? ''] ?? DEFAULTS.km))
  const [from, setFrom] = useState<Side>(() => parseSide(sp.get('from'), DEFAULTS.from))
  const [to, setTo] = useState<Side>(() => parseSide(sp.get('to'), DEFAULTS.to))
  const [storageDays, setStorageDays] = useState(() => int(sp.get('store'), DEFAULTS.store, 0, 365))
  const [ac, setAc] = useState(() => int(sp.get('ac'), DEFAULTS.ac, 0, 10))
  const [piano, setPiano] = useState<Piano>(() => {
    const p = sp.get('piano')
    return p === 'upright' || p === 'grand' ? p : 'none'
  })
  const [clean, setClean] = useState(() => sp.get('clean') === '1')
  const [waste, setWaste] = useState(() => int(sp.get('waste'), DEFAULTS.waste, 0, 50))
  const [date, setDate] = useState(() => (dayInfo(sp.get('date') ?? '') ? sp.get('date')! : ''))
  const [view, setView] = useState<{ y: number; m: number } | null>(null)
  const [quotes, setQuotes] = useState<string[]>(['', '', ''])
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // 날짜 의존 값은 마운트 후: 기본 이사일 = 오늘 + 30일, 체크리스트 복원
  useEffect(() => {
    if (!date) {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      setDate(addDays(today, 30))
    }
    try { setChecked(new Set(JSON.parse(localStorage.getItem(CHECK_KEY) || '[]'))) } catch { /* 시크릿 모드 등 */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (date) setView({ y: +date.slice(0, 4), m: +date.slice(5, 7) })
  }, [date])

  const pyeong = useMemo(() => {
    const v = parseFloat(sizeValue) || 0
    return sizeUnit === 'pyeong' ? v : v / 3.3058
  }, [sizeValue, sizeUnit])
  const kmNum = Math.max(0, parseFloat(km) || 0)

  const r = useMemo(() => (pyeong > 0
    ? estimate({ pyeong, type, km: kmNum, from, to, storageDays, ac, piano, clean, waste, date: date || undefined })
    : null), [pyeong, type, kmNum, from, to, storageDays, ac, piano, clean, waste, date])

  // ── URL 동기화 ──
  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams
    q.delete('dist')
    q.set('unit', sizeUnit); q.set('size', sizeValue); q.set('type', type); q.set('km', km)
    q.set('from', ACCESS_CODE[from.access] + from.floor); q.set('to', ACCESS_CODE[to.access] + to.floor)
    const opt: [string, string, boolean][] = [
      ['store', String(storageDays), storageDays > 0], ['ac', String(ac), true], ['piano', piano, piano !== 'none'],
      ['clean', '1', clean], ['waste', String(waste), waste > 0], ['date', date, !!date],
    ]
    for (const [k, v, on] of opt) { if (on) q.set(k, v); else q.delete(k) }
    window.history.replaceState(window.history.state, '', url)
  }, [sizeUnit, sizeValue, type, km, from, to, storageDays, ac, piano, clean, waste, date])

  const handleReset = () => {
    setSizeUnit(DEFAULTS.unit); setSizeValue(DEFAULTS.size); setType(DEFAULTS.type); setKm(DEFAULTS.km)
    setFrom(DEFAULTS.from); setTo(DEFAULTS.to); setStorageDays(DEFAULTS.store); setAc(DEFAULTS.ac)
    setPiano(DEFAULTS.piano); setClean(DEFAULTS.clean); setWaste(DEFAULTS.waste); setQuotes(['', '', ''])
  }

  const toggleCheck = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      try { localStorage.setItem(CHECK_KEY, JSON.stringify([...next])) } catch { /* 무시 */ }
      return next
    })
  }, [])

  const amt = (n: number) => t('amt', { n: n.toLocaleString('ko-KR') })
  const range = (x: { min: number; max: number }) => `${amt(x.min)} ~ ${amt(x.max)}`
  const sizeText = sizeUnit === 'pyeong' ? `${sizeValue}${t('pyeong')}` : `${sizeValue}${t('sqm')}`
  const weekdays = t.raw('cal.weekdays') as string[]
  const fmtDate = (d: string) => {
    const info = dayInfo(d)
    return info ? t('dateFmt', { m: +d.slice(5, 7), d: info.day, w: weekdays[info.dow] }) : d
  }
  const pct = (d: DayInfo) => Math.round((d.factor.typ - 1) * 100)

  const days = useMemo(() => (view ? monthDays(view.y, view.m) : []), [view])
  const shiftMonth = (n: number) => setView(v => {
    if (!v) return v
    const m = v.m + n
    return { y: v.y + Math.floor((m - 1) / 12), m: ((m - 1 + 120) % 12) + 1 }
  })
  const cheapest = useMemo(() => {
    const min = Math.min(...days.map(d => d.factor.typ))
    return days.filter(d => d.factor.typ === min).length
  }, [days])

  const stats = quoteStats(quotes.map(q => parseFloat(q)))
  const phases = t.raw('checklist.phases') as { title: string; items: string[] }[]
  const totalItems = phases.reduce((a, p) => a + p.items.length, 0)
  const doneItems = phases.reduce((a, p, pi) => a + p.items.filter((_, i) => checked.has(`${pi}:${i}`)).length, 0)
  const dLabel = (o: number) => (o === 0 ? 'D-day' : o < 0 ? `D${o}` : `D+${o}`)

  const seg = (on: boolean) => `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const numField = (value: number, set: (n: number) => void, max: number, w = 'w-24') => (
    <input
      type="number" inputMode="numeric" min={0} max={max} value={value}
      onChange={(e) => set(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
      className={`ui-field px-3 py-2 ${w}`}
    />
  )
  const sideInput = (label: string, s: Side, set: (s: Side) => void) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-body">{label}</h3>
        <div className="flex items-center gap-2">
          <input
            type="number" inputMode="numeric" min={1} max={80} value={s.floor}
            onChange={(e) => set({ ...s, floor: Math.min(80, Math.max(1, parseInt(e.target.value) || 1)) })}
            className="ui-field px-3 py-2 w-20" aria-label={label}
          />
          <span className="text-sm text-muted">{t('floor')}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {ACCESS.map(a => (
          <button key={a} onClick={() => set({ ...s, access: a })} className={seg(s.access === a)}>{t(`access.${a}`)}</button>
        ))}
      </div>
    </div>
  )

  const info = r?.day
  const badges = info ? [
    info.season === 'peak' && 'peak', info.season === 'shoulder' && 'shoulder', info.weekend && 'weekend',
    info.son && 'son', info.monthEnd && 'monthEnd',
  ].filter(Boolean) as string[] : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* 집 크기 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('sizeLabel')}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SIZE_PRESETS.map(p => (
                <button
                  key={p.pyeong}
                  onClick={() => { setSizeUnit('pyeong'); setSizeValue(String(p.pyeong)) }}
                  className={seg(sizeUnit === 'pyeong' && sizeValue === String(p.pyeong))}
                >
                  {t(`sizePresets.${p.label}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 min-w-0">
                <label htmlFor="mc-size" className="block text-sm font-medium text-body mb-1">{t('customSize')}</label>
                <input
                  id="mc-size" type="number" inputMode="decimal" min={1} value={sizeValue}
                  onChange={(e) => setSizeValue(e.target.value)} className="ui-field px-3 py-2"
                />
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSizeUnit('pyeong')} className={seg(sizeUnit === 'pyeong')}>{t('pyeong')}</button>
                <button onClick={() => setSizeUnit('sqm')} className={seg(sizeUnit === 'sqm')}>{t('sqm')}</button>
              </div>
            </div>
            {r && (
              <p className="text-sm text-sub">
                {sizeUnit === 'sqm' && `${t('approxPyeong', { n: pyeong.toFixed(1) })} · `}
                {t('vehicle', { ton: r.ton })}
              </p>
            )}
          </div>

          {/* 이사 형태 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('movingTypeLabel')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOVE_TYPES.map(m => (
                <button
                  key={m}
                  onClick={() => setType(m)}
                  className={`p-3 rounded-xl border text-left transition-colors ${type === m ? 'border-primary bg-primary-soft' : 'border-line hover:bg-subtle'}`}
                >
                  <div className={`font-semibold text-sm ${type === m ? 'text-primary' : 'text-fg'}`}>{t(`movingTypes.${m}`)}</div>
                  <div className="text-xs text-muted mt-1">{t(`movingTypeDesc.${m}`)}</div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-line">
              <label htmlFor="mc-store" className="text-sm font-medium text-body">{t('extras.storageDays')}</label>
              <input
                id="mc-store" type="number" inputMode="numeric" min={0} max={365} value={storageDays}
                onChange={(e) => setStorageDays(Math.min(365, Math.max(0, parseInt(e.target.value) || 0)))}
                className="ui-field px-3 py-2 w-24"
              />
              <span className="text-xs text-muted">{t('storageHint')}</span>
            </div>
          </div>

          {/* 거리 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('distanceLabel')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {KM_PRESETS.map(p => (
                <button key={p.km} onClick={() => setKm(String(p.km))} className={seg(km === String(p.km))}>
                  {t('kmPreset', { label: t(`distances.${p.label}`), km: p.km })}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" inputMode="numeric" min={0} value={km} aria-label={t('distanceLabel')}
                onChange={(e) => setKm(e.target.value)} className="ui-field px-3 py-2 w-32"
              />
              <span className="text-sm text-muted">km</span>
            </div>
          </div>

          {/* 층수·작업 방식 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('floorLabel')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {sideInput(t('currentFloor'), from, setFrom)}
              {sideInput(t('newFloor'), to, setTo)}
            </div>
            <p className="text-xs text-muted">{t('accessHint')}</p>
          </div>

          {/* 부대비용 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('extrasLabel')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('extras.acUnits')}</label>
                {numField(ac, setAc, 10)}
              </div>
              <div>
                <label htmlFor="mc-piano" className="block text-sm font-medium text-body mb-1">{t('extras.piano')}</label>
                <select id="mc-piano" value={piano} onChange={(e) => setPiano(e.target.value as Piano)} className="ui-field px-3 py-2">
                  <option value="none">{t('extras.pianoNone')}</option>
                  <option value="upright">{t('extras.pianoUpright')}</option>
                  <option value="grand">{t('extras.pianoGrand')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">{t('extras.waste')}</label>
                {numField(waste, setWaste, 50)}
              </div>
              <label className="flex items-center gap-2 cursor-pointer self-end py-2">
                <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} className="accent-[var(--primary)] w-4 h-4" />
                <span className="text-sm text-body">{t('extras.clean')}</span>
              </label>
            </div>
          </div>

          {/* 날짜 + 손없는날 달력 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg">{t('dateLabel')}</h2>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="ui-field px-3 py-2 w-auto" />
            </div>
            {info && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(badges.length ? badges : ['normal']).map(b => (
                    <span key={b} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b === 'normal' ? 'bg-primary-soft text-primary' : 'bg-soft text-body'}`}>
                      {t(`badge.${b}`)}
                    </span>
                  ))}
                  {info.lunar && (
                    <span className="px-2.5 py-1 rounded-full text-xs text-muted bg-subtle">
                      {t('lunarOf', { leap: info.lunar.isLeap ? t('leap') : '', m: info.lunar.month, d: info.lunar.day })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-sub">
                  {pct(info) > 0 ? t('dayPremium', { p: pct(info) }) : t('dayNoPremium')}
                </p>
              </div>
            )}

            {view && (
              <div className="bg-subtle rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-soft text-sub" aria-label={t('cal.prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-fg">{t('cal.title', { y: view.y, m: view.m })}</span>
                  <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-soft text-sub" aria-label={t('cal.next')}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekdays.map((w, i) => (
                    <div key={w} className={`text-xs py-1 ${i === 0 ? 'text-red-500' : 'text-muted'}`}>{w}</div>
                  ))}
                  {days.length > 0 && Array.from({ length: days[0].dow }).map((_, i) => <div key={`e${i}`} />)}
                  {days.map(d => {
                    const sel = d.date === date
                    const p = pct(d)
                    return (
                      <button
                        key={d.date}
                        onClick={() => setDate(d.date)}
                        aria-pressed={sel}
                        aria-label={fmtDate(d.date)}
                        className={`rounded-lg py-1.5 min-h-[52px] flex flex-col items-center leading-tight transition-colors ${sel ? 'bg-primary text-white' : 'bg-surface hover:bg-primary-soft'}`}
                      >
                        <span className={`text-sm font-semibold tabular-nums ${sel ? '' : d.dow === 0 || d.holiday ? 'text-red-500' : 'text-fg'}`}>{d.day}</span>
                        <span className={`text-[10px] ${sel ? 'text-white/80' : d.son ? 'text-primary font-semibold' : 'text-faint'}`}>
                          {d.son ? t('cal.son') : d.lunar ? `${d.lunar.month}.${d.lunar.day}` : ''}
                        </span>
                        <span className={`text-[10px] tabular-nums ${sel ? 'text-white/80' : 'text-muted'}`}>{p > 0 ? `+${p}%` : ''}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted mt-3 leading-relaxed">{t('cal.legend', { n: cheapest })}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={handleReset} className="ui-btn-soft px-4 py-2 text-sm">
              <RotateCcw className="w-4 h-4" /> {t('reset')}
            </button>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-1 min-w-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            {r ? (
              <>
                <div className="ui-hero p-6">
                  <p className="text-sm text-white/70">{t('hero.label', { size: sizeText, type: t(`movingTypes.${type}`) })}</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">{amt(r.total.typ)}</p>
                  <p className="mt-2 text-sm text-white/90">{t('hero.range', { range: range(r.total) })}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white/15 p-3">
                      <p className="text-xs text-white/70">{t('hero.mover')}</p>
                      <p className="text-lg font-bold tabular-nums">{amt(r.mover.typ)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-3">
                      <p className="text-xs text-white/70">{t('hero.extra')}</p>
                      <p className="text-lg font-bold tabular-nums">{amt(r.extra.typ)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/70">{t('hero.basis', { ton: r.ton, km: kmNum })}</p>
                </div>

                {r.warnings.map(w => (
                  <div key={w} className="flex gap-2 rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t(`warn.${w}`)}</span>
                  </div>
                ))}

                <div className="ui-card p-5">
                  <h2 className="text-sm font-semibold text-fg">{t('breakdownTitle')}</h2>
                  {(['mover', 'extra'] as const).map(g => {
                    const rows = r.lines.filter(l => l.group === g && l.r.max > 0)
                    if (!rows.length) return null
                    return (
                      <div key={g} className="mt-3">
                        <p className="text-xs text-muted mb-1">{t(`group.${g}`)}</p>
                        <dl className="divide-y divide-line">
                          {rows.map(l => (
                            <div key={l.key} className="flex justify-between gap-3 py-2 text-sm">
                              <dt className="text-sub">{t(`lines.${l.key}`)}</dt>
                              <dd className="text-fg tabular-nums text-right">{range(l.r)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )
                  })}
                  <div className="flex justify-between gap-3 pt-3 mt-2 border-t border-line text-sm font-semibold">
                    <span className="text-fg">{t('result.total')}</span>
                    <span className="text-fg tabular-nums text-right">{range(r.total)}</span>
                  </div>
                </div>

                <ShareResult
                  card={{
                    tool: t('title'),
                    label: t('hero.label', { size: sizeText, type: t(`movingTypes.${type}`) }),
                    headline: amt(r.total.typ),
                    sub: t('hero.range', { range: range(r.total) }),
                    rows: [
                      { label: t('share.vehicle'), value: r.ton },
                      { label: t('distanceLabel'), value: `${kmNum}km` },
                      ...(r.day ? [{ label: t('dateLabel'), value: `${fmtDate(r.day.date)}${pct(r.day) > 0 ? ` (+${pct(r.day)}%)` : ''}` }] : []),
                      { label: t('hero.mover'), value: range(r.mover) },
                      { label: t('hero.extra'), value: range(r.extra) },
                    ],
                  }}
                  text={t('share.text', { size: sizeText, type: t(`movingTypes.${type}`), amount: amt(r.total.typ) })}
                  fileName="moving-cost"
                />
                <p className="text-xs text-muted leading-relaxed">{t('disclaimer')}</p>
              </>
            ) : (
              <div className="ui-hero p-8 text-center text-sm text-white/70">{t('result.empty')}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 견적 비교 ── */}
      <div className="ui-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('quotes.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('quotes.desc')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quotes.map((q, i) => (
            <div key={i}>
              <label htmlFor={`mc-q${i}`} className="block text-sm font-medium text-body mb-1">{t('quotes.name', { n: i + 1 })}</label>
              <div className="flex items-center gap-2">
                <input
                  id={`mc-q${i}`} type="number" inputMode="numeric" min={0} value={q} placeholder={r ? String(r.total.typ) : ''}
                  onChange={(e) => setQuotes(qs => qs.map((x, j) => (j === i ? e.target.value : x)))}
                  className={`ui-field px-3 py-2 ${stats && stats.count > 1 && stats.minIdx === i ? 'border-primary' : ''}`}
                />
                <span className="text-sm text-muted whitespace-nowrap">{t('quotes.unit')}</span>
              </div>
            </div>
          ))}
        </div>
        {stats ? (
          <div className="bg-subtle rounded-2xl p-5 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              {(['min', 'avg', 'max'] as const).map(k => (
                <div key={k}>
                  <p className="text-xs text-muted">{t(`quotes.${k}`)}</p>
                  <p className={`text-lg font-bold tabular-nums ${k === 'min' ? 'text-primary' : 'text-fg'}`}>{amt(stats[k])}</p>
                </div>
              ))}
            </div>
            {r && (
              <p className="text-sm text-sub">
                {t('quotes.vsEstimate', {
                  diff: `${stats.avg - r.total.typ >= 0 ? '+' : ''}${amt(stats.avg - r.total.typ)}`,
                  range: range(r.total),
                })}
              </p>
            )}
            {r && stats.min < r.total.min * 0.8 && (
              <div className="flex gap-2 rounded-xl bg-amber-50 text-amber-800 p-3 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t('quotes.lowWarn')}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-faint">{t('quotes.empty')}</p>
        )}
      </div>

      {/* ── 체크리스트 타임라인 ── */}
      <div className="ui-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('checklist.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('checklist.desc')}</p>
          </div>
          <span className="text-sm font-semibold text-primary tabular-nums">{t('checklist.progress', { done: doneItems, total: totalItems })}</span>
        </div>
        <div className="w-full bg-track rounded-full h-2 mt-4">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(doneItems / totalItems) * 100}%` }} />
        </div>
        <ol className="mt-6 space-y-6">
          {phases.map((p, pi) => (
            <li key={pi}>
              <div className="flex flex-wrap items-baseline gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-primary-soft text-primary text-xs font-bold tabular-nums">{dLabel(CHECKLIST_OFFSETS[pi])}</span>
                <h3 className="text-sm font-semibold text-fg">{p.title}</h3>
                {date && <span className="text-xs text-muted">{fmtDate(addDays(date, CHECKLIST_OFFSETS[pi]))}</span>}
              </div>
              <ul className="space-y-1">
                {p.items.map((item, i) => {
                  const id = `${pi}:${i}`
                  const on = checked.has(id)
                  return (
                    <li key={id}>
                      <button onClick={() => toggleCheck(id)} aria-pressed={on} className="w-full flex items-start gap-3 text-left py-2 px-2 rounded-lg hover:bg-subtle transition-colors">
                        {on ? <CheckSquare className="w-5 h-5 text-primary flex-shrink-0" /> : <Square className="w-5 h-5 text-faint flex-shrink-0" />}
                        <span className={`text-sm ${on ? 'line-through text-faint' : 'text-body'}`}>{item}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      {/* ── 가이드 ── */}
      <div className="ui-card p-6 space-y-8">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <section>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sm text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(['howToUse', 'priceRef', 'tips', 'sources'] as const).map(s => (
            <section key={s}>
              <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${s}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 marker:text-faint">
                {(t.raw(`guide.${s}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-body leading-relaxed">{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <dl className="space-y-4">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-5">
                <dt className="text-sm font-semibold text-fg">{f.q}</dt>
                <dd className="text-sm text-sub mt-2 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
