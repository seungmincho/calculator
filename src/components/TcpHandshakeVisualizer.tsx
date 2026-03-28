'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, SkipForward, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type ConnectionState =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN_SENT'
  | 'SYN_RECEIVED'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'CLOSE_WAIT'
  | 'LAST_ACK'
  | 'TIME_WAIT'

type PacketType = 'SYN' | 'SYN-ACK' | 'ACK' | 'DATA' | 'FIN' | 'FIN-ACK'

type Direction = 'right' | 'left'

interface PacketInfo {
  type: PacketType
  direction: Direction
  seq: number
  ack: number
  dataSize?: number
  label: string
}

interface Step {
  packet: PacketInfo | null
  clientState: ConnectionState
  serverState: ConnectionState
  description: string
}

type Scenario = 'handshake' | 'data' | 'termination' | 'full'

// ── Color Mapping ──────────────────────────────────────────────────────────────

const PACKET_COLORS: Record<PacketType, { light: string; dark: string }> = {
  SYN:       { light: '#2563eb', dark: '#60a5fa' },
  'SYN-ACK': { light: '#0891b2', dark: '#22d3ee' },
  ACK:       { light: '#16a34a', dark: '#4ade80' },
  DATA:      { light: '#7c3aed', dark: '#a78bfa' },
  FIN:       { light: '#dc2626', dark: '#f87171' },
  'FIN-ACK': { light: '#ea580c', dark: '#fb923c' },
}

// ── Scenario Definitions ───────────────────────────────────────────────────────

const CLIENT_ISN = 1000
const SERVER_ISN = 5000

function buildHandshakeSteps(): Step[] {
  return [
    {
      packet: null,
      clientState: 'CLOSED',
      serverState: 'LISTEN',
      description: '서버는 LISTEN 상태에서 클라이언트의 연결 요청을 대기합니다.',
    },
    {
      packet: { type: 'SYN', direction: 'right', seq: CLIENT_ISN, ack: 0, label: `SYN  seq=${CLIENT_ISN}` },
      clientState: 'SYN_SENT',
      serverState: 'LISTEN',
      description: '1단계: 클라이언트가 SYN 패킷을 전송합니다. 초기 시퀀스 번호(ISN)를 포함합니다.',
    },
    {
      packet: { type: 'SYN-ACK', direction: 'left', seq: SERVER_ISN, ack: CLIENT_ISN + 1, label: `SYN-ACK  seq=${SERVER_ISN}  ack=${CLIENT_ISN + 1}` },
      clientState: 'SYN_SENT',
      serverState: 'SYN_RECEIVED',
      description: '2단계: 서버가 SYN-ACK로 응답합니다. 서버의 ISN과 클라이언트 seq+1을 ACK로 보냅니다.',
    },
    {
      packet: { type: 'ACK', direction: 'right', seq: CLIENT_ISN + 1, ack: SERVER_ISN + 1, label: `ACK  seq=${CLIENT_ISN + 1}  ack=${SERVER_ISN + 1}` },
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '3단계: 클라이언트가 ACK를 전송하며 연결이 수립됩니다. 이제 양방향 데이터 전송이 가능합니다.',
    },
  ]
}

function buildDataSteps(): Step[] {
  const cSeq = CLIENT_ISN + 1
  const sSeq = SERVER_ISN + 1
  return [
    {
      packet: null,
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '연결이 수립된 상태입니다. 데이터 전송을 시작합니다.',
    },
    {
      packet: { type: 'DATA', direction: 'right', seq: cSeq, ack: sSeq, dataSize: 100, label: `DATA  seq=${cSeq}  ack=${sSeq}  len=100` },
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '클라이언트가 100바이트 데이터를 전송합니다. seq는 데이터 시작 바이트 위치입니다.',
    },
    {
      packet: { type: 'ACK', direction: 'left', seq: sSeq, ack: cSeq + 100, label: `ACK  seq=${sSeq}  ack=${cSeq + 100}` },
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '서버가 ACK를 보냅니다. ack 번호는 다음에 기대하는 바이트 번호(seq+데이터길이)입니다.',
    },
    {
      packet: { type: 'DATA', direction: 'left', seq: sSeq, ack: cSeq + 100, dataSize: 200, label: `DATA  seq=${sSeq}  ack=${cSeq + 100}  len=200` },
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '서버가 200바이트 응답 데이터를 전송합니다.',
    },
    {
      packet: { type: 'ACK', direction: 'right', seq: cSeq + 100, ack: sSeq + 200, label: `ACK  seq=${cSeq + 100}  ack=${sSeq + 200}` },
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '클라이언트가 ACK로 수신을 확인합니다.',
    },
  ]
}

function buildTerminationSteps(): Step[] {
  const cSeq = CLIENT_ISN + 101
  const sSeq = SERVER_ISN + 201
  return [
    {
      packet: null,
      clientState: 'ESTABLISHED',
      serverState: 'ESTABLISHED',
      description: '연결 종료를 시작합니다. 클라이언트가 먼저 종료를 요청합니다.',
    },
    {
      packet: { type: 'FIN', direction: 'right', seq: cSeq, ack: sSeq, label: `FIN  seq=${cSeq}  ack=${sSeq}` },
      clientState: 'FIN_WAIT_1',
      serverState: 'ESTABLISHED',
      description: '1단계: 클라이언트가 FIN을 보내 자신의 송신을 종료하겠다고 알립니다.',
    },
    {
      packet: { type: 'ACK', direction: 'left', seq: sSeq, ack: cSeq + 1, label: `ACK  seq=${sSeq}  ack=${cSeq + 1}` },
      clientState: 'FIN_WAIT_2',
      serverState: 'CLOSE_WAIT',
      description: '2단계: 서버가 ACK로 FIN 수신을 확인합니다. 서버는 아직 데이터를 보낼 수 있습니다.',
    },
    {
      packet: { type: 'FIN', direction: 'left', seq: sSeq, ack: cSeq + 1, label: `FIN  seq=${sSeq}  ack=${cSeq + 1}` },
      clientState: 'FIN_WAIT_2',
      serverState: 'LAST_ACK',
      description: '3단계: 서버도 FIN을 보내 자신의 송신을 종료합니다.',
    },
    {
      packet: { type: 'ACK', direction: 'right', seq: cSeq + 1, ack: sSeq + 1, label: `ACK  seq=${cSeq + 1}  ack=${sSeq + 1}` },
      clientState: 'TIME_WAIT',
      serverState: 'CLOSED',
      description: '4단계: 클라이언트가 마지막 ACK를 보냅니다. TIME_WAIT 후 연결이 완전히 종료됩니다.',
    },
  ]
}

function buildFullSteps(): Step[] {
  return [
    ...buildHandshakeSteps(),
    ...buildDataSteps().slice(1),
    ...buildTerminationSteps().slice(1),
  ]
}

function getSteps(scenario: Scenario): Step[] {
  switch (scenario) {
    case 'handshake': return buildHandshakeSteps()
    case 'data': return buildDataSteps()
    case 'termination': return buildTerminationSteps()
    case 'full': return buildFullSteps()
  }
}

// ── State Color ────────────────────────────────────────────────────────────────

function stateColor(state: ConnectionState, isDark: boolean): string {
  const map: Record<ConnectionState, [string, string]> = {
    CLOSED:       ['#9ca3af', '#6b7280'],
    LISTEN:       ['#f59e0b', '#fbbf24'],
    SYN_SENT:     ['#2563eb', '#60a5fa'],
    SYN_RECEIVED: ['#0891b2', '#22d3ee'],
    ESTABLISHED:  ['#16a34a', '#4ade80'],
    FIN_WAIT_1:   ['#dc2626', '#f87171'],
    FIN_WAIT_2:   ['#ea580c', '#fb923c'],
    CLOSE_WAIT:   ['#d97706', '#fbbf24'],
    LAST_ACK:     ['#9333ea', '#a78bfa'],
    TIME_WAIT:    ['#6366f1', '#818cf8'],
  }
  return isDark ? map[state][1] : map[state][0]
}

// ── Canvas Drawing ─────────────────────────────────────────────────────────────

function drawVisualization(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  steps: Step[],
  currentStep: number,
  animProgress: number,
  isDark: boolean,
) {
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  // Background
  ctx.fillStyle = isDark ? '#1f2937' : '#ffffff'
  ctx.fillRect(0, 0, w, h)

  const leftX = 100
  const rightX = w - 100
  const topY = 60
  const rowH = Math.min(70, (h - 100) / Math.max(steps.length, 1))
  const endY = topY + (steps.length - 1) * rowH + 30

  // ── Endpoint headers ──
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = isDark ? '#e5e7eb' : '#1f2937'
  ctx.fillText('Client', leftX, 30)
  ctx.fillText('Server', rightX, 30)

  // ── Vertical timelines ──
  ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(leftX, topY - 10)
  ctx.lineTo(leftX, endY + 20)
  ctx.moveTo(rightX, topY - 10)
  ctx.lineTo(rightX, endY + 20)
  ctx.stroke()
  ctx.setLineDash([])

  // ── Draw each step ──
  for (let i = 0; i <= currentStep; i++) {
    const step = steps[i]
    const y = topY + i * rowH

    // State labels
    ctx.font = '11px system-ui, sans-serif'

    // Client state (left of timeline)
    ctx.textAlign = 'right'
    ctx.fillStyle = stateColor(step.clientState, isDark)
    ctx.fillText(step.clientState, leftX - 12, y + 4)

    // Server state (right of timeline)
    ctx.textAlign = 'left'
    ctx.fillStyle = stateColor(step.serverState, isDark)
    ctx.fillText(step.serverState, rightX + 12, y + 4)

    // Timeline dots
    ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
    ctx.beginPath()
    ctx.arc(leftX, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(rightX, y, 3, 0, Math.PI * 2)
    ctx.fill()

    // Packet arrow
    if (step.packet) {
      const isCurrentAnimating = i === currentStep && animProgress < 1
      const progress = isCurrentAnimating ? animProgress : 1

      const fromX = step.packet.direction === 'right' ? leftX : rightX
      const toX = step.packet.direction === 'right' ? rightX : leftX
      const prevY = i > 0 ? topY + (i - 1) * rowH : y
      const startY = i === 0 ? y : prevY + rowH * 0.15

      const curFromX = fromX
      const curToX = fromX + (toX - fromX) * progress
      const curFromY = startY
      const curToY = startY + (y - startY + rowH * 0.3) * progress

      const pType = step.packet.type
      const color = isDark ? PACKET_COLORS[pType].dark : PACKET_COLORS[pType].light

      // Arrow line
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(curFromX, curFromY)
      ctx.lineTo(curToX, curToY)
      ctx.stroke()

      // Arrowhead
      if (progress > 0.1) {
        const angle = Math.atan2(curToY - curFromY, curToX - curFromX)
        const headLen = 10
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(curToX, curToY)
        ctx.lineTo(curToX - headLen * Math.cos(angle - 0.4), curToY - headLen * Math.sin(angle - 0.4))
        ctx.lineTo(curToX - headLen * Math.cos(angle + 0.4), curToY - headLen * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
      }

      // Label on arrow (show when mostly complete)
      if (progress > 0.4) {
        const midX = (curFromX + curToX) / 2
        const midY = (curFromY + curToY) / 2 - 10
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'

        // Background for readability
        const labelText = step.packet.label
        const metrics = ctx.measureText(labelText)
        const pad = 4
        ctx.fillStyle = isDark ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.85)'
        ctx.fillRect(midX - metrics.width / 2 - pad, midY - 10, metrics.width + pad * 2, 16)

        ctx.fillStyle = color
        ctx.fillText(labelText, midX, midY)
      }
    }
  }

  ctx.restore()
}

// ── Component ──────────────────────────────────────────────────────────────────

const SCENARIOS: { key: Scenario; label: string; desc: string }[] = [
  { key: 'handshake', label: '3-way Handshake', desc: '연결 수립' },
  { key: 'data', label: '데이터 전송', desc: 'DATA + ACK' },
  { key: 'termination', label: '4-way Termination', desc: '연결 종료' },
  { key: 'full', label: '전체 과정', desc: '연결 → 전송 → 종료' },
]

export default function TcpHandshakeVisualizer() {
  const [scenario, setScenario] = useState<Scenario>('handshake')
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [guideOpen, setGuideOpen] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const animProgressRef = useRef(1)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const steps = getSteps(scenario)
  const totalSteps = steps.length - 1

  // Detect dark mode
  const isDarkRef = useRef(false)
  useEffect(() => {
    const check = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark')
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // ── Canvas rendering loop ──
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawVisualization(ctx, w, h, dpr, steps, currentStep, animProgressRef.current, isDarkRef.current)
  }, [steps, currentStep])

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      render()
      animRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [render])

  // ── Animation for step transitions ──
  const animateStep = useCallback((targetStep: number) => {
    animProgressRef.current = 0
    const start = performance.now()
    const duration = 600 / speed

    const animate = (now: number) => {
      const elapsed = now - start
      animProgressRef.current = Math.min(1, elapsed / duration)
      if (animProgressRef.current < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
    setCurrentStep(targetStep)
  }, [speed])

  // ── Auto-play ──
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
      return
    }

    const scheduleNext = () => {
      playTimerRef.current = setTimeout(() => {
        setCurrentStep(prev => {
          const next = prev + 1
          if (next > totalSteps) {
            setIsPlaying(false)
            return prev
          }
          animateStep(next)
          scheduleNext()
          return prev // animateStep handles the actual update
        })
      }, 1200 / speed)
    }

    scheduleNext()
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [isPlaying, speed, totalSteps, animateStep])

  // ── Controls ──
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      animateStep(currentStep + 1)
    }
  }, [currentStep, totalSteps, animateStep])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(0)
    animProgressRef.current = 1
  }, [])

  const handleScenarioChange = useCallback((s: Scenario) => {
    setScenario(s)
    setCurrentStep(0)
    setIsPlaying(false)
    animProgressRef.current = 1
  }, [])

  const currentStepData = steps[currentStep]

  // ── State explanation table ──
  const STATE_DESCRIPTIONS: Record<ConnectionState, string> = {
    CLOSED: '연결이 없거나 완전히 종료된 상태',
    LISTEN: '서버가 클라이언트의 연결 요청(SYN)을 대기 중',
    SYN_SENT: '클라이언트가 SYN을 보낸 후 SYN-ACK를 대기 중',
    SYN_RECEIVED: '서버가 SYN을 받고 SYN-ACK를 보낸 후 ACK를 대기 중',
    ESTABLISHED: '연결이 수립되어 데이터 전송이 가능한 상태',
    FIN_WAIT_1: 'FIN을 보낸 후 ACK를 대기 중',
    FIN_WAIT_2: 'FIN에 대한 ACK를 받고 상대방의 FIN을 대기 중',
    CLOSE_WAIT: '상대방의 FIN을 받고 ACK를 보낸 상태, 자신의 종료 준비 중',
    LAST_ACK: 'FIN을 보낸 후 마지막 ACK를 대기 중',
    TIME_WAIT: '마지막 ACK를 보낸 후 일정 시간(2MSL) 대기',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          TCP 핸드셰이크 시각화
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          TCP 3-way Handshake, 데이터 전송, 4-way Termination 과정을 단계별로 학습하세요
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(s => (
          <button
            key={s.key}
            onClick={() => handleScenarioChange(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scenario === s.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <span className="font-semibold">{s.label}</span>
            <span className="hidden sm:inline text-xs ml-1 opacity-75">({s.desc})</span>
          </button>
        ))}
      </div>

      {/* Main Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: `${Math.max(400, steps.length * 70 + 100)}px` }}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '일시정지' : '자동 재생'}
              </button>
              <button
                onClick={handleNext}
                disabled={currentStep >= totalSteps}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                다음 단계
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                초기화
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500 dark:text-gray-400">속도</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.5}
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="w-20 accent-blue-600"
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 w-8">{speed}x</span>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {currentStep}/{totalSteps}
              </span>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Current Step Description */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              현재 단계
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-medium">
                  <span className="text-gray-500 dark:text-gray-400">Client: </span>
                  <span
                    className="font-bold"
                    style={{ color: stateColor(currentStepData.clientState, false) }}
                  >
                    {currentStepData.clientState}
                  </span>
                </div>
                <div className="text-xs font-medium">
                  <span className="text-gray-500 dark:text-gray-400">Server: </span>
                  <span
                    className="font-bold"
                    style={{ color: stateColor(currentStepData.serverState, false) }}
                  >
                    {currentStepData.serverState}
                  </span>
                </div>
              </div>
              {currentStepData.packet && (
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-2">
                  <code className="text-xs font-mono text-blue-800 dark:text-blue-200">
                    {currentStepData.packet.label}
                  </code>
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Packet Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              패킷 유형
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PACKET_COLORS) as PacketType[]).map(type => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PACKET_COLORS[type].light }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* State Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              연결 상태 표
            </h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(Object.entries(STATE_DESCRIPTIONS) as [ConnectionState, string][]).map(([state, desc]) => {
                const isActive = state === currentStepData.clientState || state === currentStepData.serverState
                return (
                  <div
                    key={state}
                    className={`flex gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-200 dark:ring-blue-800'
                        : ''
                    }`}
                  >
                    <span
                      className="font-mono font-bold whitespace-nowrap"
                      style={{ color: stateColor(state, false), minWidth: '100px' }}
                    >
                      {state}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">{desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">가이드</h2>
          </div>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {guideOpen && (
          <div className="mt-6 space-y-8 text-sm text-gray-700 dark:text-gray-300">
            {/* What is TCP */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">TCP란?</h3>
              <p className="leading-relaxed">
                TCP(Transmission Control Protocol)는 인터넷에서 데이터를 안정적으로 전송하기 위한 연결 지향 프로토콜입니다.
                데이터가 손실되거나 순서가 바뀌는 것을 방지하며, 흐름 제어와 혼잡 제어를 통해 네트워크 안정성을 보장합니다.
                HTTP, HTTPS, SSH, FTP 등 대부분의 애플리케이션 프로토콜이 TCP 위에서 동작합니다.
              </p>
            </section>

            {/* 3-way vs 4-way */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                3-way Handshake vs 4-way Termination
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">3-way Handshake (연결 수립)</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Client → Server: <code className="bg-white dark:bg-gray-800 px-1 rounded">SYN</code> (연결 요청, 초기 seq 번호 전달)</li>
                    <li>Server → Client: <code className="bg-white dark:bg-gray-800 px-1 rounded">SYN-ACK</code> (요청 수락, 서버 seq + 클라이언트 seq 확인)</li>
                    <li>Client → Server: <code className="bg-white dark:bg-gray-800 px-1 rounded">ACK</code> (연결 확정, 서버 seq 확인)</li>
                  </ol>
                </div>
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">4-way Termination (연결 종료)</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Active → Passive: <code className="bg-white dark:bg-gray-800 px-1 rounded">FIN</code> (종료 요청)</li>
                    <li>Passive → Active: <code className="bg-white dark:bg-gray-800 px-1 rounded">ACK</code> (FIN 수신 확인)</li>
                    <li>Passive → Active: <code className="bg-white dark:bg-gray-800 px-1 rounded">FIN</code> (자신도 종료)</li>
                    <li>Active → Passive: <code className="bg-white dark:bg-gray-800 px-1 rounded">ACK</code> (최종 확인)</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Sequence Numbers */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">시퀀스 번호와 ACK 번호</h3>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>시퀀스 번호(SEQ)</strong>: 송신 데이터의 첫 바이트 위치. 초기값은 랜덤(ISN)으로 보안성 확보</li>
                <li><strong>확인응답 번호(ACK)</strong>: 수신 측이 다음에 기대하는 바이트 번호 (= 받은 SEQ + 데이터 길이)</li>
                <li><strong>SYN/FIN 플래그</strong>: 데이터가 없어도 시퀀스 번호를 1 증가시킴 (가상의 1바이트)</li>
                <li><strong>누적 확인응답</strong>: ACK 번호는 해당 번호 이전의 모든 바이트를 수신했음을 의미</li>
              </ul>
            </section>

            {/* Why 3-way */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">왜 3-way인가?</h3>
              <p className="leading-relaxed mb-2">
                2-way로 충분하지 않은 이유는 양쪽 모두 상대방이 자신의 메시지를 받았는지 확인해야 하기 때문입니다.
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>1단계 (SYN)</strong>: 서버는 클라이언트가 통신 가능함을 확인</li>
                <li><strong>2단계 (SYN-ACK)</strong>: 클라이언트는 서버가 통신 가능함을 확인 + 서버가 자신의 SYN을 받았음을 확인</li>
                <li><strong>3단계 (ACK)</strong>: 서버는 클라이언트가 자신의 SYN-ACK를 받았음을 확인</li>
                <li>이 과정으로 양쪽 모두 송수신 능력이 검증되고, 중복 연결(지연된 SYN 재전송)도 방지됩니다</li>
              </ul>
            </section>

            {/* FAQ */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">자주 묻는 질문</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Q: TIME_WAIT 상태는 왜 필요한가요?
                  </h4>
                  <p className="mt-1">
                    마지막 ACK가 유실될 경우를 대비합니다. TIME_WAIT(2MSL, 보통 60초) 동안 대기하면서
                    상대방이 FIN을 재전송하면 다시 ACK를 보낼 수 있습니다. 또한 이전 연결의 지연 패킷이
                    새 연결에 영향을 주는 것도 방지합니다.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Q: TCP와 UDP의 차이점은?
                  </h4>
                  <p className="mt-1">
                    TCP는 연결 지향적이며 데이터 전달을 보장하지만, UDP는 비연결형으로 핸드셰이크 없이
                    바로 데이터를 전송합니다. UDP는 빠르지만 순서 보장이나 재전송이 없어
                    게임, 실시간 스트리밍, DNS 등에 적합합니다.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Q: SYN Flood 공격이란?
                  </h4>
                  <p className="mt-1">
                    공격자가 대량의 SYN 패킷을 보내되 ACK를 보내지 않아 서버의 SYN_RECEIVED 연결 큐를
                    가득 채우는 DoS 공격입니다. SYN Cookie, SYN Proxy, 방화벽 레이트 리미팅 등으로 방어합니다.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
