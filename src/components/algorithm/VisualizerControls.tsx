'use client'
import { useTranslations } from 'next-intl'
import { Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react'

interface VisualizerControlsProps {
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onStepForward: () => void
  onStepBack: () => void
  speed: number
  onSpeedChange: (speed: number) => void
  currentStep: number
  totalSteps: number
  renderMode?: '2d' | '3d' | 'both'
  activeMode?: '2d' | '3d'
  onModeChange?: (mode: '2d' | '3d') => void
}

export default function VisualizerControls({
  isPlaying, onPlay, onPause, onReset,
  onStepForward, onStepBack,
  speed, onSpeedChange,
  currentStep, totalSteps,
  renderMode = '2d', activeMode = '2d', onModeChange,
}: VisualizerControlsProps) {
  const t = useTranslations('algorithmHub')

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-full">
      {/* Step back */}
      <button
        onClick={onStepBack}
        disabled={currentStep <= 0 || isPlaying}
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
        title={t('controls.stepBack')}
      >
        <SkipBack className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-2.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
        title={isPlaying ? t('controls.pause') : t('controls.play')}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        disabled={currentStep >= totalSteps - 1 || isPlaying}
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
        title={t('controls.stepForward')}
      >
        <SkipForward className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Reset */}
      <button
        onClick={onReset}
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        title={t('controls.reset')}
      >
        <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300/50 dark:bg-gray-600/50" />

      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('controls.speed')}</span>
        {[0.5, 1, 2].map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
              speed === s
                ? 'bg-blue-500 text-white'
                : 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/20'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Step counter */}
      <div className="w-px h-6 bg-gray-300/50 dark:bg-gray-600/50" />
      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        {currentStep + 1} / {totalSteps}
      </span>

      {/* 2D/3D toggle */}
      {renderMode === 'both' && onModeChange && (
        <>
          <div className="w-px h-6 bg-gray-300/50 dark:bg-gray-600/50" />
          <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-0.5">
            <button
              onClick={() => onModeChange('2d')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeMode === '2d' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => onModeChange('3d')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeMode === '3d' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              3D
            </button>
          </div>
        </>
      )}
    </div>
  )
}
