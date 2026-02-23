'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Room {
  id: string
  name: string
  width: number
  length: number
  height: number
  doors: number
  windows: number
  customDeduction: number
}

interface MaterialSettings {
  // Paint
  paintCoverage: number
  paintCoats: number
  paintPrice: number
  // Wallpaper
  rollWidth: number
  rollLength: number
  patternRepeat: number
  // Tile
  tileWidth: number
  tileHeight: number
  gapWidth: number
  tilePrice: number
}

interface RoomResult {
  id: string
  name: string
  floorArea: number
  wallArea: number
  ceilingArea: number
  deductionArea: number
  netWallArea: number
  paintNeeded: number
  paintCost: number
  wallpaperRolls: number
  wallpaperCost: number
  tilesNeeded: number
  tileCost: number
}

const DOOR_AREA = 0.9 * 2.1   // 1.89 m²
const WINDOW_AREA = 1.5 * 1.2 // 1.8 m²
const WASTAGE = 1.1            // 10% wastage factor

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

function createDefaultRoom(index: number): Room {
  return {
    id: generateId(),
    name: `방 ${index}`,
    width: 4.5,
    length: 3.6,
    height: 2.4,
    doors: 1,
    windows: 1,
    customDeduction: 0,
  }
}

function calculateRoom(room: Room, settings: MaterialSettings): RoomResult {
  const floorArea = room.width * room.length
  const wallArea = 2 * (room.width + room.length) * room.height
  const ceilingArea = room.width * room.length

  const deductionArea =
    room.doors * DOOR_AREA +
    room.windows * WINDOW_AREA +
    room.customDeduction
  const netWallArea = Math.max(0, wallArea - deductionArea)

  // Paint: total surface = walls + ceiling, apply wastage
  const paintSurface = (netWallArea + ceilingArea) * WASTAGE
  const paintNeeded = (paintSurface * settings.paintCoats) / settings.paintCoverage
  const paintCost = settings.paintPrice > 0 ? paintNeeded * settings.paintPrice : 0

  // Wallpaper: effective roll area per roll (subtract pattern repeat from each strip)
  const effectiveRollArea =
    settings.rollWidth *
    Math.max(0.1, settings.rollLength - settings.patternRepeat)
  const wallpaperRolls =
    effectiveRollArea > 0
      ? Math.ceil((netWallArea * WASTAGE) / effectiveRollArea)
      : 0
  const rollPrice = settings.paintPrice > 0 ? 0 : 0 // wallpaper price not separately tracked in material settings

  // Tile: tile area including gap
  const tileWidthM = (settings.tileWidth + settings.gapWidth / 10) / 100
  const tileHeightM = (settings.tileHeight + settings.gapWidth / 10) / 100
  const tileAreaM2 = tileWidthM * tileHeightM
  const tilesNeeded =
    tileAreaM2 > 0
      ? Math.ceil((floorArea * WASTAGE) / tileAreaM2)
      : 0
  const tileCost = settings.tilePrice > 0 ? tilesNeeded * settings.tilePrice : 0

  // Wallpaper cost: no separate price field in settings, cost = 0 if no price
  void rollPrice

  return {
    id: room.id,
    name: room.name,
    floorArea,
    wallArea,
    ceilingArea,
    deductionArea,
    netWallArea,
    paintNeeded,
    paintCost,
    wallpaperRolls,
    wallpaperCost: 0, // separate cost field; user reads rolls and multiplies
    tilesNeeded,
    tileCost,
  }
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm'

const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtInt(n: number): string {
  return Math.ceil(n).toLocaleString('ko-KR')
}

function fmtWon(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

export default function InteriorCalc() {
  const t = useTranslations('interiorCalc')

  const [rooms, setRooms] = useState<Room[]>([createDefaultRoom(1)])
  const [settings, setSettings] = useState<MaterialSettings>({
    paintCoverage: 10,
    paintCoats: 2,
    paintPrice: 15000,
    rollWidth: 0.53,
    rollLength: 10,
    patternRepeat: 0,
    tileWidth: 30,
    tileHeight: 30,
    gapWidth: 3,
    tilePrice: 800,
  })
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(
    new Set([rooms[0]?.id])
  )

  const addRoom = useCallback(() => {
    const newRoom = createDefaultRoom(rooms.length + 1)
    setRooms((prev) => [...prev, newRoom])
    setExpandedRooms((prev) => new Set([...prev, newRoom.id]))
  }, [rooms.length])

  const removeRoom = useCallback((id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
    setExpandedRooms((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const updateRoom = useCallback((id: string, field: keyof Room, value: string | number) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: typeof value === 'string' && field !== 'name' ? parseFloat(value) || 0 : value }
          : r
      )
    )
  }, [])

  const toggleRoom = useCallback((id: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const updateSettings = useCallback((field: keyof MaterialSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }))
  }, [])

  const results = useMemo<RoomResult[]>(
    () => rooms.map((r) => calculateRoom(r, settings)),
    [rooms, settings]
  )

  const totals = useMemo(() => {
    return results.reduce(
      (acc, r) => ({
        floorArea: acc.floorArea + r.floorArea,
        netWallArea: acc.netWallArea + r.netWallArea,
        ceilingArea: acc.ceilingArea + r.ceilingArea,
        paintNeeded: acc.paintNeeded + r.paintNeeded,
        paintCost: acc.paintCost + r.paintCost,
        wallpaperRolls: acc.wallpaperRolls + r.wallpaperRolls,
        tilesNeeded: acc.tilesNeeded + r.tilesNeeded,
        tileCost: acc.tileCost + r.tileCost,
      }),
      {
        floorArea: 0,
        netWallArea: 0,
        ceilingArea: 0,
        paintNeeded: 0,
        paintCost: 0,
        wallpaperRolls: 0,
        tilesNeeded: 0,
        tileCost: 0,
      }
    )
  }, [results])

  const coatOptions = [
    { value: 1, label: t('coats1') },
    { value: 2, label: t('coats2') },
    { value: 3, label: t('coats3') },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Material Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Paint */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <span>🎨</span> {t('paintCalc')}
            </h2>
            <div>
              <label className={labelCls}>{t('paintCoverage')}</label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={settings.paintCoverage}
                onChange={(e) => updateSettings('paintCoverage', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('paintCoats')}</label>
              <select
                value={settings.paintCoats}
                onChange={(e) => updateSettings('paintCoats', e.target.value)}
                className={inputCls}
              >
                {coatOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('paintPrice')}</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={settings.paintPrice}
                onChange={(e) => updateSettings('paintPrice', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Wallpaper */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <span>📜</span> {t('wallpaperCalc')}
            </h2>
            <div>
              <label className={labelCls}>{t('rollWidth')}</label>
              <input
                type="number"
                min="0.1"
                max="2"
                step="0.01"
                value={settings.rollWidth}
                onChange={(e) => updateSettings('rollWidth', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('rollLength')}</label>
              <input
                type="number"
                min="1"
                max="50"
                step="0.5"
                value={settings.rollLength}
                onChange={(e) => updateSettings('rollLength', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('patternRepeat')}</label>
              <input
                type="number"
                min="0"
                max="0.5"
                step="0.05"
                value={settings.patternRepeat}
                onChange={(e) => updateSettings('patternRepeat', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Tile */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <span>🟦</span> {t('tileCalc')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('tileWidth')}</label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  step="5"
                  value={settings.tileWidth}
                  onChange={(e) => updateSettings('tileWidth', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('tileHeight')}</label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  step="5"
                  value={settings.tileHeight}
                  onChange={(e) => updateSettings('tileHeight', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('gapWidth')}</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={settings.gapWidth}
                onChange={(e) => updateSettings('gapWidth', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('tilePrice')}</label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.tilePrice}
                onChange={(e) => updateSettings('tilePrice', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Right: Rooms + Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room list */}
          {rooms.map((room, idx) => {
            const result = results.find((r) => r.id === room.id)
            const isExpanded = expandedRooms.has(room.id)
            return (
              <div key={room.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                {/* Room header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 select-none"
                  onClick={() => toggleRoom(room.id)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {room.name || `${t('room')} ${idx + 1}`}
                    </span>
                    {result && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {fmt(result.floorArea)} {t('sqm')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {rooms.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeRoom(room.id) }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                        aria-label={t('removeRoom')}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                    {/* Room name */}
                    <div>
                      <label className={labelCls}>{t('roomName')}</label>
                      <input
                        type="text"
                        placeholder={t('roomNamePlaceholder')}
                        value={room.name}
                        onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Dimensions */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('dimensions')}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>{t('width')}</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={room.width}
                            onChange={(e) => updateRoom(room.id, 'width', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t('length')}</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={room.length}
                            onChange={(e) => updateRoom(room.id, 'length', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t('height')}</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={room.height}
                            onChange={(e) => updateRoom(room.id, 'height', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('deductions')}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>{t('doors')}</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={room.doors}
                            onChange={(e) => updateRoom(room.id, 'doors', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t('windows')}</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="1"
                            value={room.windows}
                            onChange={(e) => updateRoom(room.id, 'windows', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t('customDeduction')}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={room.customDeduction}
                            onChange={(e) => updateRoom(room.id, 'customDeduction', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('customDeductionHelp')}</p>
                    </div>

                    {/* Room result */}
                    {result && (
                      <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">{t('results')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('totalFloorArea')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmt(result.floorArea)} {t('sqm')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('totalWallArea')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmt(result.wallArea)} {t('sqm')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('totalCeilingArea')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmt(result.ceilingArea)} {t('sqm')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('deductionArea')}</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">-{fmt(result.deductionArea)} {t('sqm')}</span>
                          </div>
                          <div className="flex justify-between sm:col-span-2">
                            <span className="text-gray-600 dark:text-gray-400">{t('netWallArea')}</span>
                            <span className="font-semibold text-orange-700 dark:text-orange-300">{fmt(result.netWallArea)} {t('sqm')}</span>
                          </div>
                        </div>

                        <hr className="border-orange-200 dark:border-orange-800" />

                        {/* Paint result */}
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">🎨 {t('paintCalc')}</p>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('paintNeeded')} <span className="text-xs text-gray-400">({t('wastage')})</span></span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmt(result.paintNeeded, 1)} {t('liters')}</span>
                          </div>
                          {settings.paintPrice > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">{t('paintCost')}</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">₩{fmtWon(result.paintCost)}</span>
                            </div>
                          )}
                        </div>

                        {/* Wallpaper result */}
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">📜 {t('wallpaperCalc')}</p>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('wallpaperRolls')} <span className="text-xs text-gray-400">({t('wastage')})</span></span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmtInt(result.wallpaperRolls)} {t('rolls')}</span>
                          </div>
                        </div>

                        {/* Tile result */}
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">🟦 {t('tileCalc')}</p>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{t('tilesNeeded')} <span className="text-xs text-gray-400">({t('wastage')})</span></span>
                            <span className="font-semibold text-gray-900 dark:text-white">{fmtInt(result.tilesNeeded)} {t('tiles')}</span>
                          </div>
                          {settings.tilePrice > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">{t('tileCost')}</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">₩{fmtWon(result.tileCost)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add room button */}
          <button
            onClick={addRoom}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl text-orange-600 dark:text-orange-400 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            {t('addRoom')}
          </button>

          {/* Summary */}
          {rooms.length > 1 && (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-700 dark:to-amber-700 rounded-xl shadow-lg p-6 text-white">
              <h2 className="font-bold text-lg mb-4">{t('summaryTitle')} ({rooms.length} {t('totalRooms')})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-80">{t('totalFloorArea')}</p>
                  <p className="text-xl font-bold mt-1">{fmt(totals.floorArea)}</p>
                  <p className="text-xs opacity-80">{t('sqm')}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-80">{t('netWallArea')}</p>
                  <p className="text-xl font-bold mt-1">{fmt(totals.netWallArea)}</p>
                  <p className="text-xs opacity-80">{t('sqm')}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-80">{t('paintNeeded')}</p>
                  <p className="text-xl font-bold mt-1">{fmt(totals.paintNeeded, 1)}</p>
                  <p className="text-xs opacity-80">{t('liters')}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-80">{t('wallpaperRolls')}</p>
                  <p className="text-xl font-bold mt-1">{fmtInt(totals.wallpaperRolls)}</p>
                  <p className="text-xs opacity-80">{t('rolls')}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-80">{t('tilesNeeded')}</p>
                  <p className="text-xl font-bold mt-1">{fmtInt(totals.tilesNeeded)}</p>
                  <p className="text-xs opacity-80">{t('tiles')}</p>
                </div>
                {settings.paintPrice > 0 && (
                  <div className="bg-white/20 rounded-lg p-3 text-center">
                    <p className="text-xs opacity-80">{t('paintCost')}</p>
                    <p className="text-xl font-bold mt-1">₩{fmtWon(totals.paintCost)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('guideBasicTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideBasicItems') as string[]).map((item: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-orange-500 font-bold mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('guideMaterialTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideMaterialItems') as string[]).map((item: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-orange-500 font-bold mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
