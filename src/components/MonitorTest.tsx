'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Monitor, Eye, Contrast, Type, Palette, Zap, Activity,
  Sun, Flame, RotateCcw, Square, CircleDot, Image, Move,
  Maximize, ChevronLeft, ChevronRight, BookOpen, Upload
} from 'lucide-react'

// ── 테스트 타입 정의 ──
interface TestConfig {
  id: number
  icon: React.ReactNode
  steps: number
}

// ── 불량화소 색상 ──
const DEAD_PIXEL_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00',
  '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00'
]

// ── 빛샘/멍 밝기 단계 (10단계: 검→밝→검) ──
const LIGHT_BLEED_COLORS = [
  '#000000', '#0d0d0d', '#1a1a1a', '#333333', '#666666',
  '#999999', '#cccccc', '#ffffff', '#cccccc', '#999999',
  '#666666', '#333333', '#1a1a1a', '#0d0d0d', '#000000'
]

// ── 번인 테스트 색상 ──
const BURNIN_COLORS = [
  '#0000FF', '#FF0000', '#00FF00', '#FFFFFF',
  '#00FFFF', '#FFFF00', '#FF00FF'
]

// ── 감마 테스트 색상 ──
const GAMMA_COLORS = [
  { bg: '#808080', label: 'Gray' },
  { bg: '#FF0000', label: 'Red' },
  { bg: '#00FF00', label: 'Green' },
  { bg: '#0000FF', label: 'Blue' }
]

const GAMMA_VALUES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0]

export default function MonitorTest() {
  const t = useTranslations('monitorTest')

  const [activeTest, setActiveTest] = useState(0)
  const [step, setStep] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHud, setShowHud] = useState(true)
  const [mouseX, setMouseX] = useState(50)
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelFixIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pixelFixSize, setPixelFixSize] = useState(200)
  const [pixelFixPos, setPixelFixPos] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [responseBoxes, setResponseBoxes] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0])
  const animFrameRef = useRef<number>(0)
  const lastTimesRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0])

  // ── 테스트 설정 ──
  const tests: TestConfig[] = [
    { id: 1, icon: <Monitor size={18} />, steps: 8 },
    { id: 2, icon: <Eye size={18} />, steps: 6 },
    { id: 3, icon: <Contrast size={18} />, steps: 14 },
    { id: 4, icon: <Type size={18} />, steps: 12 },
    { id: 5, icon: <Palette size={18} />, steps: 6 },
    { id: 6, icon: <Zap size={18} />, steps: 1 },
    { id: 7, icon: <Activity size={18} />, steps: 4 },
    { id: 8, icon: <Sun size={18} />, steps: 15 },
    { id: 9, icon: <Flame size={18} />, steps: 7 },
    { id: 10, icon: <Square size={18} />, steps: 15 },
    { id: 11, icon: <CircleDot size={18} />, steps: 15 },
    { id: 12, icon: <Image size={18} />, steps: 10 },
    { id: 13, icon: <Move size={18} />, steps: 3 },
    { id: 14, icon: <RotateCcw size={18} />, steps: 1 },
  ]

  const testNames = [
    t('tests.deadPixel.name'),
    t('tests.viewingAngle.name'),
    t('tests.contrastRatio.name'),
    t('tests.readability.name'),
    t('tests.colorRatio.name'),
    t('tests.responseTime.name'),
    t('tests.gamma.name'),
    t('tests.lightBleed.name'),
    t('tests.burnIn.name'),
    t('tests.whiteBalance.name'),
    t('tests.blackBalance.name'),
    t('tests.imageQuality.name'),
    t('tests.calibration.name'),
    t('tests.pixelFix.name'),
  ]

  // ── Fullscreen API ──
  const enterFullscreen = useCallback(() => {
    const el = fullscreenRef.current
    if (!el) return
    if (el.requestFullscreen) {
      el.requestFullscreen()
    }
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      if (!fs) {
        // 전체화면 종료 시 정리
        if (pixelFixIntervalRef.current) {
          clearInterval(pixelFixIntervalRef.current)
          pixelFixIntervalRef.current = null
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = 0
        }
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── HUD 자동 숨김 ──
  const resetHudTimer = useCallback(() => {
    setShowHud(true)
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current)
    hudTimerRef.current = setTimeout(() => setShowHud(false), 3000)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    resetHudTimer()
    // 번인 테스트: 마우스 X 위치 비율
    if (activeTest === 9 && isFullscreen) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setMouseX((e.clientX / rect.width) * 100)
    }
    // 불량화소 복구: 드래그
    if (activeTest === 14 && isDragging) {
      setPixelFixPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }
  }, [resetHudTimer, activeTest, isFullscreen, isDragging])

  // ── 클릭으로 단계 전환 ──
  const handleClick = useCallback(() => {
    if (!isFullscreen) return
    if (activeTest === 14) return // 불량화소 복구는 클릭 무시
    if (activeTest === 6) return // 응답속도는 클릭 무시

    const currentTest = tests.find(t => t.id === activeTest)
    if (!currentTest) return

    if (step < currentTest.steps - 1) {
      setStep(s => s + 1)
    } else {
      setStep(0)
    }
    resetHudTimer()
  }, [isFullscreen, activeTest, step, tests, resetHudTimer])

  // ── 테스트 시작 ──
  const startTest = useCallback((testId: number) => {
    setActiveTest(testId)
    setStep(0)
    setMouseX(50)
    enterFullscreen()
    resetHudTimer()
  }, [enterFullscreen, resetHudTimer])

  // ── 응답속도 테스트 애니메이션 ──
  // 모든 박스가 동일 속도(px/s)로 이동하되, fps에 따라 갱신 빈도만 다름
  // → 느린 fps는 끊겨 보이고, 빠른 fps는 부드럽게 보임
  useEffect(() => {
    if (activeTest !== 6 || !isFullscreen) return

    const fpsTargets = [1, 15, 30, 60, 120, 144, 240, 360]
    const intervals = fpsTargets.map(fps => 1000 / fps)
    const speed = 30 // %/초 (모든 박스 동일 속도)
    let startTime = 0

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime

      setResponseBoxes(prev => {
        const next = [...prev]
        for (let i = 0; i < fpsTargets.length; i++) {
          const interval = intervals[i]
          const lastFrame = Math.floor((elapsed - interval) / interval) * interval
          const currentFrame = Math.floor(elapsed / interval) * interval
          if (currentFrame > (lastTimesRef.current[i] || 0)) {
            lastTimesRef.current[i] = currentFrame
            // 현재 프레임 시점의 위치 계산 (모든 박스 동일 속도)
            next[i] = ((currentFrame / 1000) * speed) % 100
          }
        }
        return next
      })
      animFrameRef.current = requestAnimationFrame(animate)
    }

    lastTimesRef.current = new Array(fpsTargets.length).fill(0)
    setResponseBoxes(new Array(fpsTargets.length).fill(0))
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [activeTest, isFullscreen])

  // ── 불량화소 복구 Canvas ──
  useEffect(() => {
    if (activeTest !== 14 || !isFullscreen) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = pixelFixSize
    canvas.height = pixelFixSize

    const drawPixels = () => {
      const blockSize = 4
      for (let x = 0; x < canvas.width; x += blockSize) {
        for (let y = 0; y < canvas.height; y += blockSize) {
          const r = Math.random() > 0.5 ? 255 : 0
          const g = Math.random() > 0.5 ? 255 : 0
          const b = Math.random() > 0.5 ? 255 : 0
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(x, y, blockSize, blockSize)
        }
      }
    }

    pixelFixIntervalRef.current = setInterval(drawPixels, 16)

    return () => {
      if (pixelFixIntervalRef.current) {
        clearInterval(pixelFixIntervalRef.current)
        pixelFixIntervalRef.current = null
      }
    }
  }, [activeTest, isFullscreen, pixelFixSize])

  // ── 이미지 업로드 핸들러 ──
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  // ── 테스트 패턴 렌더링 ──
  const renderTestPattern = useCallback(() => {
    switch (activeTest) {
      // 1. 불량화소
      case 1:
        return (
          <div
            className="w-full h-full"
            style={{ backgroundColor: DEAD_PIXEL_COLORS[step] }}
          />
        )

      // 2. 시야각
      case 2: {
        const dotSizes = [30, 60, 90, 120, 150, 180]
        const size = dotSizes[step]
        const dotRadius = size * 0.35
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: '#000',
              backgroundImage: `radial-gradient(circle, #fff ${dotRadius}px, #000 ${dotRadius}px)`,
              backgroundSize: `${size}px ${size}px`,
            }}
          />
        )
      }

      // 3. 명암비
      case 3: {
        const startPercent = step * (100 / 14)
        const endPercent = (step + 1) * (100 / 14)
        const cells = []
        for (let i = 0; i <= 25; i++) {
          const pct = startPercent + (endPercent - startPercent) * (i / 25)
          const val = Math.round(pct * 2.55)
          cells.push(
            <div
              key={i}
              className="flex-1 h-full"
              style={{ backgroundColor: `rgb(${val},${val},${val})` }}
            />
          )
        }
        return (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-white text-center text-sm mb-2 opacity-60">
              {Math.round(startPercent)}% ~ {Math.round(endPercent)}%
            </div>
            <div className="flex w-full" style={{ height: '80%' }}>
              {cells}
            </div>
          </div>
        )
      }

      // 4. 가독성
      case 4: {
        const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28]
        const fontSize = fontSizes[step]
        const isLight = step % 2 === 0
        const bg = isLight ? '#000000' : '#FFFFFF'
        const color = isLight ? '#FFFFFF' : '#000000'
        const sampleKo = '가나다라마바사아자차카타파하 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'
        const sampleText = '다람쥐 헌 쳇바퀴에 타고파. The quick brown fox jumps over the lazy dog. 1234567890'
        return (
          <div className="w-full h-full flex items-center justify-center p-8" style={{ backgroundColor: bg, color }}>
            <div style={{ fontSize: `${fontSize}px`, lineHeight: '1.8', maxWidth: '80%', textAlign: 'center' }}>
              <p className="mb-4 opacity-50" style={{ fontSize: '12px' }}>{fontSize}px - {t('tests.readability.step')} {step + 1}/12</p>
              <p className="mb-4">{sampleText}</p>
              <p className="mb-4">{sampleKo}</p>
              <p>{sampleText}</p>
            </div>
          </div>
        )
      }

      // 5. 색상비
      case 5: {
        const channels: [string, number, number, number][] = [
          ['R+', 1, 0, 0], ['R-', 1, 0, 0],
          ['G+', 0, 1, 0], ['G-', 0, 1, 0],
          ['B+', 0, 0, 1], ['B-', 0, 0, 1],
        ]
        const [label, rM, gM, bM] = channels[step]
        const reverse = step % 2 === 1
        const cells = []
        for (let i = 0; i <= 25; i++) {
          const idx = reverse ? 25 - i : i
          const val = Math.round((idx / 25) * 255)
          cells.push(
            <div
              key={i}
              className="flex-1 h-full"
              style={{ backgroundColor: `rgb(${val * rM},${val * gM},${val * bM})` }}
            />
          )
        }
        return (
          <div className="w-full h-full flex flex-col justify-center bg-black">
            <div className="text-white text-center text-sm mb-2 opacity-60">
              {label} (0% ~ 100%)
            </div>
            <div className="flex w-full" style={{ height: '80%' }}>
              {cells}
            </div>
          </div>
        )
      }

      // 6. 응답속도
      case 6: {
        const fpsLabels = [1, 15, 30, 60, 120, 144, 240, 360]
        return (
          <div className="w-full h-full bg-black flex flex-col justify-center items-center gap-2 sm:gap-3 p-4 sm:p-8">
            {fpsLabels.map((fps, i) => (
              <div key={fps} className="w-full flex items-center gap-3">
                <span className="text-white text-xs sm:text-sm w-14 sm:w-16 text-right font-mono">{fps} fps</span>
                <div className="flex-1 relative h-8 sm:h-10 overflow-hidden rounded"
                  style={{
                    background: 'repeating-linear-gradient(90deg, #1a1a1a 0px, #1a1a1a 2px, #111 2px, #111 20px)',
                  }}
                >
                  <div
                    className="absolute top-0 h-full w-10 sm:w-12 rounded"
                    style={{
                      left: `${responseBoxes[i]}%`,
                      background: 'linear-gradient(135deg, #ff6600, #ff3300)',
                      boxShadow: '0 0 8px rgba(255,102,0,0.5)',
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="text-gray-500 text-xs mt-2">{t('tests.responseTime.instruction')}</p>
          </div>
        )
      }

      // 7. 감마
      // 상단: 흑백 체크보드(1px) → 멀리서 보면 모니터 감마에 따른 회색으로 보임
      // 하단: 감마값별 solid 회색 줄 → 체크보드와 밝기가 일치하는 값이 현재 감마
      case 7: {
        const colorConfig = GAMMA_COLORS[step]
        const isGray = step === 0
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black p-4">
            <div className="text-white text-base sm:text-lg mb-6 opacity-90 text-center">
              {colorConfig.label} - {t('tests.gamma.instruction')}
            </div>
            <div className="flex w-full max-w-4xl justify-center">
              {GAMMA_VALUES.map(gamma => {
                // 감마 보정된 중간값: 50% 밝기가 감마에 따라 어떤 값으로 보이는지
                const midVal = Math.round(255 * Math.pow(0.5, 1 / gamma))
                const r = isGray ? midVal : (step === 1 ? midVal : 0)
                const g = isGray ? midVal : (step === 2 ? midVal : 0)
                const b = isGray ? midVal : (step === 3 ? midVal : 0)
                const solidColor = `rgb(${r},${g},${b})`

                // 체크보드: 해당 색상의 순색 + 검정 교대 (1px)
                const cR = isGray ? 255 : (step === 1 ? 255 : 0)
                const cG = isGray ? 255 : (step === 2 ? 255 : 0)
                const cB = isGray ? 255 : (step === 3 ? 255 : 0)
                const checkerColor = `rgb(${cR},${cG},${cB})`

                return (
                  <div key={gamma} className="flex flex-col items-center flex-1 max-w-16 sm:max-w-20">
                    {/* 상단: 체크보드 (1px 흑백 교대) */}
                    <div
                      className="w-full h-24 sm:h-32"
                      style={{
                        backgroundImage: `repeating-conic-gradient(${checkerColor} 0% 25%, #000 0% 50%)`,
                        backgroundSize: '2px 2px',
                      }}
                    />
                    {/* 중간: 구분선 */}
                    <div className="w-full h-px bg-gray-600" />
                    {/* 하단: solid 색상 (감마값에 따른 밝기) */}
                    <div
                      className="w-full h-24 sm:h-32"
                      style={{ backgroundColor: solidColor }}
                    />
                    <span className="text-white text-xs mt-2 font-mono">{gamma.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-6 text-center max-w-xl">
              {t('tests.gamma.matchHint')}
            </p>
          </div>
        )
      }

      // 8. 빛샘/멍/한지/빗살무늬/그레인
      case 8:
        return (
          <div
            className="w-full h-full"
            style={{ backgroundColor: LIGHT_BLEED_COLORS[step] }}
          />
        )

      // 9. 잔상/번인
      case 9: {
        const color = BURNIN_COLORS[step]
        const checkerSize = 20
        return (
          <div className="w-full h-full relative overflow-hidden cursor-ew-resize">
            {/* 왼쪽: 단색 */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: color,
                clipPath: `inset(0 ${100 - mouseX}% 0 0)`,
              }}
            />
            {/* 오른쪽: 모자이크 */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  repeating-conic-gradient(
                    ${color} 0% 25%,
                    ${color === '#FFFFFF' ? '#CCCCCC' : '#000000'} 0% 50%
                  )
                `,
                backgroundSize: `${checkerSize * 2}px ${checkerSize * 2}px`,
                clipPath: `inset(0 0 0 ${mouseX}%)`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white opacity-50 z-10"
              style={{ left: `${mouseX}%` }}
            />
          </div>
        )
      }

      // 10. 화이트밸런스
      case 10: {
        const patternSizes = [160, 80, 40]
        const brightnessLevels = ['#ebebeb', '#f0f0f0', '#f5f5f5', '#fafafa', '#fcfcfc']
        const sizeIdx = Math.floor(step / 5)
        const brightIdx = step % 5
        const size = patternSizes[sizeIdx]
        const dotColor = brightnessLevels[brightIdx]
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: '#ffffff',
              backgroundImage: `radial-gradient(circle, ${dotColor} ${size * 0.3}px, transparent ${size * 0.3}px)`,
              backgroundSize: `${size}px ${size}px`,
            }}
          />
        )
      }

      // 11. 블랙밸런스
      case 11: {
        const gridSizes = [160, 80, 40]
        const darkLevels = ['#050505', '#080808', '#0d0d0d', '#141414', '#1a1a1a']
        const sizeIdx = Math.floor(step / 5)
        const darkIdx = step % 5
        const size = gridSizes[sizeIdx]
        const lineColor = darkLevels[darkIdx]
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: '#000000',
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  ${lineColor} 0px,
                  ${lineColor} 1px,
                  transparent 1px,
                  transparent ${size}px
                ),
                repeating-linear-gradient(
                  -45deg,
                  ${lineColor} 0px,
                  ${lineColor} 1px,
                  transparent 1px,
                  transparent ${size}px
                )
              `,
            }}
          />
        )
      }

      // 12. 이미지표현
      case 12: {
        if (uploadedImage && step === 0) {
          return (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <img src={uploadedImage} alt="uploaded" className="max-w-full max-h-full object-contain" />
            </div>
          )
        }
        const gradients = [
          'linear-gradient(to right, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff00ff)',
          'linear-gradient(to right, #000000, #ffffff)',
          'linear-gradient(to bottom, #ff0000 0%, #ff0000 14.3%, #ff8000 14.3%, #ff8000 28.6%, #ffff00 28.6%, #ffff00 42.9%, #00ff00 42.9%, #00ff00 57.1%, #00ffff 57.1%, #00ffff 71.4%, #0000ff 71.4%, #0000ff 85.7%, #ff00ff 85.7%, #ff00ff 100%)',
          'linear-gradient(to right, #fce4b8, #e8b87a, #c9956b, #a0705a, #7a5040)',
          'radial-gradient(circle at 30% 40%, #87ceeb, #228b22 40%, #006400 70%, #8b4513 100%)',
          `conic-gradient(from 0deg, hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%), hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%), hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%), hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%), hsl(360,100%,50%))`,
          'linear-gradient(to right, hsl(0,100%,50%), hsl(0,80%,50%), hsl(0,60%,50%), hsl(0,40%,50%), hsl(0,20%,50%), hsl(0,0%,50%))',
          'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460, #533483, #e94560)',
          'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 40px 40px',
          'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        ]
        const labels = [
          'Rainbow Spectrum', 'Grayscale', 'Color Bars (SMPTE)', 'Skin Tones',
          'Landscape Colors', 'Color Wheel', 'Saturation (Red)', 'Dark Gradient',
          'Checkerboard', 'Purple Gradient'
        ]
        const adjustedStep = uploadedImage ? step - 1 : step
        const idx = Math.min(adjustedStep, gradients.length - 1)
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <div className="text-white text-sm mb-2 opacity-60">{labels[idx]}</div>
            <div
              className="w-full"
              style={{ height: '90%', background: gradients[idx] }}
            />
          </div>
        )
      }

      // 13. 화면조정
      case 13: {
        if (step === 0) {
          // 그리드 + 크로스헤어
          return (
            <div className="w-full h-full bg-black relative">
              <svg className="w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
                {/* 격자 */}
                {Array.from({ length: 20 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 96} y1={0} x2={i * 96} y2={1080} stroke="#333" strokeWidth="1" />
                ))}
                {Array.from({ length: 12 }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * 90} x2={1920} y2={i * 90} stroke="#333" strokeWidth="1" />
                ))}
                {/* 중앙 십자선 */}
                <line x1={960} y1={0} x2={960} y2={1080} stroke="#ff0000" strokeWidth="2" />
                <line x1={0} y1={540} x2={1920} y2={540} stroke="#ff0000" strokeWidth="2" />
                {/* 중앙 원 */}
                <circle cx={960} cy={540} r={100} fill="none" stroke="#ff0000" strokeWidth="2" />
                <circle cx={960} cy={540} r={200} fill="none" stroke="#666" strokeWidth="1" />
                {/* 코너 사각형 */}
                <rect x={20} y={20} width={100} height={60} fill="none" stroke="#fff" strokeWidth="2" />
                <rect x={1800} y={20} width={100} height={60} fill="none" stroke="#fff" strokeWidth="2" />
                <rect x={20} y={1000} width={100} height={60} fill="none" stroke="#fff" strokeWidth="2" />
                <rect x={1800} y={1000} width={100} height={60} fill="none" stroke="#fff" strokeWidth="2" />
                {/* 해상도 텍스트 */}
                <text x={960} y={530} textAnchor="middle" fill="#fff" fontSize="14">
                  {typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : ''}
                </text>
              </svg>
            </div>
          )
        }
        if (step === 1) {
          // 컬러바
          const colors = ['#FFFFFF', '#FFFF00', '#00FFFF', '#00FF00', '#FF00FF', '#FF0000', '#0000FF', '#000000']
          return (
            <div className="w-full h-full flex">
              {colors.map((c, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
              ))}
            </div>
          )
        }
        // step === 2: 세이프 에어리어
        return (
          <div className="w-full h-full bg-black relative flex items-center justify-center">
            <div className="absolute inset-[5%] border-2 border-dashed border-red-500" />
            <div className="absolute inset-[10%] border-2 border-dashed border-yellow-500" />
            <div className="absolute inset-[20%] border-2 border-dashed border-green-500" />
            <div className="text-white text-center">
              <p className="text-red-500 text-sm">5% Safe Area</p>
              <p className="text-yellow-500 text-sm">10% Safe Area</p>
              <p className="text-green-500 text-sm">20% Safe Area</p>
            </div>
          </div>
        )
      }

      // 14. 불량화소 복구
      case 14:
        return (
          <div className="w-full h-full bg-black relative">
            <canvas
              ref={canvasRef}
              className="absolute cursor-move border-2 border-red-500"
              style={{
                left: pixelFixPos.x,
                top: pixelFixPos.y,
                width: pixelFixSize,
                height: pixelFixSize,
              }}
              onMouseDown={(e) => {
                setIsDragging(true)
                dragOffset.current = {
                  x: e.clientX - pixelFixPos.x,
                  y: e.clientY - pixelFixPos.y,
                }
                e.stopPropagation()
              }}
            />
            {/* 크기 조절 컨트롤 */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 px-6 py-3 rounded-full">
              <button
                onClick={(e) => { e.stopPropagation(); setPixelFixSize(s => Math.max(50, s - 50)) }}
                className="text-white hover:text-red-400 text-xl font-bold"
              >-</button>
              <span className="text-white text-sm">{pixelFixSize}×{pixelFixSize}px</span>
              <button
                onClick={(e) => { e.stopPropagation(); setPixelFixSize(s => Math.min(600, s + 50)) }}
                className="text-white hover:text-green-400 text-xl font-bold"
              >+</button>
            </div>
            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-gray-400 text-sm">
              {t('tests.pixelFix.dragInstruction')}
            </p>
          </div>
        )

      default:
        return null
    }
  }, [activeTest, step, mouseX, responseBoxes, pixelFixSize, pixelFixPos, uploadedImage, t])

  // ── 마우스 업 핸들러 ──
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // ── 테스트 설명 키 ──
  const testDescKeys = [
    'tests.deadPixel', 'tests.viewingAngle', 'tests.contrastRatio',
    'tests.readability', 'tests.colorRatio', 'tests.responseTime',
    'tests.gamma', 'tests.lightBleed', 'tests.burnIn',
    'tests.whiteBalance', 'tests.blackBalance', 'tests.imageQuality',
    'tests.calibration', 'tests.pixelFix',
  ]

  const selectedTestIdx = activeTest > 0 ? activeTest - 1 : 0

  return (
    <div className="space-y-8">
      {/* 전체화면 컨테이너 */}
      <div
        ref={fullscreenRef}
        className={isFullscreen ? 'fixed inset-0 z-[99999] bg-black' : 'hidden'}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{ cursor: isFullscreen ? (activeTest === 9 ? 'ew-resize' : 'pointer') : 'default' }}
      >
        {isFullscreen && renderTestPattern()}
        {/* HUD */}
        {isFullscreen && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-2 px-4 flex items-center justify-between text-sm transition-opacity duration-300"
            style={{ opacity: showHud ? 1 : 0, pointerEvents: showHud ? 'auto' : 'none' }}
          >
            <span>{testNames[activeTest - 1]}</span>
            <span>
              {activeTest !== 6 && activeTest !== 14 && (
                <>{t('hud.clickToNext')} [{step + 1}/{tests[activeTest - 1]?.steps}]</>
              )}
            </span>
            <span>{t('hud.escToExit')}</span>
          </div>
        )}
      </div>

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 탭 메뉴 */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {tests.map((test, idx) => (
            <button
              key={test.id}
              onClick={() => setActiveTest(test.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTest === test.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow'
              }`}
            >
              {test.icon}
              <span className="hidden sm:inline">{testNames[idx]}</span>
              <span className="sm:hidden">{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 테스트 영역 */}
      {activeTest > 0 && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 설명 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                {tests[selectedTestIdx].icon}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {testNames[selectedTestIdx]}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(`${testDescKeys[selectedTestIdx]}.description`)}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-medium text-gray-700 dark:text-gray-300">{t('howToUse')}</p>
                {(t.raw(`${testDescKeys[selectedTestIdx]}.steps`) as string[]).map((s, i) => (
                  <p key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">{i + 1}.</span>
                    <span>{s}</span>
                  </p>
                ))}
              </div>

              {/* 이미지 업로드 (이미지표현 테스트) */}
              {activeTest === 12 && (
                <div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300">
                    <Upload size={16} />
                    {t('tests.imageQuality.upload')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {uploadedImage && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('tests.imageQuality.uploaded')}</p>
                  )}
                </div>
              )}

              <button
                onClick={() => startTest(activeTest)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Maximize size={18} />
                {t('startFullscreen')}
              </button>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('preview')}</h3>
              <div
                className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer relative"
                style={{ aspectRatio: '16/9' }}
                onClick={() => startTest(activeTest)}
              >
                <div className="w-full h-full">
                  {renderTestPattern()}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                    <Maximize size={14} />
                    {t('clickToStart')}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  {t('prev')}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {step + 1} / {tests[selectedTestIdx].steps}
                </span>
                <button
                  onClick={() => setStep(s => Math.min(tests[selectedTestIdx].steps - 1, s + 1))}
                  disabled={step >= tests[selectedTestIdx].steps - 1}
                  className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('next')}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 테스트가 선택되지 않았을 때 전체 테스트 그리드 */}
      {activeTest === 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tests.map((test, idx) => (
            <button
              key={test.id}
              onClick={() => setActiveTest(test.id)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 text-left hover:shadow-xl hover:scale-[1.02] transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                  {test.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {idx + 1}. {testNames[idx]}
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {t(`${testDescKeys[idx]}.shortDesc`)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.preparation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.preparation.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
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
