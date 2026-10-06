'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/carMaintenance'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { CalendarPlus, Check, RotateCcw, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  FUELS, ITEMS, schedule, annualCost, autoTax, buildIcs, encodeCar, decodeCar,
  type Car, type Fuel, type Due,
} from '@/utils/carMaintenance'

// ── Types ──
type VehicleType = 'light' | 'small' | 'medium' | 'large' | 'suv' | 'import'
type Tab = 'schedule' | 'cost'

// ── Constants ──
const STORAGE_KEY = 'toolhub:car-maintenance:cars'
// 정적 HTML·첫 렌더용 기준일 (마운트 후 실제 오늘로 교체 → hydration 불일치 없음)
const BUILD_TODAY = '2026-10-01'
const DEFAULT_CAR: Car = { id: 'default', name: '', fuel: 'gasoline', severe: false, km: 42000, monthlyKm: 1200, reg: '2023-06', records: { engineOil: { km: 28500 } } }

const DEFAULT_FUEL_PRICES: Record<Fuel, number> = { gasoline: 1680, diesel: 1520, lpg: 1050, hybrid: 1680, electric: 300 }
const INSURANCE_BASE: Record<VehicleType, number> = { light: 350000, small: 550000, medium: 750000, large: 950000, suv: 850000, import: 1200000 }
const DEPRECIATION_BASE: Record<VehicleType, number> = { light: 1500000, small: 2500000, medium: 4000000, large: 5500000, suv: 5000000, import: 8000000 }
const DEFAULT_EFFICIENCY: Record<Fuel, Record<VehicleType, number>> = {
  gasoline: { light: 16, small: 14, medium: 11, large: 9, suv: 10, import: 8 },
  diesel: { light: 18, small: 16, medium: 13, large: 11, suv: 12, import: 10 },
  lpg: { light: 12, small: 10, medium: 8, large: 7, suv: 8, import: 6 },
  hybrid: { light: 22, small: 20, medium: 17, large: 14, suv: 15, import: 13 },
  electric: { light: 6.5, small: 5.8, medium: 5.2, large: 4.8, suv: 5.0, import: 4.5 },
}
const VEHICLE_TYPES: VehicleType[] = ['light', 'small', 'medium', 'large', 'suv', 'import']
const COST_KEYS = ['autoTax', 'insurance', 'fuelCost', 'maintenance', 'parking', 'carWash', 'tollFees', 'depreciation'] as const

function insuranceFor(type: VehicleType, age: number) {
  const f = age <= 2 ? 1.2 : age <= 5 ? 1.0 : age <= 10 ? 0.85 : 0.7
  return Math.round(INSURANCE_BASE[type] * f)
}
function depreciationFor(type: VehicleType, age: number) {
  const f = age <= 1 ? 1.5 : age <= 3 ? 1.2 : age <= 5 ? 1.0 : age <= 8 ? 0.7 : age <= 12 ? 0.4 : 0.2
  return Math.round(DEPRECIATION_BASE[type] * f)
}

const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const fmt = (n: number) => Math.round(n).toLocaleString()
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const clampNum = (v: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)))

function readCars(): Car[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((c) => c && typeof c.id === 'string' && FUELS.includes(c.fuel)) : []
  } catch { return [] }
}

export default function CarMaintenance() {
  const t = useTranslations('carMaintenance')
  const searchParams = useSearchParams()
  const ready = useRef(false)
  const [loaded, setLoaded] = useState(false)

  const [tab, setTab] = useState<Tab>('cost')
  const [today, setToday] = useState(BUILD_TODAY)

  // ── 정비 주기 상태 ──
  const [car, setCar] = useState<Car>(DEFAULT_CAR)
  const [saved, setSaved] = useState<Car[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const isSaved = saved.some((c) => c.id === car.id)

  // ── 유지비 상태 ──
  const [vehicleType, setVehicleType] = useState<VehicleType>('medium')
  const [displacement, setDisplacement] = useState(1998)
  const [modelYear, setModelYear] = useState(2022)
  const [fuelType, setFuelType] = useState<Fuel>('gasoline')
  const [efficiency, setEfficiency] = useState(11)
  const [useCustomEfficiency, setUseCustomEfficiency] = useState(false)
  const [annualKm, setAnnualKm] = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(DEFAULT_FUEL_PRICES.gasoline)
  const [monthlyParking, setMonthlyParking] = useState(100000)
  const [carWashFrequency, setCarWashFrequency] = useState(2)
  const [carWashCost, setCarWashCost] = useState(10000)
  const [monthlyToll, setMonthlyToll] = useState(30000)
  const [showSchedule, setShowSchedule] = useState(false)

  // URL·저장소 → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    setToday(localToday())
    const list = readCars()
    setSaved(list)
    const fromUrl = decodeCar((k) => searchParams.get(k))
    if (fromUrl) { setCar({ ...DEFAULT_CAR, ...fromUrl, id: Date.now().toString(36) }); setTab('schedule') }
    else if (list[0]) setCar(list[0])
    if (searchParams.get('tab') === 'schedule') setTab('schedule')
    ready.current = true
    setLoaded(true)
  }, [searchParams])

  // 저장된 차는 수정 즉시 반영
  useEffect(() => {
    if (!loaded) return
    setSaved((prev) => (prev.some((c) => c.id === car.id) ? prev.map((c) => (c.id === car.id ? car : c)) : prev))
  }, [car, loaded])
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch { /* 저장 불가: 무시 */ }
  }, [saved, loaded])

  // 상태 → URL (정비 탭만, 차 이름·교체 날짜 제외)
  useEffect(() => {
    if (!loaded) return
    const q = tab === 'schedule' ? `?tab=schedule&${encodeCar(car)}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}${q}`)
  }, [tab, car, loaded])

  const patch = (p: Partial<Car>) => setCar((c) => ({ ...c, ...p }))
  const setRecord = (id: string, r: { km?: number; date?: string } | null) =>
    setCar((c) => {
      const records = { ...c.records }
      if (r) records[id] = r
      else delete records[id]
      return { ...c, records }
    })

  const saveCar = () => {
    const c = car.id === 'default' ? { ...car, id: Date.now().toString(36) } : car
    setCar(c)
    setSaved((prev) => [...prev, c])
  }
  const newCar = () => { setCar({ ...DEFAULT_CAR, id: Date.now().toString(36) }); setEditing(null) }
  const deleteCar = () => {
    const rest = saved.filter((c) => c.id !== car.id)
    setSaved(rest)
    setCar(rest[0] ?? DEFAULT_CAR)
  }
  const carLabel = (c: Car, i: number) => c.name || t('m.unnamedCar', { n: i + 1 })

  // ── 정비 일정 계산 ──
  const items = useMemo(() => schedule(car, today), [car, today])
  const next = items.find((d) => d.daysLeft != null)
  const overdueCount = items.filter((d) => d.overdue).length
  const yearly = useMemo(() => annualCost(car.fuel, car.severe, car.monthlyKm), [car.fuel, car.severe, car.monthlyKm])
  const itemName = (id: string) => t(`maintenanceItems.${id}`)
  const dday = (d: Due) => (d.daysLeft == null ? '-' : d.daysLeft === 0 ? 'D-Day' : d.daysLeft > 0 ? `D-${d.daysLeft}` : `D+${-d.daysLeft}`)
  const intervalText = (d: Due) =>
    [d.intervalKm != null && `${fmt(d.intervalKm)}km`, d.intervalMonths != null && t('m.months', { n: d.intervalMonths })].filter(Boolean).join(t('m.or'))

  const heroHeadline = next ? `${itemName(next.id)} ${dday(next)}` : t('m.noneDue')
  const heroSub = next
    ? [next.overdue ? t('m.overdue') : next.kmLeft != null && t('m.kmLeft', { km: fmt(Math.max(0, next.kmLeft)) }), next.dueDate].filter(Boolean).join(' · ')
    : ''

  const exportIcs = useCallback(() => {
    const events = items.filter((d) => d.dueDate).map((d) => ({
      uid: `${car.id}-${d.id}-${d.dueDate}`,
      date: d.overdue ? today : d.dueDate!,
      title: t('m.icsTitle', { item: itemName(d.id), car: car.name || t('title') }),
      description: [d.dueKm != null ? t('m.icsKm', { km: fmt(d.dueKm) }) : '', t('m.icsInterval', { interval: intervalText(d) }), t('m.disclaimer')].filter(Boolean).join('\n'),
      alarmDays: 3,
    }))
    const blob = new Blob([buildIcs(events, today)], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'car-maintenance.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, [items, car.id, car.name, today]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 유지비 계산 ──
  const taxYear = Number(today.slice(0, 4))
  const vehicleAge = Math.max(0, taxYear - modelYear)
  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type)
    if (!useCustomEfficiency) setEfficiency(DEFAULT_EFFICIENCY[fuelType][type])
  }
  const handleFuelTypeChange = (type: Fuel) => {
    setFuelType(type)
    setFuelPrice(DEFAULT_FUEL_PRICES[type])
    if (!useCustomEfficiency) setEfficiency(DEFAULT_EFFICIENCY[type][vehicleType])
  }

  const costBreakdown = useMemo(() => {
    // 정비비 = 소모품 교체주기 탭과 같은 로직(일반 조건, 중간값) × 노후 보정
    const ageFactor = vehicleAge > 10 ? 1.5 : vehicleAge > 7 ? 1.3 : vehicleAge > 5 ? 1.15 : 1
    return {
      autoTax: autoTax(displacement, modelYear, taxYear, fuelType === 'electric'),
      insurance: insuranceFor(vehicleType, vehicleAge),
      fuelCost: efficiency > 0 ? Math.round((annualKm / efficiency) * fuelPrice) : 0,
      maintenance: Math.round(annualCost(fuelType, false, annualKm / 12).mid * ageFactor),
      parking: monthlyParking * 12,
      carWash: carWashFrequency * carWashCost * 12,
      tollFees: monthlyToll * 12,
      depreciation: depreciationFor(vehicleType, vehicleAge),
    }
  }, [vehicleType, displacement, modelYear, taxYear, vehicleAge, fuelType, efficiency, annualKm, fuelPrice, monthlyParking, carWashFrequency, carWashCost, monthlyToll])

  const annualTotal = COST_KEYS.reduce((s, k) => s + costBreakdown[k], 0)
  const monthlyTotal = Math.round(annualTotal / 12)
  const costPerKm = annualKm > 0 ? Math.round(annualTotal / annualKm) : 0
  const maxCost = Math.max(1, ...COST_KEYS.map((k) => costBreakdown[k]))
  const monthlyPublicTransport = 65000
  const annualPublicTransport = monthlyPublicTransport * 12
  const costYearly = useMemo(() => annualCost(fuelType, false, annualKm / 12), [fuelType, annualKm])

  const handleReset = useCallback(() => {
    setVehicleType('medium'); setDisplacement(1998); setModelYear(2022); setFuelType('gasoline')
    setEfficiency(DEFAULT_EFFICIENCY.gasoline.medium); setUseCustomEfficiency(false); setAnnualKm(15000)
    setFuelPrice(DEFAULT_FUEL_PRICES.gasoline); setMonthlyParking(100000); setCarWashFrequency(2)
    setCarWashCost(10000); setMonthlyToll(30000); setShowSchedule(false)
  }, [])

  const yearOptions = useMemo(() => Array.from({ length: 26 }, (_, i) => taxYear - i), [taxYear])
  const won = (n: number) => `${fmt(n)}${t('won')}`
  const label = 'block text-sm font-medium text-body mb-1'
  const unit = 'absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint'

  const numField = (value: number, set: (n: number) => void, suffix: string, max = 1e9) => (
    <div className="relative">
      <input type="number" inputMode="numeric" min={0} value={value || ''} onChange={(e) => set(clampNum(e.target.value, max))}
        className="ui-field w-full px-4 py-3 pr-16" />
      <span className={unit}>{suffix}</span>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="flex gap-2" role="tablist">
        {(['cost', 'schedule'] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={seg(tab === k)}>
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'schedule' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── 내 차 설정 ── */}
          <div className="lg:col-span-1 space-y-6">
            <div className="ui-card p-6 space-y-4">
              {saved.length > 0 && (
                <div>
                  <p className={label}>{t('m.myCars')}</p>
                  <div className="flex flex-wrap gap-2">
                    {saved.map((c, i) => (
                      <button key={c.id} onClick={() => { setCar(c); setEditing(null) }} className={seg(c.id === car.id)}>{carLabel(c, i)}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="cm-name" className={label}>{t('m.carName')}</label>
                <input id="cm-name" value={car.name} maxLength={20} onChange={(e) => patch({ name: e.target.value })}
                  placeholder={t('m.carNamePlaceholder')} className="ui-field w-full px-4 py-3" />
              </div>
              <div>
                <p className={label}>{t('fuelType')}</p>
                <div className="flex flex-wrap gap-2">
                  {FUELS.map((f) => (
                    <button key={f} onClick={() => patch({ fuel: f })} className={seg(car.fuel === f)}>{t(`fuelTypes.${f}`)}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className={label}>{t('m.condition')}</p>
                <div className="flex gap-2">
                  <button onClick={() => patch({ severe: false })} className={seg(!car.severe)}>{t('m.normal')}</button>
                  <button onClick={() => patch({ severe: true })} className={seg(car.severe)}>{t('m.severe')}</button>
                </div>
                <p className="bg-subtle rounded-xl p-3 mt-2 text-xs text-sub leading-relaxed">{t('m.severeHelp')}</p>
              </div>
              <div>
                <label className={label}>{t('m.currentKm')}</label>
                {numField(car.km, (n) => patch({ km: n }), 'km', 2000000)}
              </div>
              <div>
                <label className={label}>{t('m.monthlyKm')}</label>
                {numField(car.monthlyKm, (n) => patch({ monthlyKm: n }), 'km', 20000)}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[500, 1000, 1500, 2500].map((km) => (
                    <button key={km} onClick={() => patch({ monthlyKm: km })} className={`px-3 py-1 text-xs rounded-full transition-colors ${car.monthlyKm === km ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}>
                      {fmt(km)}km
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="cm-reg" className={label}>{t('m.reg')}</label>
                <input id="cm-reg" type="month" value={car.reg} max={today.slice(0, 7)} onChange={(e) => e.target.value && patch({ reg: e.target.value })}
                  className="ui-field w-full px-4 py-3" />
              </div>
              <div className="flex gap-2 pt-1">
                {isSaved ? (
                  <span className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-primary font-medium"><Check className="w-4 h-4" />{t('m.autoSaved')}</span>
                ) : (
                  <button onClick={saveCar} className="ui-btn flex-1 px-4 py-3"><Save className="w-4 h-4" />{t('m.saveCar')}</button>
                )}
                <button onClick={newCar} className="ui-btn-soft px-3 py-3" title={t('m.newCar')} aria-label={t('m.newCar')}><Plus className="w-4 h-4" /></button>
                {isSaved && (
                  <button onClick={deleteCar} className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-3" title={t('m.deleteCar')} aria-label={t('m.deleteCar')}><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              <p className="text-xs text-faint">{t('m.storageNote')}</p>
            </div>
          </div>

          {/* ── 결과 ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{next?.overdue ? t('m.heroOverdueLabel') : t('m.heroLabel')}</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{heroHeadline}</p>
              {heroSub && <p className="text-sm text-white/80 mt-1 tabular-nums">{heroSub}</p>}
              <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                <div>
                  <p className="text-white/70">{t('m.yearlyCost')}</p>
                  <p className="font-semibold tabular-nums">{won(yearly.lo)} ~ {won(yearly.hi)}</p>
                </div>
                <div>
                  <p className="text-white/70">{t('m.overdueCount')}</p>
                  <p className="font-semibold tabular-nums">{t('m.countUnit', { n: overdueCount })}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-start justify-between">
              <ShareResult
                card={{
                  tool: t('m.shareTool'),
                  label: t('m.heroLabel'),
                  headline: heroHeadline,
                  sub: heroSub,
                  rows: items.slice(0, 5).map((d) => ({ label: itemName(d.id), value: `${dday(d)} · ${d.dueDate ?? '-'}` })),
                }}
                text={`${t('m.heroLabel')}: ${heroHeadline}`}
                fileName="car-maintenance"
              />
              <button onClick={exportIcs} className="ui-btn-soft px-4 py-2 text-sm"><CalendarPlus className="w-4 h-4" />{t('m.exportIcs')}</button>
            </div>

            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('m.timeline')}</h2>
              <p className="text-xs text-muted mt-1">{t('m.timelineNote')}</p>
              <ul className="mt-4 divide-y divide-line">
                {items.map((d) => {
                  const spec = ITEMS.find((s) => s.id === d.id)!
                  const rec = car.records[d.id]
                  const open = editing === d.id
                  return (
                    <li key={d.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-fg flex flex-wrap items-center gap-1.5">
                            {itemName(d.id)}
                            {d.overdue && <span className="text-xs font-semibold rounded-full border border-red-500 text-red-500 px-2 py-0.5">{t('m.warning')}</span>}
                            {d.estimated && <span className="text-xs rounded-full bg-soft text-sub px-2 py-0.5">{t('m.estimated')}</span>}
                          </p>
                          <p className="text-sm text-sub mt-0.5 tabular-nums">
                            {t('m.nextDue')} {d.dueDate ?? '-'}{d.dueKm != null && ` · ${fmt(d.dueKm)}km`}
                            {d.kmLeft != null && !d.overdue && ` · ${t('m.kmLeft', { km: fmt(d.kmLeft) })}`}
                            {d.overdue && d.kmLeft != null && d.kmLeft < 0 && ` · ${t('m.kmOver', { km: fmt(-d.kmLeft) })}`}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {t('m.interval')} {intervalText(d)} · {t(`m.src.${spec.src}`)} · {t('m.costEach')} {won(spec.cost[0])}~{won(spec.cost[1])}
                          </p>
                          <p className="text-xs text-faint mt-0.5 tabular-nums">
                            {t('m.last')} {fmt(d.lastKm)}km · {d.lastDate}
                          </p>
                        </div>
                        <p className={`text-xl font-bold tabular-nums shrink-0 ${d.overdue ? 'text-red-500' : 'text-fg'}`}>{dday(d)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button onClick={() => { setRecord(d.id, { km: car.km, date: today }); setEditing(null) }} className="ui-btn-soft px-3 py-1.5 text-xs">
                          <Check className="w-3.5 h-3.5" />{t('m.doneToday')}
                        </button>
                        <button onClick={() => setEditing(open ? null : d.id)} aria-expanded={open} className="bg-soft hover:bg-subtle text-body rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1">
                          {t('m.editRecord')}{open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {open && (
                        <div className="bg-subtle rounded-xl p-4 mt-3 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                          <div>
                            <label className="block text-xs text-sub mb-1">{t('m.lastKm')}</label>
                            <input type="number" inputMode="numeric" min={0} max={car.km} value={rec?.km ?? ''} placeholder={fmt(d.lastKm)}
                              onChange={(e) => setRecord(d.id, { ...rec, km: e.target.value === '' ? undefined : clampNum(e.target.value, car.km) })}
                              className="ui-field w-full px-3 py-2" />
                          </div>
                          <div>
                            <label className="block text-xs text-sub mb-1">{t('m.lastDate')}</label>
                            <input type="date" max={today} value={rec?.date ?? ''}
                              onChange={(e) => setRecord(d.id, { ...rec, date: e.target.value || undefined })}
                              className="ui-field w-full px-3 py-2" />
                          </div>
                          <button onClick={() => setRecord(d.id, null)} className="bg-surface hover:bg-soft text-body rounded-lg px-3 py-2 text-xs border border-line">{t('m.clearRecord')}</button>
                          <p className="sm:col-span-3 text-xs text-muted">{t('m.recordHelp')}</p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('m.yearlyTitle')}</h2>
              <p className="text-3xl font-bold text-fg tabular-nums mt-2">{won(yearly.lo)} ~ {won(yearly.hi)}</p>
              <p className="text-sm text-muted mt-1">{t('m.yearlyNote', { km: fmt(car.monthlyKm * 12) })}</p>
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="text-left py-2 font-medium">{t('scheduleItem')}</th>
                    <th className="text-right py-2 font-medium">{t('m.perYear')}</th>
                    <th className="text-right py-2 font-medium">{t('scheduleAnnualCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {yearly.items.map((i) => (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="py-2 text-body">{itemName(i.id)}</td>
                      <td className="py-2 text-right text-sub tabular-nums">{i.perYear.toFixed(1)}</td>
                      <td className="py-2 text-right text-fg tabular-nums">{won(i.lo)}~{won(i.hi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── 유지비 입력 ── */}
          <div className="lg:col-span-1 space-y-6">
            <div className="ui-card p-6 space-y-4">
              <MobileResultLink href="#car-maintenance-result" label={t('annualTotal')} value={won(annualTotal)} />
              <h2 className="text-lg font-semibold text-fg">{t('vehicleInfo')}</h2>
              <div>
                <label htmlFor="cm-vt" className={label}>{t('vehicleType')}</label>
                <select id="cm-vt" value={vehicleType} onChange={(e) => handleVehicleTypeChange(e.target.value as VehicleType)} className="ui-field w-full px-4 py-3">
                  {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{t(`vehicleTypes.${v}`)}</option>)}
                </select>
              </div>
              <div>
                <p className={label}>{t('fuelType')}</p>
                <div className="flex flex-wrap gap-2">
                  {FUELS.map((f) => <button key={f} onClick={() => handleFuelTypeChange(f)} className={seg(fuelType === f)}>{t(`fuelTypes.${f}`)}</button>)}
                </div>
              </div>
              {fuelType !== 'electric' && (
                <div>
                  <label className={label}>{t('displacement')}</label>
                  {numField(displacement, setDisplacement, 'cc', 8000)}
                </div>
              )}
              <div>
                <label htmlFor="cm-year" className={label}>{t('modelYear')}</label>
                <select id="cm-year" value={modelYear} onChange={(e) => setModelYear(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                  {yearOptions.map((y) => <option key={y} value={y}>{y}{t('year')} ({taxYear - y + 1}{t('yearsOld')})</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="cm-eff" className="block text-sm font-medium text-body">{t('fuelEfficiency')}</label>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={useCustomEfficiency} className="accent-[var(--primary)]"
                      onChange={(e) => { setUseCustomEfficiency(e.target.checked); if (!e.target.checked) setEfficiency(DEFAULT_EFFICIENCY[fuelType][vehicleType]) }} />
                    {t('customInput')}
                  </label>
                </div>
                <div className="relative">
                  <input id="cm-eff" type="number" min={0} step={0.1} value={efficiency || ''} disabled={!useCustomEfficiency}
                    onChange={(e) => setEfficiency(Math.max(0, Number(e.target.value) || 0))} className="ui-field w-full px-4 py-3 pr-20 disabled:opacity-60" />
                  <span className={unit}>{fuelType === 'electric' ? 'km/kWh' : 'km/L'}</span>
                </div>
              </div>
            </div>

            <div className="ui-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-fg">{t('drivingCosts')}</h2>
              <div>
                <label className={label}>{t('annualDistance')}</label>
                {numField(annualKm, setAnnualKm, 'km', 200000)}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[10000, 15000, 20000, 30000].map((km) => (
                    <button key={km} onClick={() => setAnnualKm(km)} className={`px-3 py-1 text-xs rounded-full transition-colors ${annualKm === km ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}>
                      {fmt(km)}km
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label}>{t('fuelPrice')} ({fuelType === 'electric' ? t('wonPerKwh') : t('wonPerLiter')})</label>
                {numField(fuelPrice, setFuelPrice, t('won'), 10000)}
              </div>
              <div>
                <label className={label}>{t('monthlyParking')}</label>
                {numField(monthlyParking, setMonthlyParking, t('won'))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>{t('carWashFrequency')}</label>
                  {numField(carWashFrequency, setCarWashFrequency, t('timesPerMonth'), 30)}
                </div>
                <div>
                  <label className={label}>{t('carWashCost')}</label>
                  {numField(carWashCost, setCarWashCost, t('won'))}
                </div>
              </div>
              <div>
                <label className={label}>{t('monthlyToll')}</label>
                {numField(monthlyToll, setMonthlyToll, t('won'))}
              </div>
              <button onClick={handleReset} className="ui-btn-soft w-full px-4 py-2"><RotateCcw className="w-4 h-4" />{t('reset')}</button>
            </div>
          </div>

          {/* ── 유지비 결과 ── */}
          <div className="lg:col-span-2 space-y-6">
            <div id="car-maintenance-result" className="ui-hero p-6 scroll-mt-20">
              <p className="text-sm text-white/70">{t('annualTotal')}</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{won(annualTotal)}</p>
              <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                <div><p className="text-white/70">{t('monthlyAverage')}</p><p className="font-semibold tabular-nums">{won(monthlyTotal)}</p></div>
                <div><p className="text-white/70">{t('costPerKm')}</p><p className="font-semibold tabular-nums">{fmt(costPerKm)}{t('wonPerKm')}</p></div>
              </div>
            </div>
            <ShareResult
              card={{
                tool: t('title'),
                label: t('annualTotal'),
                headline: won(annualTotal),
                sub: `${t('monthlyAverage')} ${won(monthlyTotal)}`,
                rows: COST_KEYS.filter((k) => costBreakdown[k] > 0).sort((a, b) => costBreakdown[b] - costBreakdown[a]).slice(0, 5)
                  .map((k) => ({ label: t(`categories.${k}`), value: won(costBreakdown[k]) })),
              }}
              text={`${t('annualTotal')} ${won(annualTotal)}`}
              fileName="car-cost"
            />

            <div className="ui-card p-6">
              <h3 className="text-lg font-semibold text-fg mb-4">{t('costBreakdown')}</h3>
              <ul className="space-y-3">
                {COST_KEYS.map((k) => (
                  <li key={k}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-body">{t(`categories.${k}`)}</span>
                      <span className="text-fg font-semibold tabular-nums">
                        {won(costBreakdown[k])}
                        <span className="text-xs text-faint font-normal ml-1">({t('monthly')} {won(costBreakdown[k] / 12)} · {annualTotal > 0 ? Math.round((costBreakdown[k] / annualTotal) * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-track rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(costBreakdown[k] / maxCost) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-line-strong">
                <span className="text-sm font-bold text-fg">{t('total')}</span>
                <span className="text-lg font-bold text-primary tabular-nums">{won(annualTotal)}</span>
              </div>
              <p className="text-xs text-muted mt-3">{t('m.costNote')}</p>
            </div>

            <div className="ui-card p-6">
              <h3 className="text-lg font-semibold text-fg mb-3">{t('transitComparison')}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-subtle rounded-xl p-4">
                  <p className="text-sm text-muted">{t('carAnnualCost')}</p>
                  <p className="text-xl font-bold text-fg mt-1 tabular-nums">{won(annualTotal)}</p>
                  <p className="text-xs text-faint">{t('monthly')} {won(monthlyTotal)}</p>
                </div>
                <div className="bg-subtle rounded-xl p-4">
                  <p className="text-sm text-muted">{t('transitAnnualCost')}</p>
                  <p className="text-xl font-bold text-fg mt-1 tabular-nums">{won(annualPublicTransport)}</p>
                  <p className="text-xs text-faint">{t('monthly')} {won(monthlyPublicTransport)}</p>
                </div>
              </div>
              <p className="text-sm text-sub mt-4">{t('transitComparisonResult', { ratio: (annualTotal / annualPublicTransport).toFixed(1) })}</p>
            </div>

            <div className="ui-card p-6">
              <button onClick={() => setShowSchedule(!showSchedule)} aria-expanded={showSchedule} className="w-full flex items-center justify-between text-lg font-semibold text-fg">
                {t('maintenanceSchedule')}
                {showSchedule ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {showSchedule && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="text-left py-2 font-medium">{t('scheduleItem')}</th>
                        <th className="text-right py-2 font-medium">{t('m.perYear')}</th>
                        <th className="text-right py-2 font-medium">{t('scheduleAnnualCost')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costYearly.items.map((i) => (
                        <tr key={i.id} className="border-b border-line">
                          <td className="py-2 text-body">{itemName(i.id)}</td>
                          <td className="py-2 text-right text-sub tabular-nums">{i.perYear.toFixed(1)}</td>
                          <td className="py-2 text-right text-fg tabular-nums">{won(i.lo)}~{won(i.hi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => { patch({ fuel: fuelType, monthlyKm: Math.round(annualKm / 12) }); setTab('schedule') }} className="ui-btn-soft px-4 py-2 text-sm mt-4">
                    {t('m.goSchedule')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 가이드 ── */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {['m.guide.severe', 'm.guide.sources', 'm.guide.tips', 'guide.maintenanceSection', 'guide.taxSection', 'guide.savingsSection', 'guide.depreciationSection'].map((k) => (
            <div key={k}>
              <h3 className="font-medium text-fg mb-2">{t(`${k}.title`)}</h3>
              <ul className="space-y-1 list-disc pl-5 text-sm text-sub">
                {(t.raw(`${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="bg-subtle rounded-2xl p-5 text-sm text-sub mt-6">{t('m.disclaimer')}</p>
      </div>
    </div>
  )
}
