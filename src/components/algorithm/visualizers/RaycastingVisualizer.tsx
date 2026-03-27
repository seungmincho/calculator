'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  castAllRays,
  movePlayer,
  toggleWall,
  DEFAULT_MAP,
  DEFAULT_PLAYER,
  type Player,
  type RayHit,
} from '@/utils/algorithm/raycasting'
import RaycastingCanvas2D from './RaycastingCanvas2D'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const CANVAS_W = 600
const CANVAS_H = 420
const NUM_COLUMNS = 120

const DDA_CODE = `// Raycasting — DDA Algorithm
function castRay(map, px, py, angle) {
  const dirX = cos(angle);
  const dirY = sin(angle);
  let mapX = floor(px), mapY = floor(py);

  const deltaDistX = abs(1 / dirX);
  const deltaDistY = abs(1 / dirY);

  // DDA loop
  while (true) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 'vertical';          // vertical wall hit
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 'horizontal';        // horizontal wall hit
    }
    if (map[mapY][mapX] > 0) break; // wall found!
  }

  // Calculate perpendicular distance (fix fisheye)
  const dist = side === 'vertical'
    ? (mapX - px + (1-stepX)/2) / dirX
    : (mapY - py + (1-stepY)/2) / dirY;

  return { distance: dist, side };
}`

export default function RaycastingVisualizer() {
  const t = useTranslations('raycastingVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [map, setMap] = useState<number[][]>(() => DEFAULT_MAP.map(r => [...r]))
  const [player, setPlayer] = useState<Player>({ ...DEFAULT_PLAYER })
  const [rays, setRays] = useState<RayHit[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [editMode, setEditMode] = useState(false)

  const keysPressed = useRef<Set<string>>(new Set())
  const animFrameRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cast rays whenever player or map changes
  useEffect(() => {
    setRays(castAllRays(map, player, NUM_COLUMNS))
  }, [map, player])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault()
        keysPressed.current.add(key)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Animation loop
  useEffect(() => {
    const update = () => {
      const keys = keysPressed.current
      let forward = 0, strafe = 0, rotate = 0

      if (keys.has('w') || keys.has('arrowup')) forward = 1
      if (keys.has('s') || keys.has('arrowdown')) forward = -1
      if (keys.has('a')) strafe = -1
      if (keys.has('d')) strafe = 1
      if (keys.has('arrowleft')) rotate = -1
      if (keys.has('arrowright')) rotate = 1

      if (forward !== 0 || strafe !== 0 || rotate !== 0) {
        setPlayer(prev => movePlayer(prev, map, forward, strafe, rotate))
      }

      animFrameRef.current = requestAnimationFrame(update)
    }
    animFrameRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [map])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return
    // This would need minimap coordinates — for simplicity, handle via grid below
  }, [editMode])

  const handleResetMap = useCallback(() => {
    setMap(DEFAULT_MAP.map(r => [...r]))
    setPlayer({ ...DEFAULT_PLAYER })
  }, [])

  const handleToggleCell = useCallback((r: number, c: number) => {
    // Don't toggle border walls or player position
    if (r === 0 || c === 0 || r === map.length - 1 || c === map[0].length - 1) return
    if (Math.floor(player.x) === c && Math.floor(player.y) === r) return
    setMap(prev => toggleWall(prev, c, r))
  }, [map, player])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
            {tHub('categories.rendering')}
          </span>
          <span className="text-xs text-gray-400">★★☆</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4" ref={containerRef}>
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {/* 3D View */}
            <div className="flex justify-center" tabIndex={0}>
              <RaycastingCanvas2D
                map={map}
                player={player}
                rays={rays}
                width={CANVAS_W}
                height={CANVAS_H}
              />
            </div>

            {/* Controls info */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.position')}: <strong className="text-indigo-600 dark:text-indigo-400">
                  ({player.x.toFixed(1)}, {player.y.toFixed(1)})
                </strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.angle')}: <strong className="text-yellow-600 dark:text-yellow-400">
                  {(player.angle * 180 / Math.PI).toFixed(0)}°
                </strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.rays')}: <strong className="text-purple-600 dark:text-purple-400">{NUM_COLUMNS}</strong>
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-xs rounded-lg ${editMode
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'}`}>
                {editMode ? '🔒 ' + t('controls.stopEdit') : '✏️ ' + t('controls.editMap')}
              </button>
              <button onClick={handleResetMap}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700">
                🔄 {t('controls.resetMap')}
              </button>
            </div>

            {/* Mobile controls */}
            <div className="flex justify-center gap-1">
              <div className="grid grid-cols-3 gap-1">
                <div />
                <button onPointerDown={() => keysPressed.current.add('w')} onPointerUp={() => keysPressed.current.delete('w')} onPointerLeave={() => keysPressed.current.delete('w')}
                  className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm active:bg-gray-300 dark:active:bg-gray-600">W</button>
                <div />
                <button onPointerDown={() => keysPressed.current.add('arrowleft')} onPointerUp={() => keysPressed.current.delete('arrowleft')} onPointerLeave={() => keysPressed.current.delete('arrowleft')}
                  className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm active:bg-gray-300 dark:active:bg-gray-600">←</button>
                <button onPointerDown={() => keysPressed.current.add('s')} onPointerUp={() => keysPressed.current.delete('s')} onPointerLeave={() => keysPressed.current.delete('s')}
                  className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm active:bg-gray-300 dark:active:bg-gray-600">S</button>
                <button onPointerDown={() => keysPressed.current.add('arrowright')} onPointerUp={() => keysPressed.current.delete('arrowright')} onPointerLeave={() => keysPressed.current.delete('arrowright')}
                  className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm active:bg-gray-300 dark:active:bg-gray-600">→</button>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t('controls.keyboardHint')}</p>

            {/* Map editor grid */}
            {editMode && (
              <div className="overflow-x-auto">
                <div className="inline-grid gap-0.5 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg" style={{
                  gridTemplateColumns: `repeat(${map[0].length}, 1fr)`,
                }}>
                  {map.map((row, r) => row.map((cell, c) => {
                    const isPlayer = Math.floor(player.x) === c && Math.floor(player.y) === r
                    return (
                      <button key={`${r}-${c}`} onClick={() => handleToggleCell(r, c)}
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm transition-colors ${
                          isPlayer ? 'bg-red-500'
                          : cell > 0 ? 'bg-indigo-500 dark:bg-indigo-400'
                          : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                        }`}
                      />
                    )
                  }))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('stepsGuide.description')}</p>
                    <div className="space-y-2">
                      {['step1', 'step2', 'step3', 'step4'].map((key, i) => (
                        <div key={key} className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{t(`stepsGuide.${key}`)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={DDA_CODE} language="javascript" highlightLines={[]} title="raycasting.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="raycastingVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
