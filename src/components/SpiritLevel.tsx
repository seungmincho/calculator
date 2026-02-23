'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Smartphone, BookOpen, AlertCircle, Lock, Unlock } from 'lucide-react'

interface Orientation {
  beta: number   // front-back tilt (-180 to 180)
  gamma: number  // left-right tilt (-90 to 90)
  alpha: number  // compass heading (0 to 360)
}

export default function SpiritLevel() {
  const t = useTranslations('spiritLevel')
  const [orientation, setOrientation] = useState<Orientation>({ beta: 0, gamma: 0, alpha: 0 })
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'level' | 'compass'>('level')
  const [isLocked, setIsLocked] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [permissionNeeded, setPermissionNeeded] = useState(false)
  const lockedRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (lockedRef.current) return
    setOrientation({
      beta: event.beta ?? 0,
      gamma: event.gamma ?? 0,
      alpha: event.alpha ?? 0,
    })
  }, [])

  const requestPermission = useCallback(async () => {
    setError(null)
    try {
      // iOS 13+ requires explicit permission
      const DeviceOrientationEvt = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>
      }
      if (typeof DeviceOrientationEvt.requestPermission === 'function') {
        const permission = await DeviceOrientationEvt.requestPermission()
        if (permission !== 'granted') {
          setError(t('permissionDenied'))
          return
        }
      }

      window.addEventListener('deviceorientation', handleOrientation, true)
      setIsActive(true)

      // Check if we actually get data after a short delay
      setTimeout(() => {
        // If beta/gamma are still 0 after 2 seconds, sensor might not be available
        setOrientation(prev => {
          if (prev.beta === 0 && prev.gamma === 0 && prev.alpha === 0) {
            setError(t('noSensor'))
          }
          return prev
        })
      }, 2000)
    } catch {
      setError(t('sensorError'))
    }
  }, [handleOrientation, t])

  const stopListening = useCallback(() => {
    window.removeEventListener('deviceorientation', handleOrientation, true)
    setIsActive(false)
    setOrientation({ beta: 0, gamma: 0, alpha: 0 })
  }, [handleOrientation])

  const toggleLock = useCallback(() => {
    setIsLocked(prev => {
      lockedRef.current = !prev
      return !prev
    })
  }, [])

  // Check if DeviceOrientation is available
  useEffect(() => {
    const DeviceOrientationEvt = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DeviceOrientationEvt.requestPermission === 'function') {
      setPermissionNeeded(true)
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [handleOrientation])

  // Draw canvas for level/compass
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = Math.min(320, window.innerWidth - 64)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 10

    ctx.clearRect(0, 0, size, size)

    if (mode === 'level') {
      // ── Spirit Level Mode ──
      // Background circle
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#1e293b'
      ctx.fill()

      // Grid lines
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 0.5
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (radius / 3) * i, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Cross lines
      ctx.beginPath()
      ctx.moveTo(cx - radius, cy)
      ctx.lineTo(cx + radius, cy)
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx, cy + radius)
      ctx.stroke()

      // Center marker
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#94a3b8'
      ctx.fill()

      // Bubble position (clamp gamma to ±45, beta to ±45)
      const clampedGamma = Math.max(-45, Math.min(45, orientation.gamma))
      const clampedBeta = Math.max(-45, Math.min(45, orientation.beta))
      const bubbleX = cx + (clampedGamma / 45) * (radius - 20)
      const bubbleY = cy + (clampedBeta / 45) * (radius - 20)

      const tiltAngle = Math.sqrt(clampedGamma ** 2 + clampedBeta ** 2)
      const isLevel = tiltAngle < 2

      // Bubble
      const bubbleGrad = ctx.createRadialGradient(bubbleX - 3, bubbleY - 3, 2, bubbleX, bubbleY, 16)
      bubbleGrad.addColorStop(0, isLevel ? '#86efac' : '#fca5a5')
      bubbleGrad.addColorStop(1, isLevel ? '#22c55e' : '#ef4444')
      ctx.beginPath()
      ctx.arc(bubbleX, bubbleY, 16, 0, Math.PI * 2)
      ctx.fillStyle = bubbleGrad
      ctx.fill()

      // Degree labels
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('0°', cx, cy - radius + 18)
      ctx.fillText('15°', cx, cy - (radius / 3) * 2 + 12)
      ctx.fillText('30°', cx, cy - (radius / 3) + 12)
      ctx.fillText('45°', cx, cy + 12)

    } else {
      // ── Compass Mode ──
      const heading = orientation.alpha

      // Background
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#1e293b'
      ctx.fill()

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2
      ctx.stroke()

      // Save and rotate for compass needle
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((-heading * Math.PI) / 180)

      // Cardinal direction marks
      const directions = [
        { angle: 0, label: 'N', color: '#ef4444' },
        { angle: 90, label: 'E', color: '#94a3b8' },
        { angle: 180, label: 'S', color: '#94a3b8' },
        { angle: 270, label: 'W', color: '#94a3b8' },
      ]

      // Tick marks
      for (let i = 0; i < 360; i += 10) {
        const rad = (i * Math.PI) / 180
        const isMajor = i % 90 === 0
        const isMinor30 = i % 30 === 0
        const innerR = isMajor ? radius - 25 : isMinor30 ? radius - 18 : radius - 12
        ctx.beginPath()
        ctx.moveTo(Math.sin(rad) * innerR, -Math.cos(rad) * innerR)
        ctx.lineTo(Math.sin(rad) * (radius - 5), -Math.cos(rad) * (radius - 5))
        ctx.strokeStyle = isMajor ? '#e2e8f0' : '#475569'
        ctx.lineWidth = isMajor ? 2 : 1
        ctx.stroke()
      }

      // Direction labels
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const dir of directions) {
        const rad = (dir.angle * Math.PI) / 180
        const labelR = radius - 38
        ctx.fillStyle = dir.color
        ctx.fillText(dir.label, Math.sin(rad) * labelR, -Math.cos(rad) * labelR)
      }

      // Degree numbers
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#64748b'
      for (let i = 30; i < 360; i += 30) {
        if (i % 90 === 0) continue
        const rad = (i * Math.PI) / 180
        const labelR = radius - 38
        ctx.fillText(`${i}°`, Math.sin(rad) * labelR, -Math.cos(rad) * labelR)
      }

      // Compass needle (north = red, south = white)
      // North needle
      ctx.beginPath()
      ctx.moveTo(0, -(radius - 55))
      ctx.lineTo(-8, 0)
      ctx.lineTo(8, 0)
      ctx.closePath()
      ctx.fillStyle = '#ef4444'
      ctx.fill()

      // South needle
      ctx.beginPath()
      ctx.moveTo(0, radius - 55)
      ctx.lineTo(-8, 0)
      ctx.lineTo(8, 0)
      ctx.closePath()
      ctx.fillStyle = '#e2e8f0'
      ctx.fill()

      // Center dot
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()

      ctx.restore()

      // Fixed triangle at top (direction indicator)
      ctx.beginPath()
      ctx.moveTo(cx, 6)
      ctx.lineTo(cx - 8, 20)
      ctx.lineTo(cx + 8, 20)
      ctx.closePath()
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
    }
  }, [orientation, mode])

  const tiltAngle = Math.sqrt(orientation.gamma ** 2 + orientation.beta ** 2)
  const isLevel = tiltAngle < 2

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full">
            <Smartphone className="w-3 h-3" />
            {t('mobileFriendly')}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('level')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            mode === 'level'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('levelMode')}
        </button>
        <button
          onClick={() => setMode('compass')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            mode === 'compass'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('compassMode')}
        </button>
      </div>

      {/* Main display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col items-center">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            className="rounded-full mb-4"
            style={{ touchAction: 'none' }}
          />

          {/* Readings */}
          {isActive && (
            <div className="w-full space-y-3">
              {mode === 'level' ? (
                <>
                  <div className="text-center">
                    <p className={`text-4xl font-bold tabular-nums ${isLevel ? 'text-green-500' : 'text-red-500'}`}>
                      {tiltAngle.toFixed(1)}°
                    </p>
                    <p className={`text-sm font-medium mt-1 ${isLevel ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {isLevel ? t('levelOk') : t('notLevel')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('leftRight')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{orientation.gamma.toFixed(1)}°</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('frontBack')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{orientation.beta.toFixed(1)}°</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {Math.round(orientation.alpha)}°
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {getCompassDirection(orientation.alpha, t)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Control buttons */}
          <div className="flex gap-3 mt-6">
            {!isActive ? (
              <button
                onClick={requestPermission}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-lg transition-colors shadow-lg"
              >
                <Smartphone className="w-5 h-5" />
                {t('start')}
              </button>
            ) : (
              <>
                <button
                  onClick={stopListening}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg"
                >
                  {t('stop')}
                </button>
                <button
                  onClick={toggleLock}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                    isLocked
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                  aria-label={isLocked ? t('unlock') : t('lock')}
                >
                  {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              {permissionNeeded && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('iosHint')}</p>
              )}
            </div>
          )}

          {!isActive && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
              {t('startHint')}
            </p>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.level.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.level.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.compass.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.compass.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">{t('disclaimer')}</p>
      </div>
    </div>
  )
}

function getCompassDirection(alpha: number, t: (key: string) => string): string {
  const dirs = [
    { min: 337.5, max: 360, key: 'north' },
    { min: 0, max: 22.5, key: 'north' },
    { min: 22.5, max: 67.5, key: 'northeast' },
    { min: 67.5, max: 112.5, key: 'east' },
    { min: 112.5, max: 157.5, key: 'southeast' },
    { min: 157.5, max: 202.5, key: 'south' },
    { min: 202.5, max: 247.5, key: 'southwest' },
    { min: 247.5, max: 292.5, key: 'west' },
    { min: 292.5, max: 337.5, key: 'northwest' },
  ]
  for (const d of dirs) {
    if (alpha >= d.min && alpha < d.max) return t(`directions.${d.key}`)
  }
  return t('directions.north')
}
