'use client'

import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { type AlgorithmInfo, categoryColors, categoryLabels, difficultyLabels } from '@/config/algorithmConfig'

interface AlgorithmCardProps {
  algorithm: AlgorithmInfo
}

export default function AlgorithmCard({ algorithm }: AlgorithmCardProps) {
  const t = useTranslations('algorithmHub')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isComingSoon = algorithm.status === 'coming-soon'

  const colorMap: Record<string, { chip: string; glow: string; border: string }> = {
    red: {
      chip: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      glow: 'group-hover:shadow-red-500/20',
      border: 'border-red-200/50 dark:border-red-800/30',
    },
    blue: {
      chip: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      glow: 'group-hover:shadow-blue-500/20',
      border: 'border-blue-200/50 dark:border-blue-800/30',
    },
    purple: {
      chip: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      glow: 'group-hover:shadow-purple-500/20',
      border: 'border-purple-200/50 dark:border-purple-800/30',
    },
    amber: {
      chip: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      glow: 'group-hover:shadow-amber-500/20',
      border: 'border-amber-200/50 dark:border-amber-800/30',
    },
    emerald: {
      chip: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      glow: 'group-hover:shadow-emerald-500/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
    },
    teal: {
      chip: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
      glow: 'group-hover:shadow-teal-500/20',
      border: 'border-teal-200/50 dark:border-teal-800/30',
    },
    cyan: {
      chip: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
      glow: 'group-hover:shadow-cyan-500/20',
      border: 'border-cyan-200/50 dark:border-cyan-800/30',
    },
    pink: {
      chip: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
      glow: 'group-hover:shadow-pink-500/20',
      border: 'border-pink-200/50 dark:border-pink-800/30',
    },
    indigo: {
      chip: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
      glow: 'group-hover:shadow-indigo-500/20',
      border: 'border-indigo-200/50 dark:border-indigo-800/30',
    },
    rose: {
      chip: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
      glow: 'group-hover:shadow-rose-500/20',
      border: 'border-rose-200/50 dark:border-rose-800/30',
    },
  }

  const color = categoryColors[algorithm.category]
  const colors = colorMap[color] || colorMap.blue

  // Mini preview animation
  useEffect(() => {
    if (algorithm.id !== 'sat' || isComingSoon) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = 280 * dpr
    canvas.height = 140 * dpr
    ctx.scale(dpr, dpr)

    let animFrame: number
    let t = 0

    const draw = () => {
      t += 0.015
      ctx.clearRect(0, 0, 280, 140)

      // Dot grid
      ctx.fillStyle = 'rgba(156, 163, 175, 0.2)'
      for (let x = 0; x < 280; x += 15) {
        for (let y = 0; y < 140; y += 15) {
          ctx.beginPath()
          ctx.arc(x, y, 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Pentagon (A)
      const ax = 100 + Math.sin(t) * 30
      const ay = 70
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
        const x = ax + Math.cos(angle) * 30
        const y = ay + Math.sin(angle) * 30
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
      ctx.fill()
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Square (B)
      const bx = 180
      const by = 70
      const bSize = 28
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4
        const x = bx + Math.cos(angle) * bSize
        const y = by + Math.sin(angle) * bSize
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)'
      ctx.fill()
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Collision indicator
      const dist = Math.abs(ax - bx)
      if (dist < 60) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'
        ctx.font = 'bold 10px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText('OVERLAP', 140, 130)
      } else {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.5)'
        ctx.font = 'bold 10px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText('GAP', 140, 130)
      }

      animFrame = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrame)
  }, [algorithm.id, isComingSoon])

  const content = (
    <div
      className={`group relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border ${colors.border} rounded-2xl overflow-hidden transition-all duration-300 ${
        isComingSoon
          ? 'opacity-60 cursor-not-allowed'
          : `hover:scale-[1.02] hover:shadow-xl ${colors.glow} cursor-pointer`
      }`}
    >
      {/* Mini preview canvas */}
      <div className="relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
        {algorithm.id === 'sat' && !isComingSoon ? (
          <canvas
            ref={canvasRef}
            style={{ width: 280, height: 140 }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl opacity-50">
            {algorithm.icon}
          </div>
        )}
        {isComingSoon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <span className="px-3 py-1 bg-gray-900/70 text-white text-xs rounded-full">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{algorithm.icon}</span>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t(`algorithms.${algorithm.labelKey}.title`)}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {t(`algorithms.${algorithm.labelKey}.description`)}
        </p>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded-full ${colors.chip}`}>
            {t(categoryLabels[algorithm.category])}
          </span>
          <span className="text-xs text-gray-400">{difficultyLabels[algorithm.difficulty]}</span>
        </div>
        {!isComingSoon && (
          <div className="pt-1">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
              {t('card.start')} →
            </span>
          </div>
        )}
      </div>
    </div>
  )

  if (isComingSoon) return content

  return (
    <Link href={algorithm.href}>
      {content}
    </Link>
  )
}
