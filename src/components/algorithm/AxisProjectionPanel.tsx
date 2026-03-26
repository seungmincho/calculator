'use client'
import { useTranslations } from 'next-intl'
import { type SATResult } from '@/utils/algorithm/sat'

interface AxisProjectionPanelProps {
  satResult: SATResult | null
  currentStep: number
}

export default function AxisProjectionPanel({ satResult, currentStep }: AxisProjectionPanelProps) {
  const t = useTranslations('algorithmHub')

  if (!satResult || satResult.axes.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm rounded-xl p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('projection.dragToStart')}</p>
      </div>
    )
  }

  const visibleAxes = satResult.axes.slice(0, currentStep + 1)
  const activeAxis = satResult.axes[currentStep]

  // Normalize projections for display
  const normalizeRange = (min: number, max: number, globalMin: number, globalMax: number, barWidth: number) => {
    const range = globalMax - globalMin || 1
    return {
      left: ((min - globalMin) / range) * barWidth,
      width: ((max - min) / range) * barWidth,
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('projection.title')}
      </h3>

      {/* Current axis detail */}
      {activeAxis && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full ${
              activeAxis.sourcePolygon === 'A'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            }`}>
              {t('projection.fromEdge', { polygon: activeAxis.sourcePolygon })}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              ({activeAxis.axis.x.toFixed(2)}, {activeAxis.axis.y.toFixed(2)})
            </span>
          </div>

          {/* Projection bars */}
          <div className="space-y-1.5">
            {(() => {
              const globalMin = Math.min(activeAxis.projA.min, activeAxis.projB.min)
              const globalMax = Math.max(activeAxis.projA.max, activeAxis.projB.max)
              const barWidth = 200

              const projA = normalizeRange(activeAxis.projA.min, activeAxis.projA.max, globalMin, globalMax, barWidth)
              const projB = normalizeRange(activeAxis.projB.min, activeAxis.projB.max, globalMin, globalMax, barWidth)

              return (
                <div className="relative" style={{ width: barWidth, height: 40 }}>
                  {/* Track */}
                  <div className="absolute inset-x-0 top-0 bottom-0 bg-gray-200/50 dark:bg-gray-700/50 rounded" />
                  {/* Projection A */}
                  <div
                    className="absolute top-1 h-4 bg-blue-400/60 dark:bg-blue-500/40 rounded border border-blue-500/50"
                    style={{ left: projA.left, width: Math.max(projA.width, 2) }}
                  />
                  <span className="absolute top-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold" style={{ left: projA.left }}>A</span>
                  {/* Projection B */}
                  <div
                    className="absolute top-6 h-4 bg-amber-400/60 dark:bg-amber-500/40 rounded border border-amber-500/50"
                    style={{ left: projB.left, width: Math.max(projB.width, 2) }}
                  />
                  <span className="absolute top-6 text-[10px] text-amber-600 dark:text-amber-400 font-bold" style={{ left: projB.left }}>B</span>
                </div>
              )
            })()}
          </div>

          {/* Overlap indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-500 ${
            activeAxis.isSeparating
              ? 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {activeAxis.isSeparating ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                {t('projection.gap')} ({Math.abs(activeAxis.overlap).toFixed(1)})
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                {t('projection.overlap')} ({activeAxis.overlap.toFixed(1)})
              </>
            )}
          </div>
        </div>
      )}

      {/* Final verdict */}
      {currentStep >= (satResult.axes.length - 1) && (
        <div className={`mt-2 px-4 py-2 rounded-xl text-sm font-bold text-center transition-colors duration-500 ${
          satResult.colliding
            ? 'bg-red-500/20 text-red-600 dark:text-red-400 shadow-lg shadow-red-500/10'
            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10'
        }`}>
          {satResult.colliding ? '❌ ' + t('projection.colliding') : '✅ ' + t('projection.separated')}
        </div>
      )}

      {/* Axis summary */}
      <div className="flex flex-wrap gap-1 mt-2">
        {visibleAxes.map((axis, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
              i === currentStep
                ? 'ring-2 ring-blue-500 scale-110'
                : ''
            } ${
              axis.isSeparating
                ? 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-400'
            }`}
          >
            {i + 1}
          </div>
        ))}
        {satResult.axes.slice(currentStep + 1).map((_, i) => (
          <div
            key={`future-${i}`}
            className="w-6 h-6 rounded bg-gray-200/50 dark:bg-gray-700/50 flex items-center justify-center text-[10px] text-gray-400"
          >
            {currentStep + 2 + i}
          </div>
        ))}
      </div>
    </div>
  )
}
