'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/monitorTest'
import {
  Monitor, Eye, Contrast, Type, Palette, Zap, Activity, Sun, Flame, RotateCcw, Square, CircleDot,
  Image as ImageIcon, Move, Maximize, ChevronLeft, ChevronRight, Upload, Grid3x3, Layers, Rainbow,
  Focus, X, Play, TriangleAlert, RefreshCw, Minus, Plus,
} from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  TESTS, CHECKS, stepsOf, nextState, prevState, keyAction, swipeAction, estimateRefreshRate,
  steppedGradient, encodeResults, decodeResults, overallGrade, gamutFrom,
  type TestId, type SeqState, type NavAction, type Results, type Gamut,
} from '@/utils/monitorTest'

type T = ReturnType<typeof useTranslations>

const ICONS: Record<TestId, ReactNode> = {
  deadPixel: <Monitor size={16} />, lightBleed: <Sun size={16} />, uniformity: <Grid3x3 size={16} />,
  viewingAngle: <Eye size={16} />, levels: <Layers size={16} />, contrastRatio: <Contrast size={16} />,
  gamma: <Activity size={16} />, banding: <Rainbow size={16} />, colorRatio: <Palette size={16} />,
  readability: <Type size={16} />, sharpness: <Focus size={16} />, responseTime: <Zap size={16} />,
  burnIn: <Flame size={16} />, whiteBalance: <Square size={16} />, blackBalance: <CircleDot size={16} />,
  imageQuality: <ImageIcon size={16} />, calibration: <Move size={16} />, pixelFix: <RotateCcw size={16} />,
}

// ── 테스트 색상 ──
const DEAD_PIXEL_COLORS = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00', '#404040', '#808080', '#C0C0C0']
const LIGHT_BLEED_COLORS = ['#000000', '#0a0a0a', '#141414', '#262626', '#404040']
const UNIFORMITY_LEVELS = [13, 64, 128, 191, 255]
const BURNIN_COLORS = ['#0000FF', '#FF0000', '#00FF00', '#FFFFFF', '#00FFFF', '#FFFF00', '#FF00FF']
const GAMMA_VALUES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0]
const UFO_SPEEDS = [480, 960, 1440]
const UFO_BG = ['#808080', '#101010', '#e6e6e6']
const LABELED: Partial<Record<TestId, string>> = {
  banding: 'tests.banding.labels', sharpness: 'tests.sharpness.labels', levels: 'tests.levels.labels',
  responseTime: 'tests.responseTime.labels', gamma: 'tests.gamma.colors', imageQuality: 'tests.imageQuality.labels',
}

// ── 장치 픽셀 단위 패턴(선명도) ──
function DevicePixelCanvas({ mode }: { mode: 0 | 1 | 2 }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr)
      const ctx = c.getContext('2d')
      if (!w || !h || !ctx) return
      c.width = w; c.height = h
      const img = ctx.createImageData(w, h)
      const d = img.data
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const on = mode === 0 ? x & 1 : mode === 1 ? y & 1 : (x + y) & 1
          const i = (y * w + x) * 4
          d[i] = d[i + 1] = d[i + 2] = on ? 255 : 0
          d[i + 3] = 255
        }
      }
      ctx.putImageData(img, 0, 0)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [mode])
  return <canvas ref={ref} className="w-full h-full block" />
}

// ── 응답속도: UFO 박스 + FPS 카운터 (rAF, 리렌더 없이 DOM 직접 갱신) ──
function UfoTest({ bg }: { bg: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const ufos = useRef<(HTMLDivElement | null)[]>([])
  const fpsRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0, start = 0, last = 0, lastUi = 0
    const deltas: number[] = []
    const loop = (ts: number) => {
      if (!start) start = ts
      if (last) { deltas.push(ts - last); if (deltas.length > 120) deltas.shift() }
      last = ts
      const W = (wrap.current?.clientWidth ?? 0) + 80
      UFO_SPEEDS.forEach((sp, i) => {
        const el = ufos.current[i]
        if (el) el.style.transform = `translate3d(${Math.round((((ts - start) / 1000) * sp) % W) - 80}px,0,0)`
      })
      if (ts - lastUi > 500 && fpsRef.current && deltas.length) {
        lastUi = ts
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length
        const hz = estimateRefreshRate(deltas)
        fpsRef.current.textContent = `${Math.round(1000 / avg)} fps${hz ? ` · ≈${hz}Hz` : ''}`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  const fg = bg === '#e6e6e6' ? '#333' : '#ddd'
  return (
    <div ref={wrap} className="w-full h-full flex flex-col justify-center gap-[6%] overflow-hidden relative" style={{ backgroundColor: bg }}>
      <span ref={fpsRef} className="absolute top-3 right-4 font-mono text-sm tabular-nums" style={{ color: fg }}>– fps</span>
      {UFO_SPEEDS.map((sp, i) => (
        <div key={sp} className="relative h-12">
          <span className="absolute left-3 -top-5 font-mono text-xs" style={{ color: fg }}>{sp} px/s</span>
          <div ref={el => { ufos.current[i] = el }} className="absolute top-0 left-0 w-20 h-12 will-change-transform">
            <svg viewBox="0 0 80 48" className="w-full h-full">
              <path d="M24 22a16 14 0 0 1 32 0z" fill="#00c8ff" />
              <ellipse cx="40" cy="28" rx="36" ry="10" fill="#555" />
              <ellipse cx="40" cy="25" rx="36" ry="7" fill="#aaa" />
              {[18, 32, 48, 62].map(x => <circle key={x} cx={x} cy="28" r="3" fill="#ffd400" />)}
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 불량화소 복구: 드래그 가능한 깜빡임 박스 (경고 확인 후에만 실행) ──
function PixelFixer({ t }: { t: T }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState(200)
  const [pos, setPos] = useState({ x: 100, y: 100 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    c.width = size; c.height = size
    let raf = 0
    const draw = () => {
      for (let x = 0; x < size; x += 4) for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = `rgb(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0})`
        ctx.fillRect(x, y, 4, 4)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div className="w-full h-full bg-black relative">
      <canvas
        ref={ref}
        className="absolute cursor-move border-2 border-red-500"
        style={{ left: pos.x, top: pos.y, width: size, height: size, touchAction: 'none' }}
        onPointerDown={e => { stop(e); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y } }}
        onPointerMove={e => { if (drag.current) setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }) }}
        onPointerUp={e => { stop(e); drag.current = null }}
      />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 px-6 py-3 rounded-full" onPointerDown={stop} onPointerUp={stop}>
        <button onClick={() => setSize(s => Math.max(50, s - 50))} className="text-white p-1" aria-label="-"><Minus size={18} /></button>
        <span className="text-white text-sm tabular-nums">{size}×{size}px</span>
        <button onClick={() => setSize(s => Math.min(600, s + 50))} className="text-white p-1" aria-label="+"><Plus size={18} /></button>
      </div>
      <p className="absolute top-4 left-1/2 -translate-x-1/2 text-gray-400 text-sm text-center px-4">{t('tests.pixelFix.dragInstruction')}</p>
    </div>
  )
}

// ── 테스트 패턴 ──
function Pattern({ id, step, mouseX, image, live, t }: {
  id: TestId; step: number; mouseX: number; image: string | null; live: boolean; t: T
}) {
  switch (id) {
    case 'deadPixel':
      return <div className="w-full h-full" style={{ backgroundColor: DEAD_PIXEL_COLORS[step] }} />

    case 'lightBleed':
      return <div className="w-full h-full" style={{ backgroundColor: LIGHT_BLEED_COLORS[step] }} />

    case 'uniformity': {
      const v = UNIFORMITY_LEVELS[step]
      const line = v > 127 ? v - 24 : v + 24
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ backgroundColor: `rgb(${v},${v},${v})` }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ border: `1px solid rgb(${line},${line},${line})` }} />
          ))}
        </div>
      )
    }

    case 'viewingAngle': {
      const size = [30, 60, 90, 120, 150, 180][step]
      const r = size * 0.35
      return (
        <div className="w-full h-full" style={{
          backgroundColor: '#000',
          backgroundImage: `radial-gradient(circle, #fff ${r}px, #000 ${r}px)`,
          backgroundSize: `${size}px ${size}px`,
        }} />
      )
    }

    case 'levels': {
      const dark = step === 0
      const values = Array.from({ length: 20 }, (_, i) => (dark ? i + 1 : 235 + i))
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-4" style={{ backgroundColor: dark ? '#000' : '#fff' }}>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 w-full max-w-5xl">
            {values.map(v => (
              <div key={v} className="flex flex-col items-center gap-1">
                <div className="w-full aspect-square" style={{ backgroundColor: `rgb(${v},${v},${v})` }} />
                <span className="text-[10px] font-mono" style={{ color: dark ? '#666' : '#999' }}>{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-center max-w-xl" style={{ color: dark ? '#777' : '#888' }}>
            {t(dark ? 'tests.levels.hintBlack' : 'tests.levels.hintWhite')}
          </p>
        </div>
      )
    }

    case 'contrastRatio': {
      const s = step * (100 / 14), e = (step + 1) * (100 / 14)
      return (
        <div className="w-full h-full flex flex-col justify-center bg-black">
          <div className="text-white text-center text-sm mb-2 opacity-60">{Math.round(s)}% ~ {Math.round(e)}%</div>
          <div className="flex w-full" style={{ height: '80%' }}>
            {Array.from({ length: 26 }, (_, i) => {
              const val = Math.round((s + (e - s) * (i / 25)) * 2.55)
              return <div key={i} className="flex-1 h-full" style={{ backgroundColor: `rgb(${val},${val},${val})` }} />
            })}
          </div>
        </div>
      )
    }

    case 'gamma': {
      // 위: 1px 체크보드(멀리서 보면 50% 광량) / 아래: 감마별 단색. 밝기가 같아 보이는 값 = 현재 감마
      const m = [[1, 1, 1], [1, 0, 0], [0, 1, 0], [0, 0, 1]][step]
      const label = (t.raw('tests.gamma.colors') as string[] | undefined)?.[step]
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black p-4">
          <div className="text-white text-base sm:text-lg mb-6 opacity-90 text-center">{label} - {t('tests.gamma.instruction')}</div>
          <div className="flex w-full max-w-4xl justify-center">
            {GAMMA_VALUES.map(g => {
              const mid = Math.round(255 * Math.pow(0.5, 1 / g))
              return (
                <div key={g} className="flex flex-col items-center flex-1 max-w-16 sm:max-w-20">
                  <div className="w-full h-24 sm:h-32" style={{
                    backgroundImage: `repeating-conic-gradient(rgb(${255 * m[0]},${255 * m[1]},${255 * m[2]}) 0% 25%, #000 0% 50%)`,
                    backgroundSize: '2px 2px',
                  }} />
                  <div className="w-full h-px bg-gray-600" />
                  <div className="w-full h-24 sm:h-32" style={{ backgroundColor: `rgb(${mid * m[0]},${mid * m[1]},${mid * m[2]})` }} />
                  <span className="text-white text-xs mt-2 font-mono">{g.toFixed(1)}</span>
                </div>
              )
            })}
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-6 text-center max-w-xl">{t('tests.gamma.matchHint')}</p>
        </div>
      )
    }

    case 'banding': {
      if (step === 5) {
        return (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1" style={{ background: 'linear-gradient(to right, #000, #fff)' }} />
            <div className="flex-1" style={{ background: steppedGradient(64) }} />
          </div>
        )
      }
      const bg = [
        'linear-gradient(to right, #000, #fff)',
        'linear-gradient(to right, rgb(0,0,0), rgb(48,48,48))',
        'linear-gradient(to right, #000, #f00)',
        'linear-gradient(to right, #000, #0f0)',
        'linear-gradient(to right, #000, #00f)',
      ][step]
      return <div className="w-full h-full" style={{ background: bg }} />
    }

    case 'colorRatio': {
      const m = [[1, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0], [0, 0, 1], [0, 0, 1]][step]
      const label = ['R+', 'R-', 'G+', 'G-', 'B+', 'B-'][step]
      const reverse = step % 2 === 1
      return (
        <div className="w-full h-full flex flex-col justify-center bg-black">
          <div className="text-white text-center text-sm mb-2 opacity-60">{label} (0% ~ 100%)</div>
          <div className="flex w-full" style={{ height: '80%' }}>
            {Array.from({ length: 26 }, (_, i) => {
              const val = Math.round(((reverse ? 25 - i : i) / 25) * 255)
              return <div key={i} className="flex-1 h-full" style={{ backgroundColor: `rgb(${val * m[0]},${val * m[1]},${val * m[2]})` }} />
            })}
          </div>
        </div>
      )
    }

    case 'readability': {
      const fontSize = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28][step]
      const light = step % 2 === 0
      const sampleKo = '가나다라마바사아자차카타파하 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'
      const sample = '다람쥐 헌 쳇바퀴에 타고파. The quick brown fox jumps over the lazy dog. 1234567890'
      return (
        <div className="w-full h-full flex items-center justify-center p-8" style={{ backgroundColor: light ? '#000' : '#fff', color: light ? '#fff' : '#000' }}>
          <div style={{ fontSize: `${fontSize}px`, lineHeight: '1.8', maxWidth: '80%', textAlign: 'center' }}>
            <p className="mb-4 opacity-50" style={{ fontSize: '12px' }}>{fontSize}px - {t('tests.readability.step')} {step + 1}/12</p>
            <p className="mb-4">{sample}</p>
            <p className="mb-4">{sampleKo}</p>
            <p>{sample}</p>
          </div>
        </div>
      )
    }

    case 'sharpness': {
      if (step < 3) return <DevicePixelCanvas mode={step as 0 | 1 | 2} />
      const sample = '다람쥐 헌 쳇바퀴에 타고파. The quick brown fox jumps over the lazy dog. 0123456789 Il1| O0'
      return (
        <div className="w-full h-full bg-white text-black flex flex-col justify-center gap-2 px-6 overflow-hidden">
          {[9, 10, 11, 12, 13, 14, 16].map(s => (
            <p key={s} className="whitespace-nowrap" style={{ fontSize: s }}>{s}px · {sample}</p>
          ))}
        </div>
      )
    }

    case 'responseTime':
      return <UfoTest key={step} bg={UFO_BG[step]} />

    case 'burnIn': {
      const color = BURNIN_COLORS[step]
      return (
        <div className="w-full h-full relative overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: color, clipPath: `inset(0 ${100 - mouseX}% 0 0)` }} />
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-conic-gradient(${color} 0% 25%, ${color === '#FFFFFF' ? '#CCCCCC' : '#000000'} 0% 50%)`,
            backgroundSize: '40px 40px',
            clipPath: `inset(0 0 0 ${mouseX}%)`,
          }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-white opacity-50" style={{ left: `${mouseX}%` }} />
        </div>
      )
    }

    case 'whiteBalance': {
      const size = [160, 80, 40][Math.floor(step / 5)]
      const dot = ['#ebebeb', '#f0f0f0', '#f5f5f5', '#fafafa', '#fcfcfc'][step % 5]
      return (
        <div className="w-full h-full" style={{
          backgroundColor: '#fff',
          backgroundImage: `radial-gradient(circle, ${dot} ${size * 0.3}px, transparent ${size * 0.3}px)`,
          backgroundSize: `${size}px ${size}px`,
        }} />
      )
    }

    case 'blackBalance': {
      const size = [160, 80, 40][Math.floor(step / 5)]
      const c = ['#050505', '#080808', '#0d0d0d', '#141414', '#1a1a1a'][step % 5]
      return (
        <div className="w-full h-full" style={{
          backgroundColor: '#000',
          backgroundImage: `repeating-linear-gradient(45deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${size}px), repeating-linear-gradient(-45deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${size}px)`,
        }} />
      )
    }

    case 'imageQuality': {
      if (image && step === 0) {
        return (
          <div className="w-full h-full bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="max-w-full max-h-full object-contain" />
          </div>
        )
      }
      const gradients = [
        'linear-gradient(to right, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff00ff)',
        'linear-gradient(to right, #000000, #ffffff)',
        'linear-gradient(to bottom, #ff0000 0%, #ff0000 14.3%, #ff8000 14.3%, #ff8000 28.6%, #ffff00 28.6%, #ffff00 42.9%, #00ff00 42.9%, #00ff00 57.1%, #00ffff 57.1%, #00ffff 71.4%, #0000ff 71.4%, #0000ff 85.7%, #ff00ff 85.7%, #ff00ff 100%)',
        'linear-gradient(to right, #fce4b8, #e8b87a, #c9956b, #a0705a, #7a5040)',
        'radial-gradient(circle at 30% 40%, #87ceeb, #228b22 40%, #006400 70%, #8b4513 100%)',
        'conic-gradient(from 0deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
        'linear-gradient(to right, hsl(0,100%,50%), hsl(0,80%,50%), hsl(0,60%,50%), hsl(0,40%,50%), hsl(0,20%,50%), hsl(0,0%,50%))',
        'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460, #533483, #e94560)',
        'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 40px 40px',
        'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      ]
      const idx = Math.max(0, Math.min((image ? step - 1 : step), gradients.length - 1))
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black">
          <div className="text-white text-sm mb-2 opacity-60">{(t.raw('tests.imageQuality.labels') as string[] | undefined)?.[idx]}</div>
          <div className="w-full" style={{ height: '90%', background: gradients[idx] }} />
        </div>
      )
    }

    case 'calibration': {
      if (step === 0) {
        return (
          <div className="w-full h-full bg-black">
            <svg className="w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
              {Array.from({ length: 20 }, (_, i) => <line key={`v${i}`} x1={i * 96} y1={0} x2={i * 96} y2={1080} stroke="#333" strokeWidth="1" />)}
              {Array.from({ length: 12 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 90} x2={1920} y2={i * 90} stroke="#333" strokeWidth="1" />)}
              <line x1={960} y1={0} x2={960} y2={1080} stroke="#ff0000" strokeWidth="2" />
              <line x1={0} y1={540} x2={1920} y2={540} stroke="#ff0000" strokeWidth="2" />
              <circle cx={960} cy={540} r={100} fill="none" stroke="#ff0000" strokeWidth="2" />
              <circle cx={960} cy={540} r={200} fill="none" stroke="#666" strokeWidth="1" />
              {[[20, 20], [1800, 20], [20, 1000], [1800, 1000]].map(([x, y]) => (
                <rect key={`${x}${y}`} x={x} y={y} width={100} height={60} fill="none" stroke="#fff" strokeWidth="2" />
              ))}
              <text x={960} y={530} textAnchor="middle" fill="#fff" fontSize="14">
                {live && typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : ''}
              </text>
            </svg>
          </div>
        )
      }
      if (step === 1) {
        return (
          <div className="w-full h-full flex">
            {['#FFFFFF', '#FFFF00', '#00FFFF', '#00FF00', '#FF00FF', '#FF0000', '#0000FF', '#000000'].map(c => (
              <div key={c} className="flex-1 h-full" style={{ backgroundColor: c }} />
            ))}
          </div>
        )
      }
      return (
        <div className="w-full h-full bg-black relative flex items-center justify-center">
          <div className="absolute inset-[5%] border-2 border-dashed border-red-500" />
          <div className="absolute inset-[10%] border-2 border-dashed border-yellow-500" />
          <div className="absolute inset-[20%] border-2 border-dashed border-green-500" />
          <div className="text-center text-sm">
            <p className="text-red-500">{t('tests.calibration.safeArea', { n: 5 })}</p>
            <p className="text-yellow-500">{t('tests.calibration.safeArea', { n: 10 })}</p>
            <p className="text-green-500">{t('tests.calibration.safeArea', { n: 20 })}</p>
          </div>
        </div>
      )
    }

    case 'pixelFix':
      // 미리보기에서는 절대 깜빡이지 않음(광과민성 발작 위험) — 정지 노이즈만 표시
      return live ? <PixelFixer t={t} /> : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="w-1/4 aspect-square border-2 border-red-500" style={{
            backgroundImage: 'repeating-conic-gradient(#f00 0% 25%, #0f0 0% 50%), repeating-conic-gradient(#00f 0% 25%, #fff 0% 50%)',
            backgroundSize: '8px 8px, 12px 12px', backgroundBlendMode: 'difference',
          }} />
        </div>
      )
  }
}

// ── 결함 표시 컨트롤 ──
function MarkControl({ id, value, onChange, t, dark = false }: {
  id: TestId; value: number | undefined; onChange: (v: number | undefined) => void; t: T; dark?: boolean
}) {
  const base = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'
  const idle = dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-soft text-body hover:bg-subtle'
  const on = 'bg-primary text-white'
  if (id === 'deadPixel') {
    const n = value ?? 0
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(0)} className={`${base} ${value === 0 ? on : idle}`}>{t('mark.none')}</button>
        <button onClick={() => onChange(Math.max(0, n - 1))} className={`${base} ${idle}`} aria-label="-"><Minus size={12} /></button>
        <span className={`min-w-[3.5rem] text-center text-xs font-semibold tabular-nums ${dark ? 'text-white' : 'text-fg'}`}>
          {value == null ? '–' : t('mark.count', { n })}
        </span>
        <button onClick={() => onChange(Math.min(999, n + 1))} className={`${base} ${value != null && value > 0 ? on : idle}`} aria-label="+"><Plus size={12} /></button>
      </div>
    )
  }
  return (
    <div className="flex gap-1.5" role="radiogroup">
      {(['none', 'minor', 'severe'] as const).map((k, i) => (
        <button key={k} role="radio" aria-checked={value === i} onClick={() => onChange(value === i ? undefined : i)} className={`${base} ${value === i ? on : idle}`}>
          {t(`mark.${k}`)}
        </button>
      ))}
    </div>
  )
}

interface DisplayInfo { w: number; h: number; dpr: number; gamut: Gamut; hdr: boolean; hz: number | null | 'measuring' }

export default function MonitorTest() {
  const t = useTranslations('monitorTest')

  const [selected, setSelected] = useState<TestId>('deadPixel')
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  const [seq, setSeq] = useState<SeqState>({ order: ['deadPixel'], test: 0, step: 0 })
  const [showHud, setShowHud] = useState(true)
  const [mouseX, setMouseX] = useState(50)
  const [image, setImage] = useState<string | null>(null)
  const [fixWarning, setFixWarning] = useState(false)
  const [results, setResults] = useState<Results>({})
  const [info, setInfo] = useState<DisplayInfo | null>(null)
  const [coarse, setCoarse] = useState(false)

  const seqRef = useRef(seq)
  seqRef.current = seq
  const openRef = useRef(false)
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  const extra = image ? { imageQuality: 1 } : {}
  const testName = (id: TestId) => t(`tests.${id}.name`)
  const curId = seq.order[seq.test]
  const selectedSteps = stepsOf(selected, extra)

  // ── 결과 URL 복원/동기화 ──
  useEffect(() => {
    setResults(decodeResults(new URLSearchParams(window.location.search).get('r')))
    setCoarse(window.matchMedia('(pointer: coarse)').matches)
    loaded.current = true
  }, [])
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    const enc = encodeResults(results)
    if (enc) url.searchParams.set('r', enc); else url.searchParams.delete('r')
    window.history.replaceState(window.history.state, '', url)
  }, [results])

  const setMark = useCallback((id: TestId, v: number | undefined) => {
    setResults(r => {
      const next = { ...r }
      if (v == null) delete next[id]; else next[id] = v
      return next
    })
  }, [])

  // ── 디스플레이 정보 + rAF 주사율 측정 ──
  const measure = useCallback(() => {
    const mq = (q: string) => window.matchMedia(q).matches
    setInfo({
      w: window.screen.width, h: window.screen.height, dpr: window.devicePixelRatio || 1,
      gamut: gamutFrom(mq), hdr: mq('(dynamic-range: high)'), hz: 'measuring',
    })
    const deltas: number[] = []
    let last = 0
    const loop = (ts: number) => {
      if (last) deltas.push(ts - last)
      last = ts
      if (deltas.length < 90) requestAnimationFrame(loop)
      else setInfo(i => (i ? { ...i, hz: estimateRefreshRate(deltas) } : i))
    }
    requestAnimationFrame(loop)
  }, [])
  useEffect(() => { measure() }, [measure])

  // ── HUD 자동 숨김 (숨겨지면 커서도 숨김) ──
  const wake = useCallback(() => {
    setShowHud(true)
    if (hudTimer.current) clearTimeout(hudTimer.current)
    hudTimer.current = setTimeout(() => setShowHud(false), 2500)
  }, [])
  useEffect(() => () => { if (hudTimer.current) clearTimeout(hudTimer.current) }, [])

  // ── 전체화면 열기/닫기 (Fullscreen API 미지원 시 고정 오버레이로 대체: iPhone Safari 등) ──
  const openSeq = useCallback((order: TestId[], startStep = 0) => {
    setSeq({ order, test: 0, step: startStep })
    setMouseX(50)
    setOpen(true)
    openRef.current = true
    wake()
    // 뒤에 가려진 버튼에 포커스가 남아 있으면 스페이스/엔터가 두 번 동작함
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    const el = document.documentElement
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => { /* 오버레이로 계속 */ })
  }, [wake])

  const close = useCallback((finished = false) => {
    const s = seqRef.current
    openRef.current = false
    setOpen(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    if (s.order.length > 1) {
      if (finished) setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } else {
      setSelected(s.order[0]); setStep(s.step)
    }
  }, [])

  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && openRef.current) close() }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [close])

  const go = useCallback((a: NavAction) => {
    wake()
    if (a === 'exit') return close()
    const s = seqRef.current
    const n = a === 'next' ? nextState(s, extra) : prevState(s, extra)
    if (!n) return close(true)
    if (n.test !== s.test) setMouseX(50)
    setSeq(n)
  }, [wake, close, extra])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const a = keyAction(e.key)
      if (!a) return
      e.preventDefault()
      go(a)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, go])

  // ── 포인터: 탭/클릭 = 다음, 스와이프 = 이전/다음, 번인 테스트는 드래그로 분할선 이동 ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') wake()
    if (curId === 'burnIn' && (e.pointerType === 'mouse' || pointerStart.current)) {
      setMouseX(Math.min(100, Math.max(0, (e.clientX / window.innerWidth) * 100)))
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = pointerStart.current
    pointerStart.current = null
    if (!s || curId === 'pixelFix') return
    const a = swipeAction(e.clientX - s.x, e.clientY - s.y)
    if (!a || (curId === 'burnIn' && a !== 'next')) { wake(); return }
    if (curId === 'burnIn' && Math.abs(e.clientX - s.x) >= 10) return
    go(a)
  }

  const start = (id: TestId) => {
    if (id === 'pixelFix') { setFixWarning(true); return }
    openSeq([id], Math.min(step, stepsOf(id, extra) - 1))
  }

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const stepLabel = (id: TestId, s: number) => {
    const key = LABELED[id]
    if (!key) return ''
    const arr = t.raw(key) as string[]
    return arr?.[id === 'imageQuality' && image ? s - 1 : s] ?? (id === 'imageQuality' ? t('tests.imageQuality.upload') : '')
  }

  // ── 요약 ──
  const grade = overallGrade(results)
  const summaryParts = CHECKS.filter(c => results[c.id] != null).map(c => {
    const v = results[c.id] as number
    return c.id === 'deadPixel'
      ? t('summary.deadCount', { n: v })
      : `${t(`checkNames.${c.id}`)} ${t(`mark.${['none', 'minor', 'severe'][v]}`)}`
  })
  const summaryLine = summaryParts.join(' · ')
  const gamutLabel = (g: Gamut) => ({ srgb: 'sRGB', p3: 'Display P3', rec2020: 'Rec.2020' })[g]
  const resText = info ? `${info.w}×${info.h}` : '–'
  const physText = info ? `${Math.round(info.w * info.dpr)}×${Math.round(info.h * info.dpr)}` : '–'
  const hzText = !info || info.hz === 'measuring' ? t('info.measuring') : info.hz == null ? '–' : `≈ ${info.hz}Hz`
  const infoRows = info ? [
    { label: t('info.resolution'), value: `${resText} × ${info.dpr}` },
    { label: t('info.physical'), value: physText },
    { label: t('info.refresh'), value: hzText },
    { label: t('info.gamut'), value: gamutLabel(info.gamut) },
    { label: t('info.hdr'), value: info.hdr ? t('info.yes') : t('info.no') },
  ] : []
  const gradeText = grade == null ? t('summary.none') : t(`summary.grade${grade}`)

  const curSteps = stepsOf(curId, extra)
  const isCheck = CHECKS.some(c => c.id === curId)
  const hudOn = showHud || curId === 'pixelFix'

  return (
    <div className="space-y-8">
      {/* 전체화면 테스트 (순수 색만, UI는 사라지는 HUD) */}
      {open && (
        <div
          className="fixed inset-0 z-[99999] bg-black select-none"
          style={{ cursor: hudOn ? 'default' : 'none', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="dialog"
          aria-label={testName(curId)}
        >
          <Pattern id={curId} step={seq.step} mouseX={mouseX} image={image} live t={t} />
          <div
            className="absolute inset-x-0 bottom-0 bg-black/75 text-white px-3 sm:px-4 py-2.5 text-xs sm:text-sm transition-opacity duration-500 space-y-2"
            style={{ opacity: hudOn ? 1 : 0, pointerEvents: hudOn ? 'auto' : 'none' }}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.preventDefault()}
            onPointerUp={e => { e.stopPropagation(); wake() }}
          >
            {curId === 'lightBleed' && <p className="text-amber-300">{t('tests.lightBleed.tip')}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-semibold">
                {seq.order.length > 1 && <span className="opacity-60 mr-2 tabular-nums">{seq.test + 1}/{seq.order.length}</span>}
                {testName(curId)} <span className="opacity-60 tabular-nums">[{seq.step + 1}/{curSteps}]</span>
                {stepLabel(curId, seq.step) && <span className="opacity-60"> · {stepLabel(curId, seq.step)}</span>}
              </span>
              {isCheck && (
                <div className="flex items-center gap-2">
                  <span className="opacity-60">{t('hud.mark')}</span>
                  <MarkControl id={curId} value={results[curId]} onChange={v => setMark(curId, v)} t={t} dark />
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => go('prev')} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label={t('prev')}><ChevronLeft size={16} /></button>
                <button onClick={() => go('next')} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label={t('next')}><ChevronRight size={16} /></button>
                <button onClick={() => close()} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label={t('hud.escToExit')}><X size={16} /></button>
              </div>
            </div>
            <p className="opacity-60">{coarse ? t('hud.touchHint') : t('hud.clickToNext')}</p>
          </div>
        </div>
      )}

      {/* 광과민성 경고 */}
      {fixWarning && (
        <div className="fixed inset-0 z-[100000] bg-black/60 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="ui-card p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-600">
              <TriangleAlert size={20} />
              <h2 className="text-lg font-bold">{t('tests.pixelFix.warningTitle')}</h2>
            </div>
            <p className="text-sm text-body leading-relaxed">{t('tests.pixelFix.warningBody')}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setFixWarning(false)} className="ui-btn-soft px-4 py-2">{t('tests.pixelFix.cancel')}</button>
              <button onClick={() => { setFixWarning(false); openSeq(['pixelFix']) }} className="ui-btn px-4 py-2">{t('tests.pixelFix.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 빠른 점검 + 디스플레이 정보 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="ui-card p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('quick.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('quick.description')}</p>
          </div>
          <ol className="flex flex-wrap gap-1.5">
            {CHECKS.map((c, i) => (
              <li key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-soft text-sub">{i + 1}. {t(`checkNames.${c.id}`)}</li>
            ))}
          </ol>
          <button onClick={() => openSeq(CHECKS.map(c => c.id))} className="ui-btn px-4 py-3 mt-auto flex items-center justify-center gap-2">
            <Play size={16} /> {t('quick.start')}
          </button>
        </div>
        <div className="ui-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-fg">{t('info.title')}</h2>
            <button onClick={measure} className="text-xs text-muted hover:text-primary flex items-center gap-1">
              <RefreshCw size={12} /> {t('info.remeasure')}
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {infoRows.map(r => (
              <div key={r.label} className="contents">
                <dt className="text-muted">{r.label}</dt>
                <dd className="text-fg font-semibold tabular-nums text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-faint mt-3">{t('info.note')}</p>
        </div>
      </div>

      {/* 테스트 탭 */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {TESTS.map(test => (
            <button
              key={test.id}
              onClick={() => { setSelected(test.id); setStep(0) }}
              aria-pressed={selected === test.id}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selected === test.id ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
              }`}
            >
              {ICONS[test.id]}
              {testName(test.id)}
            </button>
          ))}
        </div>
      </div>

      {/* 설명 + 미리보기 */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{testName(selected)}</h2>
            <p className="text-sm text-sub">{t(`tests.${selected}.description`)}</p>
            <div className="text-sm text-muted space-y-1">
              <p className="font-medium text-body">{t('howToUse')}</p>
              {((t.raw(`tests.${selected}.steps`) as string[] | undefined) ?? []).map((s, i) => (
                <p key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{s}</span>
                </p>
              ))}
            </div>
            {selected === 'lightBleed' && <p className="text-sm bg-subtle rounded-2xl p-4 text-sub">{t('tests.lightBleed.tip')}</p>}
            {selected === 'imageQuality' && (
              <div>
                <label className="ui-btn-soft px-4 py-2 flex items-center gap-2 cursor-pointer text-sm">
                  <Upload size={16} />
                  {t('tests.imageQuality.upload')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {image && <p className="text-xs text-primary mt-1">{t('tests.imageQuality.uploaded')}</p>}
              </div>
            )}
            {CHECKS.some(c => c.id === selected) && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-body">{t('hud.mark')}</p>
                <MarkControl id={selected} value={results[selected]} onChange={v => setMark(selected, v)} t={t} />
              </div>
            )}
            <button onClick={() => start(selected)} className="ui-btn w-full px-4 py-3 flex items-center justify-center gap-2">
              <Maximize size={18} />
              {t('startFullscreen')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="ui-card p-6">
            <h3 className="text-sm font-medium text-muted mb-3">
              {t('preview')}{stepLabel(selected, step) && ` · ${stepLabel(selected, step)}`}
            </h3>
            <button
              className="block w-full rounded-lg overflow-hidden border border-line relative group"
              style={{ aspectRatio: '16/9' }}
              onClick={() => start(selected)}
              aria-label={t('clickToStart')}
            >
              <div className="w-full h-full pointer-events-none">
                <Pattern id={selected} step={Math.min(step, selectedSteps - 1)} mouseX={50} image={image} live={false} t={t} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                  <Maximize size={14} />
                  {t('clickToStart')}
                </div>
              </div>
            </button>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1 text-sm text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> {t('prev')}
              </button>
              <span className="text-sm text-muted tabular-nums">{Math.min(step, selectedSteps - 1) + 1} / {selectedSteps}</span>
              <button
                onClick={() => setStep(s => Math.min(selectedSteps - 1, s + 1))}
                disabled={step >= selectedSteps - 1}
                className="flex items-center gap-1 text-sm text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('next')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 체크리스트 + 결과 */}
      <div ref={summaryRef} className="grid lg:grid-cols-3 gap-8 scroll-mt-20">
        <div className="lg:col-span-2 ui-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">{t('checklist.title')}</h2>
            {grade != null && (
              <button onClick={() => setResults({})} className="text-xs text-muted hover:text-primary">{t('checklist.reset')}</button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {CHECKS.map(c => (
              <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => { setSelected(c.id); setStep(0) }} className="text-sm text-body hover:text-primary text-left">
                  {testName(c.id)}
                </button>
                <MarkControl id={c.id} value={results[c.id]} onChange={v => setMark(c.id, v)} t={t} />
              </li>
            ))}
          </ul>
        </div>
        <div className="ui-card p-6 space-y-4">
          <div>
            <p className="text-sm text-muted">{t('summary.label')}</p>
            <p className={`text-3xl font-bold tabular-nums mt-1 ${grade === 2 ? 'text-red-600' : grade === 1 ? 'text-amber-600' : 'text-fg'}`}>{gradeText}</p>
            <p className="text-sm text-sub mt-2">{summaryLine || t('checklist.empty')}</p>
          </div>
          <div className="bg-subtle rounded-2xl p-4 text-xs text-sub space-y-1">
            {infoRows.slice(0, 4).map(r => <p key={r.label}>{r.label}: <span className="text-fg tabular-nums">{r.value}</span></p>)}
          </div>
          {grade != null && (
            <ShareResult
              card={{
                tool: t('title'),
                label: t('summary.label'),
                headline: gradeText,
                sub: summaryLine,
                rows: infoRows.slice(0, 4),
              }}
              text={`${t('summary.label')}: ${summaryLine}`}
              fileName="monitor-test"
            />
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {(['used', 'preparation', 'tips'] as const).map(sec => (
            <div key={sec}>
              <h3 className="text-base font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2">
                {((t.raw(`guide.${sec}.items`) as string[] | undefined) ?? []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sub text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
