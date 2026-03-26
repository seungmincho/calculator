'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { type AABB, testAABB, testAABBStep, type AABBResult } from '@/utils/algorithm/aabb'
import AABBCanvas2D from './AABBCanvas2D'
import VisualizerControls from '../VisualizerControls'
import StepNavigator from '../StepNavigator'
import CodeViewer from '../CodeViewer'

const DEFAULT_BOX_A: AABB = { x: 200, y: 220, width: 120, height: 80 }
const DEFAULT_BOX_B: AABB = { x: 400, y: 220, width: 100, height: 100 }

const AABB_CODE = `// AABB 충돌 판정
function testAABB(a: AABB, b: AABB): boolean {
  // X축: 두 박스의 수평 범위가 겹치는지
  if (a.maxX < b.minX || b.maxX < a.minX) {
    return false; // X축에서 분리 → 충돌 아님
  }

  // Y축: 두 박스의 수직 범위가 겹치는지
  if (a.maxY < b.minY || b.maxY < a.minY) {
    return false; // Y축에서 분리 → 충돌 아님
  }

  // 두 축 모두 겹침 → 충돌!
  return true;
}

interface AABB {
  minX: number; maxX: number;
  minY: number; maxY: number;
}`

const TOTAL_STEPS = 2

type TabKey = 'steps' | 'code'

export default function AABBVisualizer() {
  const t = useTranslations('aabbVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [boxA, setBoxA] = useState<AABB>(DEFAULT_BOX_A)
  const [boxB, setBoxB] = useState<AABB>(DEFAULT_BOX_B)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Full result
  const fullResult = useMemo(() => testAABB(boxA, boxB), [boxA, boxB])

  // Step result (limited to currentStep)
  const stepResult = useMemo(
    () => testAABBStep(boxA, boxB, currentStep),
    [boxA, boxB, currentStep]
  )

  // Step labels for StepNavigator
  const steps = useMemo(() => [
    { label: 'X', description: t('stepsGuide.checkX') },
    { label: 'Y', description: t('stepsGuide.checkY') },
  ], [t])

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= TOTAL_STEPS - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000 / speed)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed])

  // Reset step when boxes move
  useEffect(() => {
    if (!isPlaying) setCurrentStep(0)
  }, [boxA.x, boxA.y, boxB.x, boxB.y])

  const handleReset = useCallback(() => {
    setBoxA(DEFAULT_BOX_A)
    setBoxB(DEFAULT_BOX_B)
    setCurrentStep(0)
    setIsPlaying(false)
  }, [])

  // Box size controls
  const [widthA, setWidthA] = useState(DEFAULT_BOX_A.width)
  const [heightA, setHeightA] = useState(DEFAULT_BOX_A.height)
  const [widthB, setWidthB] = useState(DEFAULT_BOX_B.width)
  const [heightB, setHeightB] = useState(DEFAULT_BOX_B.height)

  const updateBoxASize = useCallback((w: number, h: number) => {
    setWidthA(w)
    setHeightA(h)
    setBoxA(prev => ({ ...prev, width: w, height: h }))
  }, [])

  const updateBoxBSize = useCallback((w: number, h: number) => {
    setWidthB(w)
    setHeightB(h)
    setBoxB(prev => ({ ...prev, width: w, height: h }))
  }, [])

  // Code highlight lines based on step
  const codeHighlightLines = useMemo(() => {
    const stepX = fullResult.steps[0]
    const stepY = fullResult.steps[1]

    if (currentStep === 0) {
      // X-axis check: lines 3-5
      return stepX.isSeparating ? [4, 5] : [3, 4, 5]
    }
    if (currentStep === 1) {
      if (stepX.isSeparating) {
        return [4, 5]  // already separated at X
      }
      if (stepY.isSeparating) {
        return [9, 10]  // Y separated
      }
      return [13]  // both overlap -> collision
    }
    return []
  }, [currentStep, fullResult])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
  ]

  // Format number for display
  const fmt = (n: number) => Math.round(n)

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              {tHub('categories.collision')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
      </div>

      {/* Left/right split layout */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: visualization */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {/* Controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1))}
                onStepBack={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={currentStep}
                totalSteps={TOTAL_STEPS}
              />
            </div>
            {/* Canvas */}
            <div className="flex justify-center">
              <AABBCanvas2D
                boxA={boxA}
                boxB={boxB}
                onBoxAChange={setBoxA}
                onBoxBChange={setBoxB}
                currentStep={currentStep}
                aabbResult={stepResult}
              />
            </div>
          </div>

          {/* Projection summary */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('projection.title')}
            </h3>
            {fullResult.steps.map((step, i) => {
              const visible = i <= currentStep
              const axisLabel = step.axis === 'x' ? t('projection.xAxis') : t('projection.yAxis')
              return (
                <div
                  key={step.axis}
                  className={`flex items-center gap-3 text-xs transition-opacity ${
                    visible ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <span className="font-medium text-gray-600 dark:text-gray-400 w-10">{axisLabel}</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    A[{fmt(step.rangeA.min)}..{fmt(step.rangeA.max)}]
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    B[{fmt(step.rangeB.min)}..{fmt(step.rangeB.max)}]
                  </span>
                  <span className="mx-1 text-gray-400">&rarr;</span>
                  {visible && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      step.isSeparating
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {step.isSeparating ? t('projection.gap') : `${t('projection.overlap')} ${fmt(step.overlap)}px`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Step navigator */}
          <StepNavigator
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          {/* Parameters (collapsible) */}
          <details className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30">
              ⚙️ {t('params.title')}
            </summary>
            <div className="px-4 pb-4 grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('params.boxA')}</h4>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {t('params.width')}
                  <input type="range" min={40} max={200} value={widthA} onChange={e => updateBoxASize(Number(e.target.value), heightA)} className="flex-1 accent-blue-600" />
                  <span className="w-8 text-center">{widthA}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {t('params.height')}
                  <input type="range" min={40} max={200} value={heightA} onChange={e => updateBoxASize(widthA, Number(e.target.value))} className="flex-1 accent-blue-600" />
                  <span className="w-8 text-center">{heightA}</span>
                </label>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('params.boxB')}</h4>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {t('params.width')}
                  <input type="range" min={40} max={200} value={widthB} onChange={e => updateBoxBSize(Number(e.target.value), heightB)} className="flex-1 accent-amber-600" />
                  <span className="w-8 text-center">{widthB}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {t('params.height')}
                  <input type="range" min={40} max={200} value={heightB} onChange={e => updateBoxBSize(widthB, Number(e.target.value))} className="flex-1 accent-amber-600" />
                  <span className="w-8 text-center">{heightB}</span>
                </label>
              </div>
            </div>
          </details>
        </div>

        {/* Right: explanation panel (sticky) */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            {/* Tabs */}
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>

                    {/* Step 1: X axis */}
                    <div
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        currentStep === 0
                          ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                          : currentStep > 0
                            ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                            : 'border-gray-200/30 dark:border-gray-700/30 opacity-50'
                      }`}
                      onClick={() => setCurrentStep(0)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          currentStep >= 0
                            ? fullResult.steps[0].isSeparating
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}>
                          1
                        </span>
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {t('stepsGuide.checkX')}
                        </span>
                        {currentStep >= 0 && (
                          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                            fullResult.steps[0].isSeparating
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {fullResult.steps[0].isSeparating ? t('stepsGuide.xSeparated') : t('stepsGuide.xOverlap')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step 2: Y axis */}
                    <div
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        currentStep === 1
                          ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                          : currentStep > 1
                            ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                            : 'border-gray-200/30 dark:border-gray-700/30 opacity-50'
                      }`}
                      onClick={() => setCurrentStep(1)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          currentStep >= 1
                            ? fullResult.steps[1].isSeparating
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}>
                          2
                        </span>
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {t('stepsGuide.checkY')}
                        </span>
                        {currentStep >= 1 && (
                          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                            fullResult.steps[1].isSeparating
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {fullResult.steps[1].isSeparating ? t('stepsGuide.ySeparated') : t('stepsGuide.yOverlap')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Final result */}
                    {currentStep >= 1 && (
                      <div className={`mt-3 p-3 rounded-lg border-2 text-center text-sm font-medium ${
                        fullResult.colliding
                          ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {t('stepsGuide.result')}: {
                          fullResult.colliding
                            ? t('stepsGuide.colliding')
                            : t('stepsGuide.separated', {
                                axis: fullResult.steps[0].isSeparating ? 'X' : 'Y'
                              })
                        }
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={AABB_CODE}
                    language="typescript"
                    highlightLines={codeHighlightLines}
                    title="aabb.ts"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
