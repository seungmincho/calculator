'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Monitor, Smartphone, Tablet, Laptop } from 'lucide-react'

// ── Device Database ──────────────────────────────────────────────────────────

type DeviceCategory = 'phone' | 'tablet' | 'monitor' | 'laptop'

interface Device {
  id: string
  name: string
  category: DeviceCategory
  diagonal: number   // inches
  width: number      // pixels (landscape long side)
  height: number     // pixels (landscape short side)
}

const DEVICES: Device[] = [
  // Phones
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', category: 'phone', diagonal: 6.9, width: 2868, height: 1320 },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', category: 'phone', diagonal: 6.3, width: 2622, height: 1206 },
  { id: 'iphone-16', name: 'iPhone 16', category: 'phone', diagonal: 6.1, width: 2556, height: 1179 },
  { id: 'iphone-se', name: 'iPhone SE (3rd)', category: 'phone', diagonal: 4.7, width: 1334, height: 750 },
  { id: 'galaxy-s24-ultra', name: 'Galaxy S24 Ultra', category: 'phone', diagonal: 6.8, width: 3120, height: 1440 },
  { id: 'galaxy-s24', name: 'Galaxy S24', category: 'phone', diagonal: 6.2, width: 2340, height: 1080 },
  { id: 'galaxy-z-fold6-inner', name: 'Galaxy Z Fold 6 (inner)', category: 'phone', diagonal: 7.6, width: 2160, height: 1856 },
  { id: 'galaxy-z-flip6', name: 'Galaxy Z Flip 6', category: 'phone', diagonal: 6.7, width: 2640, height: 1080 },
  { id: 'pixel-9-pro', name: 'Pixel 9 Pro', category: 'phone', diagonal: 6.3, width: 2856, height: 1280 },
  // Tablets
  { id: 'ipad-pro-13', name: 'iPad Pro 13"', category: 'tablet', diagonal: 13.0, width: 2752, height: 2064 },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', category: 'tablet', diagonal: 11.0, width: 2420, height: 1668 },
  { id: 'ipad-air', name: 'iPad Air (M2)', category: 'tablet', diagonal: 10.9, width: 2360, height: 1640 },
  { id: 'ipad-mini', name: 'iPad mini (6th)', category: 'tablet', diagonal: 8.3, width: 2266, height: 1488 },
  { id: 'galaxy-tab-s9-ultra', name: 'Galaxy Tab S9 Ultra', category: 'tablet', diagonal: 14.6, width: 2960, height: 1848 },
  { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', category: 'tablet', diagonal: 11.0, width: 2560, height: 1600 },
  // Monitors
  { id: 'monitor-24-fhd', name: '24" FHD Monitor', category: 'monitor', diagonal: 24.0, width: 1920, height: 1080 },
  { id: 'monitor-27-qhd', name: '27" QHD Monitor', category: 'monitor', diagonal: 27.0, width: 2560, height: 1440 },
  { id: 'monitor-27-4k', name: '27" 4K Monitor', category: 'monitor', diagonal: 27.0, width: 3840, height: 2160 },
  { id: 'monitor-32-4k', name: '32" 4K Monitor', category: 'monitor', diagonal: 32.0, width: 3840, height: 2160 },
  { id: 'monitor-34-ultrawide', name: '34" Ultrawide Monitor', category: 'monitor', diagonal: 34.0, width: 3440, height: 1440 },
  // Laptops
  { id: 'macbook-air-13', name: 'MacBook Air 13"', category: 'laptop', diagonal: 13.6, width: 2560, height: 1664 },
  { id: 'macbook-pro-14', name: 'MacBook Pro 14"', category: 'laptop', diagonal: 14.2, width: 3024, height: 1964 },
  { id: 'macbook-pro-16', name: 'MacBook Pro 16"', category: 'laptop', diagonal: 16.2, width: 3456, height: 2234 },
  { id: 'dell-xps-15', name: 'Dell XPS 15', category: 'laptop', diagonal: 15.6, width: 3456, height: 2160 },
  { id: 'surface-laptop-5', name: 'Surface Laptop 5 (15")', category: 'laptop', diagonal: 15.0, width: 2496, height: 1664 },
]

// ── Calculation helpers ──────────────────────────────────────────────────────

function calcPPI(w: number, h: number, diag: number): number {
  return Math.round(Math.sqrt(w * w + h * h) / diag)
}

function calcAspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(w, h)
  const rw = w / g
  const rh = h / g
  // Simplify very large ratios
  if (rw > 40 || rh > 40) {
    const ratio = w / h
    return `${ratio.toFixed(2)}:1`
  }
  return `${rw}:${rh}`
}

function calcAreaSqIn(diag: number, w: number, h: number): number {
  // Physical width and height in inches from diagonal + pixel ratio
  const pixelRatio = w / h
  const physH = diag / Math.sqrt(1 + pixelRatio * pixelRatio)
  const physW = physH * pixelRatio
  return physW * physH
}

// ── Category colors ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<DeviceCategory, { bg: string; border: string; text: string; label: string }> = {
  phone:   { bg: 'bg-blue-100 dark:bg-blue-900',   border: 'border-blue-400',   text: 'text-blue-700 dark:text-blue-300',   label: 'bg-blue-500' },
  tablet:  { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-400', text: 'text-purple-700 dark:text-purple-300', label: 'bg-purple-500' },
  monitor: { bg: 'bg-green-100 dark:bg-green-900',  border: 'border-green-400',  text: 'text-green-700 dark:text-green-300',  label: 'bg-green-500' },
  laptop:  { bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300', label: 'bg-orange-500' },
}

const SLOT_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-500', rect: 'bg-blue-200 dark:bg-blue-800', rectBorder: 'border-blue-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-400 dark:border-rose-500', rect: 'bg-rose-200 dark:bg-rose-800', rectBorder: 'border-rose-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-400 dark:border-emerald-500', rect: 'bg-emerald-200 dark:bg-emerald-800', rectBorder: 'border-emerald-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400 dark:border-amber-500', rect: 'bg-amber-200 dark:bg-amber-800', rectBorder: 'border-amber-500' },
]

// ── Custom device form ───────────────────────────────────────────────────────

interface CustomDevice {
  name: string
  diagonal: string
  width: string
  height: string
  category: DeviceCategory
}

// ── Main component ───────────────────────────────────────────────────────────

type FilterCat = 'all' | DeviceCategory

export default function ScreenCompare() {
  const t = useTranslations('screenCompare')

  const [selectedIds, setSelectedIds] = useState<(string | null)[]>(['iphone-16-pro', 'galaxy-s24'])
  const [filterCat, setFilterCat] = useState<FilterCat>('all')
  const [showCustomForm, setShowCustomForm] = useState<number | null>(null)
  const [customForms, setCustomForms] = useState<Record<number, CustomDevice>>({})

  // All devices including any custom ones stored per-slot
  const [customDevices, setCustomDevices] = useState<Device[]>([])

  const allDevices = useMemo(() => [...DEVICES, ...customDevices], [customDevices])

  const filteredDevices = useMemo(() => {
    if (filterCat === 'all') return allDevices
    return allDevices.filter(d => d.category === filterCat)
  }, [allDevices, filterCat])

  const selectedDevices = useMemo(
    () => selectedIds.map(id => (id ? allDevices.find(d => d.id === id) ?? null : null)),
    [selectedIds, allDevices]
  )

  // Scale for visual comparison
  const visualScale = useMemo(() => {
    const MAX_PX = 200 // max diagonal pixels in display
    const validDevices = selectedDevices.filter(Boolean) as Device[]
    if (validDevices.length === 0) return 10
    const maxDiag = Math.max(...validDevices.map(d => d.diagonal))
    return MAX_PX / maxDiag
  }, [selectedDevices])

  const addSlot = useCallback(() => {
    if (selectedIds.length < 4) {
      setSelectedIds(prev => [...prev, null])
    }
  }, [selectedIds.length])

  const removeSlot = useCallback((idx: number) => {
    setSelectedIds(prev => prev.filter((_, i) => i !== idx))
    setShowCustomForm(prev => (prev === idx ? null : prev))
  }, [])

  const setSlotDevice = useCallback((idx: number, id: string | null) => {
    setSelectedIds(prev => prev.map((v, i) => (i === idx ? id : v)))
  }, [])

  const initCustomForm = useCallback((idx: number) => {
    setCustomForms(prev => ({
      ...prev,
      [idx]: prev[idx] ?? { name: '', diagonal: '', width: '', height: '', category: 'phone' },
    }))
    setShowCustomForm(idx)
  }, [])

  const updateCustomForm = useCallback((idx: number, field: keyof CustomDevice, value: string) => {
    setCustomForms(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }))
  }, [])

  const addCustomDevice = useCallback((idx: number) => {
    const form = customForms[idx]
    if (!form) return
    const diag = parseFloat(form.diagonal)
    const w = parseInt(form.width)
    const h = parseInt(form.height)
    if (!form.name || isNaN(diag) || isNaN(w) || isNaN(h) || diag <= 0 || w <= 0 || h <= 0) return
    const id = `custom-${Date.now()}`
    const newDev: Device = { id, name: form.name, category: form.category, diagonal: diag, width: w, height: h }
    setCustomDevices(prev => [...prev, newDev])
    setSelectedIds(prev => prev.map((v, i) => (i === idx ? id : v)))
    setShowCustomForm(null)
  }, [customForms])

  const catIcon = (cat: DeviceCategory) => {
    switch (cat) {
      case 'phone': return <Smartphone size={14} className="inline mr-1" />
      case 'tablet': return <Tablet size={14} className="inline mr-1" />
      case 'monitor': return <Monitor size={14} className="inline mr-1" />
      case 'laptop': return <Laptop size={14} className="inline mr-1" />
    }
  }

  const catLabel = (cat: DeviceCategory) => t(`category.${cat}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'phone', 'tablet', 'monitor', 'laptop'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterCat === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat === 'all' ? t('category.all') : (
              <>{catIcon(cat as DeviceCategory)}{catLabel(cat as DeviceCategory)}</>
            )}
          </button>
        ))}
      </div>

      {/* Device selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedIds.map((selId, idx) => {
          const dev = selId ? allDevices.find(d => d.id === selId) : null
          const color = SLOT_COLORS[idx]
          return (
            <div key={idx} className={`rounded-xl border-2 p-4 ${color.border} ${color.bg} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t('deviceN', { n: idx + 1 })}
                </span>
                {selectedIds.length > 1 && (
                  <button
                    onClick={() => removeSlot(idx)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title={t('remove')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <select
                value={selId ?? ''}
                onChange={e => setSlotDevice(idx, e.target.value || null)}
                className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('selectDevice')}</option>
                {filteredDevices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {dev && (
                <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${CATEGORY_COLORS[dev.category].label}`} />
                    <span>{catLabel(dev.category)}</span>
                  </div>
                  <div>{dev.diagonal}" · {dev.width}×{dev.height}</div>
                  <div>PPI: {calcPPI(dev.width, dev.height, dev.diagonal)}</div>
                </div>
              )}

              <button
                onClick={() => initCustomForm(idx)}
                className="w-full text-xs px-2 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {t('customSize')}
              </button>

              {/* Custom device form */}
              {showCustomForm === idx && (
                <div className="space-y-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('customTitle')}</p>
                  <input
                    type="text"
                    placeholder={t('customName')}
                    value={customForms[idx]?.name ?? ''}
                    onChange={e => updateCustomForm(idx, 'name', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <select
                    value={customForms[idx]?.category ?? 'phone'}
                    onChange={e => updateCustomForm(idx, 'category', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="phone">{t('category.phone')}</option>
                    <option value="tablet">{t('category.tablet')}</option>
                    <option value="monitor">{t('category.monitor')}</option>
                    <option value="laptop">{t('category.laptop')}</option>
                  </select>
                  <input
                    type="number"
                    placeholder={t('customDiagonal')}
                    value={customForms[idx]?.diagonal ?? ''}
                    onChange={e => updateCustomForm(idx, 'diagonal', e.target.value)}
                    step="0.1"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder={t('customWidth')}
                      value={customForms[idx]?.width ?? ''}
                      onChange={e => updateCustomForm(idx, 'width', e.target.value)}
                      className="w-1/2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder={t('customHeight')}
                      value={customForms[idx]?.height ?? ''}
                      onChange={e => updateCustomForm(idx, 'height', e.target.value)}
                      className="w-1/2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addCustomDevice(idx)}
                      className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {t('add')}
                    </button>
                    <button
                      onClick={() => setShowCustomForm(null)}
                      className="px-2 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add device slot */}
        {selectedIds.length < 4 && (
          <button
            onClick={addSlot}
            className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[140px]"
          >
            <Plus size={24} />
            <span className="text-sm">{t('addDevice')}</span>
          </button>
        )}
      </div>

      {/* Visual comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('visualTitle')}</h2>
        <div className="flex flex-wrap items-end justify-center gap-8 min-h-[220px]">
          {selectedDevices.map((dev, idx) => {
            if (!dev) return (
              <div key={idx} className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg w-24 h-32">
                {t('empty')}
              </div>
            )
            const color = SLOT_COLORS[idx]
            // Physical pixel ratio for display
            const physRatio = dev.width / dev.height
            // Landscape: long side is width
            const dispW = dev.diagonal * visualScale * Math.sin(Math.atan(physRatio))
            const dispH = dev.diagonal * visualScale * Math.cos(Math.atan(physRatio))

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div
                  className={`relative rounded-lg border-4 ${color.rectBorder} ${color.rect} flex items-center justify-center`}
                  style={{ width: Math.round(dispW) + 'px', height: Math.round(dispH) + 'px' }}
                >
                  <div className="text-center px-1">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight truncate max-w-full">
                      {dev.diagonal}"
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      {calcAspectRatio(dev.width, dev.height)}
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[120px] leading-tight">
                  {dev.name}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">{t('scaleNote')}</p>
      </div>

      {/* Specs table */}
      {selectedDevices.some(Boolean) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('specsTitle')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium w-36">{t('spec')}</th>
                {selectedDevices.map((dev, idx) => {
                  const color = SLOT_COLORS[idx]
                  return (
                    <th key={idx} className={`py-2 px-3 text-left font-medium rounded-t ${color.bg}`}>
                      <span className="text-gray-800 dark:text-gray-100 text-xs">
                        {dev ? dev.name : `${t('deviceN', { n: idx + 1 })}`}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* Category */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{t('specCategory')}</td>
                {selectedDevices.map((dev, idx) => (
                  <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                    {dev ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${CATEGORY_COLORS[dev.category].label}`}>
                        {catIcon(dev.category)}{catLabel(dev.category)}
                      </span>
                    ) : '—'}
                  </td>
                ))}
              </tr>
              {/* Diagonal */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{t('specDiagonal')}</td>
                {selectedDevices.map((dev, idx) => (
                  <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                    {dev ? `${dev.diagonal}"` : '—'}
                  </td>
                ))}
              </tr>
              {/* Resolution */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{t('specResolution')}</td>
                {selectedDevices.map((dev, idx) => (
                  <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                    {dev ? `${dev.width}×${dev.height}` : '—'}
                  </td>
                ))}
              </tr>
              {/* PPI */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">PPI</td>
                {selectedDevices.map((dev, idx) => {
                  if (!dev) return <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">—</td>
                  const ppi = calcPPI(dev.width, dev.height, dev.diagonal)
                  const quality = ppi >= 400 ? 'text-green-600 dark:text-green-400' : ppi >= 250 ? 'text-blue-600 dark:text-blue-400' : ppi >= 100 ? 'text-gray-800 dark:text-gray-200' : 'text-orange-600 dark:text-orange-400'
                  return (
                    <td key={idx} className={`py-2 px-3 font-semibold ${quality}`}>
                      {ppi}
                    </td>
                  )
                })}
              </tr>
              {/* Aspect ratio */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{t('specAspect')}</td>
                {selectedDevices.map((dev, idx) => (
                  <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                    {dev ? calcAspectRatio(dev.width, dev.height) : '—'}
                  </td>
                ))}
              </tr>
              {/* Screen area */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{t('specArea')}</td>
                {selectedDevices.map((dev, idx) => (
                  <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                    {dev ? `${calcAreaSqIn(dev.diagonal, dev.width, dev.height).toFixed(2)} in²` : '—'}
                  </td>
                ))}
              </tr>
              {/* Total pixels */}
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{t('specTotalPixels')}</td>
                {selectedDevices.map((dev, idx) => (
                  <td key={idx} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                    {dev ? `${(dev.width * dev.height / 1_000_000).toFixed(1)} MP` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PPI guide */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('ppiGuide.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { range: '400+ PPI', label: t('ppiGuide.retina'), color: 'bg-green-500' },
            { range: '250–400 PPI', label: t('ppiGuide.sharp'), color: 'bg-blue-500' },
            { range: '100–250 PPI', label: t('ppiGuide.normal'), color: 'bg-gray-500' },
            { range: '< 100 PPI', label: t('ppiGuide.low'), color: 'bg-orange-500' },
          ].map(item => (
            <div key={item.range} className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${item.color}`} />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300 min-w-[100px]">{item.range}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
