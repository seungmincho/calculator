'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { type Polygon, createRegularPolygon } from '@/utils/algorithm/geometry'
import { testSAT, testSATStep, type SATResult } from '@/utils/algorithm/sat'
import dynamic from 'next/dynamic'
import SATCanvas2D from './SATCanvas2D'
import VisualizerControls from '../VisualizerControls'
import StepNavigator from '../StepNavigator'
import AxisProjectionPanel from '../AxisProjectionPanel'
import CodeViewer from '../CodeViewer'

const SATBabylonView = dynamic(() => import('./SATBabylonView'), { ssr: false })

const DEFAULT_POLYGON_A: Polygon = {
  vertices: createRegularPolygon(5, 60),
  position: { x: 200, y: 220 },
  rotation: 0,
}

const DEFAULT_POLYGON_B: Polygon = {
  vertices: createRegularPolygon(4, 55),
  position: { x: 400, y: 220 },
  rotation: Math.PI / 6,
}

const SAT_CODE = `// SAT 충돌 판정 핵심 로직
function testSAT(polyA: Polygon, polyB: Polygon): boolean {
  const axes = [
    ...getEdgeNormals(polyA.vertices),
    ...getEdgeNormals(polyB.vertices),
  ];

  for (const axis of axes) {
    const projA = project(polyA.vertices, axis);
    const projB = project(polyB.vertices, axis);

    // 투영이 겹치지 않으면 → 분리축 발견 → 충돌 아님
    if (projA.max < projB.min || projB.max < projA.min) {
      return false; // 분리축 존재!
    }
  }

  // 모든 축에서 겹침 → 충돌
  return true;
}

function project(vertices: Vec2[], axis: Vec2): Projection {
  let min = dot(vertices[0], axis);
  let max = min;
  for (let i = 1; i < vertices.length; i++) {
    const p = dot(vertices[i], axis);
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return { min, max };
}

function getEdgeNormals(vertices: Vec2[]): Vec2[] {
  return vertices.map((v, i) => {
    const next = vertices[(i + 1) % vertices.length];
    const edge = sub(next, v);
    return normalize(perpendicular(edge));
  });
}`

type TabKey = 'steps' | 'code'

export default function SATVisualizer() {
  const t = useTranslations('satVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [polygonA, setPolygonA] = useState<Polygon>(DEFAULT_POLYGON_A)
  const [polygonB, setPolygonB] = useState<Polygon>(DEFAULT_POLYGON_B)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [activeMode, setActiveMode] = useState<'2d' | '3d'>('2d')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Full SAT result (for total steps count)
  const fullResult = useMemo(() => testSAT(polygonA, polygonB), [polygonA, polygonB])
  const totalSteps = fullResult.axes.length

  // Step result (limited to currentStep)
  const stepResult = useMemo(
    () => testSATStep(polygonA, polygonB, currentStep),
    [polygonA, polygonB, currentStep]
  )

  // Step labels for StepNavigator
  const steps = useMemo(() =>
    fullResult.axes.map((axis, i) => ({
      label: `${axis.sourcePolygon}${i + 1}`,
      description: `${axis.sourcePolygon} edge → axis (${axis.axis.x.toFixed(2)}, ${axis.axis.y.toFixed(2)})`,
    })),
    [fullResult]
  )

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
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
  }, [isPlaying, speed, totalSteps])

  // Reset step when polygons change
  useEffect(() => {
    if (!isPlaying) setCurrentStep(0)
  }, [polygonA.position.x, polygonA.position.y, polygonB.position.x, polygonB.position.y])

  const handleReset = useCallback(() => {
    setPolygonA(DEFAULT_POLYGON_A)
    setPolygonB(DEFAULT_POLYGON_B)
    setCurrentStep(0)
    setIsPlaying(false)
  }, [])

  // Polygon shape controls
  const [sidesA, setSidesA] = useState(5)
  const [sidesB, setSidesB] = useState(4)
  const [sizeA, setSizeA] = useState(60)
  const [sizeB, setSizeB] = useState(55)

  const updatePolygonA = useCallback((sides: number, size: number) => {
    setSidesA(sides)
    setSizeA(size)
    setPolygonA(prev => ({ ...prev, vertices: createRegularPolygon(sides, size) }))
  }, [])

  const updatePolygonB = useCallback((sides: number, size: number) => {
    setSidesB(sides)
    setSizeB(size)
    setPolygonB(prev => ({ ...prev, vertices: createRegularPolygon(sides, size) }))
  }, [])

  // Code highlight lines based on step
  const codeHighlightLines = useMemo(() => {
    if (currentStep < totalSteps - 1) return [8, 9, 10, 11, 12, 13]
    if (stepResult.colliding) return [17]
    return [13]
  }, [currentStep, totalSteps, stepResult.colliding])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
  ]

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
            <span className="text-xs text-gray-400">★★☆</span>
          </div>
        </div>
        {/* 2D/3D toggle */}
        <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1">
          <button
            onClick={() => setActiveMode('2d')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              activeMode === '2d' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            2D {t('modeLabel.interactive')}
          </button>
          <button
            onClick={() => setActiveMode('3d')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              activeMode === '3d' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            3D {t('modeLabel.multiView')}
          </button>
        </div>
      </div>

      {/* ═══ 좌우 분할: 시각화(좌) + 설명(우) ═══ */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* ── 좌측: 시각화 ── */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {activeMode === '3d' ? (
              <SATBabylonView />
            ) : (
              <>
                {/* Controls */}
                <div className="flex justify-center">
                  <VisualizerControls
                    isPlaying={isPlaying}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onReset={handleReset}
                    onStepForward={() => setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))}
                    onStepBack={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                    speed={speed}
                    onSpeedChange={setSpeed}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                  />
                </div>
                {/* Canvas */}
                <div className="flex justify-center">
                  <SATCanvas2D
                    polygonA={polygonA}
                    polygonB={polygonB}
                    onPolygonAChange={setPolygonA}
                    onPolygonBChange={setPolygonB}
                    currentStep={currentStep}
                    satResult={stepResult}
                  />
                </div>
              </>
            )}
          </div>

          {/* 2D 모드: 축 투영 패널 + 파라미터 */}
          {activeMode === '2d' && (
            <>
              <AxisProjectionPanel satResult={stepResult} currentStep={currentStep} />

              {/* Step navigator */}
              {totalSteps > 0 && (
                <StepNavigator
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              )}

              {/* Parameters (접이식) */}
              <details className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/30">
                  ⚙️ {t('params.title')}
                </summary>
                <div className="px-4 pb-4 grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('params.polygonA')}</h4>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('params.sides')}
                      <input type="range" min={3} max={8} value={sidesA} onChange={e => updatePolygonA(Number(e.target.value), sizeA)} className="flex-1 accent-blue-600" />
                      <span className="w-6 text-center">{sidesA}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('params.size')}
                      <input type="range" min={30} max={100} value={sizeA} onChange={e => updatePolygonA(sidesA, Number(e.target.value))} className="flex-1 accent-blue-600" />
                      <span className="w-6 text-center">{sizeA}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('params.rotation')}
                      <input type="range" min={0} max={360} value={Math.round(polygonA.rotation * 180 / Math.PI)} onChange={e => setPolygonA(prev => ({ ...prev, rotation: Number(e.target.value) * Math.PI / 180 }))} className="flex-1 accent-blue-600" />
                      <span className="w-8 text-center">{Math.round(polygonA.rotation * 180 / Math.PI)}°</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('params.polygonB')}</h4>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('params.sides')}
                      <input type="range" min={3} max={8} value={sidesB} onChange={e => updatePolygonB(Number(e.target.value), sizeB)} className="flex-1 accent-amber-600" />
                      <span className="w-6 text-center">{sidesB}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('params.size')}
                      <input type="range" min={30} max={100} value={sizeB} onChange={e => updatePolygonB(sidesB, Number(e.target.value))} className="flex-1 accent-amber-600" />
                      <span className="w-6 text-center">{sizeB}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('params.rotation')}
                      <input type="range" min={0} max={360} value={Math.round(polygonB.rotation * 180 / Math.PI)} onChange={e => setPolygonB(prev => ({ ...prev, rotation: Number(e.target.value) * Math.PI / 180 }))} className="flex-1 accent-amber-600" />
                      <span className="w-8 text-center">{Math.round(polygonB.rotation * 180 / Math.PI)}°</span>
                    </label>
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        {/* ── 우측: 설명 패널 (sticky) ── */}
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
                    {fullResult.axes.map((axis, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          i === currentStep
                            ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                            : i <= currentStep
                              ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                              : 'border-gray-200/30 dark:border-gray-700/30 opacity-50'
                        }`}
                        onClick={() => setCurrentStep(i)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i <= currentStep
                              ? axis.isSeparating
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {t('stepsGuide.axisFrom', { polygon: axis.sourcePolygon })}
                          </span>
                          {i <= currentStep && (
                            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                              axis.isSeparating
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            }`}>
                              {axis.isSeparating ? t('stepsGuide.separated') : t('stepsGuide.overlapping')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={SAT_CODE}
                    language="typescript"
                    highlightLines={codeHighlightLines}
                    title="sat.ts"
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
