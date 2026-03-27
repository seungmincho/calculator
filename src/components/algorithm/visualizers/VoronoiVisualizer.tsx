'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  buildVoronoiSweep,
  generateRandomSites,
  generateGridSites,
  type VoronoiStep,
  type VoronoiResult,
  type Site,
} from '@/utils/algorithm/voronoi'
import VoronoiCanvas2D from './VoronoiCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const CANVAS_W = 600
const CANVAS_H = 420
const DEFAULT_SITE_COUNT = 12

const VORONOI_CODE = `// Voronoi Diagram — Nearest Site Assignment
function computeVoronoi(sites, width, height) {
  const regions = new Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearest = 0;

      for (let s = 0; s < sites.length; s++) {
        const dx = x - sites[s].x;
        const dy = y - sites[s].y;
        const dist = dx*dx + dy*dy;   // squared distance
        if (dist < minDist) {
          minDist = dist;
          nearest = s;                 // assign region
        }
      }
      regions[y * width + x] = nearest;
    }
  }
  return regions;
}`

function getHighlightLines(action: VoronoiStep['action']): number[] {
  switch (action) {
    case 'add-site':  return [2]
    case 'sweep':     return [4, 5, 10, 11, 12, 13, 14, 15]
    case 'done':      return [20]
    default:          return []
  }
}

export default function VoronoiVisualizer() {
  const t = useTranslations('voronoiVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [sites, setSites] = useState<Site[]>(() => generateRandomSites(DEFAULT_SITE_COUNT, CANVAS_W, CANVAS_H))
  const [siteCount, setSiteCount] = useState(DEFAULT_SITE_COUNT)
  const [result, setResult] = useState<VoronoiResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = result?.steps.length ?? 0
  const currentStep = useMemo<VoronoiStep | null>(() => {
    if (!result || currentStepIndex < 0) return null
    return result.steps[currentStepIndex] ?? null
  }, [result, currentStepIndex])

  const visualSites = currentStep?.sites ?? sites
  const visualRevealedRows = currentStep?.revealedRows ?? 0

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runAlgorithm = useCallback(() => {
    const r = buildVoronoiSweep(sites, CANVAS_W, CANVAS_H, 8)
    setResult(r)
    setCurrentStepIndex(0)
  }, [sites])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 100 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setResult(null)
  }, [])

  const applyNewSites = useCallback((newSites: Site[]) => {
    handleReset()
    setSites(newSites)
  }, [handleReset])

  const handleRandom = useCallback(() => applyNewSites(generateRandomSites(siteCount, CANVAS_W, CANVAS_H)), [siteCount, applyNewSites])
  const handleGrid = useCallback(() => applyNewSites(generateGridSites(siteCount, CANVAS_W, CANVAS_H)), [siteCount, applyNewSites])

  const handleSiteCountChange = useCallback((size: number) => {
    setSiteCount(size)
    applyNewSites(generateRandomSites(size, CANVAS_W, CANVAS_H))
  }, [applyNewSites])

  const handleAddSite = useCallback((x: number, y: number) => {
    if (currentStepIndex >= 0) return
    setSites(prev => [...prev, { x, y, id: prev.length }])
  }, [currentStepIndex])

  const isRunning = currentStepIndex >= 0
  const isDone = currentStep?.action === 'done'

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
            {tHub('categories.geometry')}
          </span>
          <span className="text-xs text-gray-400">★★☆</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) runAlgorithm()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="flex justify-center">
              <VoronoiCanvas2D
                sites={visualSites}
                revealedRows={isRunning ? visualRevealedRows : CANVAS_H}
                width={CANVAS_W}
                height={CANVAS_H}
                onAddSite={!isRunning ? handleAddSite : undefined}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.sites')}: <strong className="text-indigo-600 dark:text-indigo-400">{sites.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.sweepProgress')}: <strong className="text-yellow-600 dark:text-yellow-400">
                  {isRunning ? `${Math.round((visualRevealedRows / CANVAS_H) * 100)}%` : '100%'}
                </strong>
              </span>
              {isDone && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.done')}
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={handleRandom} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40">
                🎲 {t('controls.random')}
              </button>
              <button onClick={handleGrid} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40">
                📐 {t('controls.grid')}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.siteCount')}</span>
              <input type="range" min={3} max={30} value={siteCount}
                onChange={e => handleSiteCountChange(Number(e.target.value))}
                disabled={isRunning} className="flex-1 accent-indigo-600 disabled:opacity-40" />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-center tabular-nums">{siteCount}</span>
            </div>

            {!isRunning && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('controls.clickToAdd')}</p>
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
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStep ? (
                      <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-700/30">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{currentStep.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('stepsGuide.sweepAt', { y: String(currentStep.sweepY) })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.description')}</p>
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={VORONOI_CODE} language="javascript" highlightLines={codeHighlightLines} title="voronoi.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="voronoiVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
