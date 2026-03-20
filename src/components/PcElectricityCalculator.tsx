/**
 * PcElectricityCalculator - 컴퓨터 전기세 계산기
 * 번역 네임스페이스: pcElectricity
 *
 * 사용되는 번역 키:
 * - title, description
 * - components.cpu, components.gpu, components.ram, components.storage, components.monitor, components.etc
 * - components.cpuLabel, components.gpuLabel, components.ramLabel, components.storageLabel, components.monitorLabel, components.etcLabel
 * - cpu.presets (65W, 105W, 125W, 170W, 250W)
 * - gpu.presets (75W, 150W, 200W, 300W, 350W, 450W)
 * - ram.slots, ram.perSlot
 * - storage.ssd, storage.hdd, storage.count
 * - monitor.presets (24인치 30W, 27인치 40W, 32인치 50W)
 * - monitor.dual
 * - custom, watt
 * - usage.title, usage.hoursPerDay, usage.daysPerMonth, usage.hours, usage.days
 * - load.title, load.gaming, load.normal, load.idle, load.custom, load.percent
 * - tariff.title, tariff.progressive, tariff.custom, tariff.wonPerKwh
 * - tariff.tier1, tariff.tier2, tariff.tier3
 * - result.title, result.totalWatt, result.actualWatt, result.monthlyKwh, result.yearlyKwh
 * - result.monthlyCost, result.yearlyCost, result.won, result.kwh
 * - ratio.title
 * - guide.title, guide.section1.title, guide.section1.items
 * - guide.section2.title, guide.section2.items
 */
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Cpu, Monitor, HardDrive, Zap, Calculator, BookOpen } from 'lucide-react'

type LoadType = 'gaming' | 'normal' | 'idle' | 'custom'
type TariffType = 'progressive' | 'custom'

interface ComponentPower {
  cpu: number
  gpu: number
  ram: number
  storage: number
  monitor: number
  etc: number
}

const CPU_PRESETS = [65, 105, 125, 170, 250]
const GPU_PRESETS = [75, 150, 200, 300, 350, 450]
const MONITOR_PRESETS = [
  { size: 24, watt: 30 },
  { size: 27, watt: 40 },
  { size: 32, watt: 50 },
]

const LOAD_RATES: Record<Exclude<LoadType, 'custom'>, number> = {
  gaming: 85,
  normal: 50,
  idle: 20,
}

// 2025 한전 주택용 전기요금 누진제
const PROGRESSIVE_TIERS = [
  { limit: 200, rate: 120 },
  { limit: 400, rate: 214.6 },
  { limit: Infinity, rate: 307.3 },
]

function calculateProgressiveCost(monthlyKwh: number): number {
  let remaining = monthlyKwh
  let cost = 0
  let prevLimit = 0
  for (const tier of PROGRESSIVE_TIERS) {
    const tierKwh = Math.min(remaining, tier.limit - prevLimit)
    if (tierKwh <= 0) break
    cost += tierKwh * tier.rate
    remaining -= tierKwh
    prevLimit = tier.limit
  }
  return cost
}

const COMPONENT_COLORS: Record<keyof ComponentPower, string> = {
  cpu: 'bg-blue-500',
  gpu: 'bg-red-500',
  ram: 'bg-green-500',
  storage: 'bg-yellow-500',
  monitor: 'bg-purple-500',
  etc: 'bg-gray-400',
}

export default function PcElectricityCalculator() {
  const t = useTranslations('pcElectricity')

  // Component power states
  const [cpuPreset, setCpuPreset] = useState<number | null>(125)
  const [cpuCustom, setCpuCustom] = useState('')
  const [gpuPreset, setGpuPreset] = useState<number | null>(200)
  const [gpuCustom, setGpuCustom] = useState('')
  const [ramSlots, setRamSlots] = useState(2)
  const [ssdCount, setSsdCount] = useState(1)
  const [hddCount, setHddCount] = useState(0)
  const [monitorPreset, setMonitorPreset] = useState<number | null>(40)
  const [monitorCustom, setMonitorCustom] = useState('')
  const [isDualMonitor, setIsDualMonitor] = useState(false)
  const [etcWatt, setEtcWatt] = useState(20)

  // Usage pattern states
  const [hoursPerDay, setHoursPerDay] = useState(5)
  const [daysPerMonth, setDaysPerMonth] = useState(30)
  const [loadType, setLoadType] = useState<LoadType>('normal')
  const [customLoad, setCustomLoad] = useState(50)

  // Tariff states
  const [tariffType, setTariffType] = useState<TariffType>('progressive')
  const [customTariff, setCustomTariff] = useState(200)

  const cpuWatt = cpuPreset ?? (parseFloat(cpuCustom) || 0)
  const gpuWatt = gpuPreset ?? (parseFloat(gpuCustom) || 0)
  const ramWatt = ramSlots * 10
  const storageWatt = ssdCount * 5 + hddCount * 10
  const monitorWatt = (monitorPreset ?? (parseFloat(monitorCustom) || 0)) * (isDualMonitor ? 2 : 1)

  const componentPower: ComponentPower = useMemo(() => ({
    cpu: cpuWatt,
    gpu: gpuWatt,
    ram: ramWatt,
    storage: storageWatt,
    monitor: monitorWatt,
    etc: etcWatt,
  }), [cpuWatt, gpuWatt, ramWatt, storageWatt, monitorWatt, etcWatt])

  const loadRate = loadType === 'custom' ? customLoad : LOAD_RATES[loadType]

  const result = useMemo(() => {
    const totalWatt = Object.values(componentPower).reduce((s, v) => s + v, 0)
    const actualWatt = totalWatt * (loadRate / 100)
    const monthlyKwh = (actualWatt * hoursPerDay * daysPerMonth) / 1000
    const yearlyKwh = monthlyKwh * 12
    const monthlyCost = tariffType === 'progressive'
      ? calculateProgressiveCost(monthlyKwh)
      : monthlyKwh * customTariff
    const yearlyCost = monthlyCost * 12

    return { totalWatt, actualWatt, monthlyKwh, yearlyKwh, monthlyCost, yearlyCost }
  }, [componentPower, loadRate, hoursPerDay, daysPerMonth, tariffType, customTariff])

  const componentEntries = useMemo(() => {
    const total = result.totalWatt || 1
    return (Object.keys(componentPower) as (keyof ComponentPower)[])
      .map((key) => ({
        key,
        watt: componentPower[key],
        percent: (componentPower[key] / total) * 100,
      }))
      .filter((e) => e.watt > 0)
  }, [componentPower, result.totalWatt])

  const formatNumber = useCallback((n: number, decimals = 0) => {
    return n.toLocaleString('ko-KR', { maximumFractionDigits: decimals })
  }, [])

  const handleCpuPreset = (w: number) => {
    setCpuPreset(w)
    setCpuCustom('')
  }
  const handleCpuCustom = (v: string) => {
    setCpuCustom(v)
    setCpuPreset(null)
  }
  const handleGpuPreset = (w: number) => {
    setGpuPreset(w)
    setGpuCustom('')
  }
  const handleGpuCustom = (v: string) => {
    setGpuCustom(v)
    setGpuPreset(null)
  }
  const handleMonitorPreset = (w: number) => {
    setMonitorPreset(w)
    setMonitorCustom('')
  }
  const handleMonitorCustom = (v: string) => {
    setMonitorCustom(v)
    setMonitorPreset(null)
  }

  const componentLabelKey = (key: keyof ComponentPower): string => {
    const map: Record<keyof ComponentPower, string> = {
      cpu: 'components.cpuLabel',
      gpu: 'components.gpuLabel',
      ram: 'components.ramLabel',
      storage: 'components.storageLabel',
      monitor: 'components.monitorLabel',
      etc: 'components.etcLabel',
    }
    return map[key]
  }

  const presetBtnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-7 h-7 text-yellow-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Components */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              {t('components.cpu')}
            </h2>

            {/* CPU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('components.cpuLabel')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {CPU_PRESETS.map((w) => (
                  <button key={w} className={presetBtnClass(cpuPreset === w)} onClick={() => handleCpuPreset(w)}>
                    {w}W
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('custom')}</span>
                <input
                  type="number"
                  className={inputClass + ' max-w-[120px]'}
                  placeholder="W"
                  value={cpuCustom}
                  onChange={(e) => handleCpuCustom(e.target.value)}
                  min={0}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('watt')}</span>
              </div>
            </div>

            {/* GPU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('components.gpuLabel')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {GPU_PRESETS.map((w) => (
                  <button key={w} className={presetBtnClass(gpuPreset === w)} onClick={() => handleGpuPreset(w)}>
                    {w}W
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('custom')}</span>
                <input
                  type="number"
                  className={inputClass + ' max-w-[120px]'}
                  placeholder="W"
                  value={gpuCustom}
                  onChange={(e) => handleGpuCustom(e.target.value)}
                  min={0}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('watt')}</span>
              </div>
            </div>

            {/* RAM */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('components.ramLabel')} ({t('ram.perSlot')})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('ram.slots')}</span>
                <select
                  className={inputClass + ' max-w-[100px]'}
                  value={ramSlots}
                  onChange={(e) => setRamSlots(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500 dark:text-gray-400">= {ramWatt}W</span>
              </div>
            </div>

            {/* Storage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('components.storageLabel')}
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('storage.ssd')}</span>
                  <select
                    className={inputClass + ' max-w-[80px]'}
                    value={ssdCount}
                    onChange={(e) => setSsdCount(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('storage.hdd')}</span>
                  <select
                    className={inputClass + ' max-w-[80px]'}
                    value={hddCount}
                    onChange={(e) => setHddCount(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">= {storageWatt}W</span>
              </div>
            </div>

            {/* Monitor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Monitor className="w-4 h-4 inline mr-1" />
                {t('components.monitorLabel')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {MONITOR_PRESETS.map((m) => (
                  <button
                    key={m.size}
                    className={presetBtnClass(monitorPreset === m.watt)}
                    onClick={() => handleMonitorPreset(m.watt)}
                  >
                    {m.size}{t('monitor.inch')} ({m.watt}W)
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('custom')}</span>
                  <input
                    type="number"
                    className={inputClass + ' max-w-[100px]'}
                    placeholder="W"
                    value={monitorCustom}
                    onChange={(e) => handleMonitorCustom(e.target.value)}
                    min={0}
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-blue-600 w-4 h-4"
                    checked={isDualMonitor}
                    onChange={(e) => setIsDualMonitor(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('monitor.dual')}</span>
                </label>
              </div>
            </div>

            {/* Etc */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('components.etcLabel')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={inputClass + ' max-w-[120px]'}
                  value={etcWatt}
                  onChange={(e) => setEtcWatt(Math.max(0, Number(e.target.value)))}
                  min={0}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('watt')}</span>
              </div>
            </div>
          </div>

          {/* Usage Pattern */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-500" />
              {t('usage.title')}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('usage.hoursPerDay')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className={inputClass}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Math.min(24, Math.max(0, Number(e.target.value))))}
                    min={0}
                    max={24}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('usage.hours')}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('usage.daysPerMonth')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className={inputClass}
                    value={daysPerMonth}
                    onChange={(e) => setDaysPerMonth(Math.min(31, Math.max(0, Number(e.target.value))))}
                    min={0}
                    max={31}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('usage.days')}</span>
                </div>
              </div>
            </div>

            {/* Load type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('load.title')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(['gaming', 'normal', 'idle', 'custom'] as LoadType[]).map((lt) => (
                  <button
                    key={lt}
                    className={presetBtnClass(loadType === lt)}
                    onClick={() => setLoadType(lt)}
                  >
                    {t(`load.${lt}`)}
                    {lt !== 'custom' && ` (${LOAD_RATES[lt]}%)`}
                  </button>
                ))}
              </div>
              {loadType === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    className={inputClass + ' max-w-[100px]'}
                    value={customLoad}
                    onChange={(e) => setCustomLoad(Math.min(100, Math.max(0, Number(e.target.value))))}
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('load.percent')}</span>
                </div>
              )}
            </div>

            {/* Tariff */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tariff.title')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  className={presetBtnClass(tariffType === 'progressive')}
                  onClick={() => setTariffType('progressive')}
                >
                  {t('tariff.progressive')}
                </button>
                <button
                  className={presetBtnClass(tariffType === 'custom')}
                  onClick={() => setTariffType('custom')}
                >
                  {t('tariff.custom')}
                </button>
              </div>
              {tariffType === 'progressive' ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                  <p>{t('tariff.tier1')}</p>
                  <p>{t('tariff.tier2')}</p>
                  <p>{t('tariff.tier3')}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    className={inputClass + ' max-w-[120px]'}
                    value={customTariff}
                    onChange={(e) => setCustomTariff(Math.max(0, Number(e.target.value)))}
                    min={0}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('tariff.wonPerKwh')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-1 space-y-6">
          {/* Result cards */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              {t('result.title')}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <ResultCard label={t('result.totalWatt')} value={`${formatNumber(result.totalWatt)}W`} />
              <ResultCard label={t('result.actualWatt')} value={`${formatNumber(result.actualWatt, 1)}W`} />
              <ResultCard label={t('result.monthlyKwh')} value={`${formatNumber(result.monthlyKwh, 1)} ${t('result.kwh')}`} />
              <ResultCard label={t('result.yearlyKwh')} value={`${formatNumber(result.yearlyKwh, 1)} ${t('result.kwh')}`} />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('result.monthlyCost')}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(Math.round(result.monthlyCost))}{t('result.won')}
                </p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('result.yearlyCost')}</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatNumber(Math.round(result.yearlyCost))}{t('result.won')}
                </p>
              </div>
            </div>
          </div>

          {/* Component ratio bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" />
              {t('ratio.title')}
            </h3>

            {/* Stacked bar */}
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {componentEntries.map((entry) => (
                <div
                  key={entry.key}
                  className={`${COMPONENT_COLORS[entry.key]} h-full transition-all`}
                  style={{ width: `${entry.percent}%` }}
                  title={`${t(componentLabelKey(entry.key))}: ${entry.watt}W (${entry.percent.toFixed(1)}%)`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {componentEntries.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${COMPONENT_COLORS[entry.key]}`} />
                    <span className="text-gray-700 dark:text-gray-300">{t(componentLabelKey(entry.key))}</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {entry.watt}W ({entry.percent.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.section1.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.section1.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.section2.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.section2.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
