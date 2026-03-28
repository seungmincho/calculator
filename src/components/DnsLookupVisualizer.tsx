'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Globe,
  Server,
  Database,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX'

interface DnsStep {
  id: number
  from: ServerKey
  to: ServerKey
  queryType: 'query' | 'response'
  label: string
  detail: string
  recordInfo?: string
  isCacheHit?: boolean
  timeMs: number
}

type ServerKey =
  | 'browser'
  | 'browserCache'
  | 'osCache'
  | 'resolver'
  | 'rootNS'
  | 'tldNS'
  | 'authNS'

interface ServerDef {
  key: ServerKey
  name: string
  icon: string
  description: string
  x: number
  y: number
}

interface Preset {
  name: string
  domain: string
  recordType: RecordType
  cacheEnabled: boolean
  cacheHitAt?: 'browserCache' | 'osCache'
  cnameChain?: string[]
  description: string
}

// ── Server layout ────────────────────────────────────────────────────────────

const SERVERS: ServerDef[] = [
  { key: 'browser', name: '브라우저', icon: '🌐', description: '사용자의 웹 브라우저', x: 0.08, y: 0.5 },
  { key: 'browserCache', name: '브라우저 캐시', icon: '💾', description: 'DNS 캐시 (로컬)', x: 0.22, y: 0.22 },
  { key: 'osCache', name: 'OS 캐시', icon: '🖥️', description: 'OS DNS 리졸버 캐시', x: 0.22, y: 0.78 },
  { key: 'resolver', name: '재귀 리졸버', icon: '🔄', description: 'ISP/공용 DNS 서버\n(8.8.8.8 등)', x: 0.48, y: 0.5 },
  { key: 'rootNS', name: '루트 NS', icon: '🌍', description: '루트 네임서버\n(13개 전 세계)', x: 0.78, y: 0.15 },
  { key: 'tldNS', name: 'TLD NS', icon: '📂', description: 'TLD 네임서버\n(.com, .kr 등)', x: 0.78, y: 0.5 },
  { key: 'authNS', name: '권한 NS', icon: '🏢', description: '권한 네임서버\n(최종 레코드 보유)', x: 0.78, y: 0.85 },
]

const SERVER_MAP = new Map(SERVERS.map((s) => [s.key, s]))

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: '기본 조회',
    domain: 'www.example.com',
    recordType: 'A',
    cacheEnabled: false,
    description: '전체 DNS 조회 과정 (캐시 미스)',
  },
  {
    name: 'CNAME 체인',
    domain: 'mail.google.com',
    recordType: 'A',
    cacheEnabled: false,
    cnameChain: ['googlemail.l.google.com'],
    description: 'CNAME 레코드를 따라가는 조회',
  },
  {
    name: '캐시 히트',
    domain: 'www.example.com',
    recordType: 'A',
    cacheEnabled: true,
    cacheHitAt: 'browserCache',
    description: '브라우저 캐시에서 즉시 응답',
  },
  {
    name: 'MX 레코드',
    domain: 'example.com',
    recordType: 'MX',
    cacheEnabled: false,
    description: '메일 서버 레코드 조회',
  },
]

// ── Step generation ──────────────────────────────────────────────────────────

function generateSteps(
  domain: string,
  recordType: RecordType,
  cacheEnabled: boolean,
  cacheHitAt?: 'browserCache' | 'osCache',
  cnameChain?: string[]
): DnsStep[] {
  const steps: DnsStep[] = []
  let id = 0
  const tld = domain.split('.').pop() || 'com'
  const ipResult =
    recordType === 'A'
      ? '93.184.216.34'
      : recordType === 'AAAA'
        ? '2606:2800:220:1:248:1893:25c8:1946'
        : recordType === 'MX'
          ? '10 mail.example.com'
          : domain

  // 1. Browser → Browser Cache
  steps.push({
    id: id++,
    from: 'browser',
    to: 'browserCache',
    queryType: 'query',
    label: `${domain} ${recordType} 조회`,
    detail: `브라우저가 로컬 DNS 캐시에서 "${domain}"의 ${recordType} 레코드를 검색합니다.`,
    timeMs: 0,
  })

  if (cacheEnabled && cacheHitAt === 'browserCache') {
    steps.push({
      id: id++,
      from: 'browserCache',
      to: 'browser',
      queryType: 'response',
      label: `캐시 히트! → ${ipResult}`,
      detail: `브라우저 캐시에서 ${recordType} 레코드를 찾았습니다. TTL이 남아 있어 즉시 응답합니다.`,
      recordInfo: `${recordType}: ${ipResult} (TTL: 3600s)`,
      isCacheHit: true,
      timeMs: 1,
    })
    return steps
  }

  steps.push({
    id: id++,
    from: 'browserCache',
    to: 'browser',
    queryType: 'response',
    label: '캐시 미스',
    detail: '브라우저 캐시에 해당 레코드가 없습니다. OS DNS 캐시를 확인합니다.',
    timeMs: 1,
  })

  // 2. Browser → OS Cache
  steps.push({
    id: id++,
    from: 'browser',
    to: 'osCache',
    queryType: 'query',
    label: `OS 캐시 조회: ${domain}`,
    detail: `운영체제의 DNS 리졸버 캐시(예: systemd-resolved, dnsmasq)에 질의합니다.`,
    timeMs: 2,
  })

  if (cacheEnabled && cacheHitAt === 'osCache') {
    steps.push({
      id: id++,
      from: 'osCache',
      to: 'browser',
      queryType: 'response',
      label: `OS 캐시 히트! → ${ipResult}`,
      detail: `OS 캐시에서 ${recordType} 레코드를 찾았습니다.`,
      recordInfo: `${recordType}: ${ipResult} (TTL: 1800s)`,
      isCacheHit: true,
      timeMs: 3,
    })
    return steps
  }

  steps.push({
    id: id++,
    from: 'osCache',
    to: 'browser',
    queryType: 'response',
    label: 'OS 캐시 미스',
    detail: 'OS 캐시에도 없습니다. 재귀 DNS 리졸버에 질의합니다.',
    timeMs: 5,
  })

  // 3. Browser → Recursive Resolver
  steps.push({
    id: id++,
    from: 'browser',
    to: 'resolver',
    queryType: 'query',
    label: `재귀 조회 요청: ${domain} ${recordType}`,
    detail: `ISP 또는 공용 DNS(예: 8.8.8.8, 1.1.1.1)에 재귀 조회를 요청합니다. 리졸버가 대신 전체 조회를 수행합니다.`,
    timeMs: 10,
  })

  // 4. Resolver → Root NS
  steps.push({
    id: id++,
    from: 'resolver',
    to: 'rootNS',
    queryType: 'query',
    label: `루트 NS에 질의: "${domain}" 어디?`,
    detail: `전 세계 13개 루트 네임서버 중 하나에 질의합니다. 루트 NS는 TLD(.${tld})를 담당하는 서버 주소를 알려줍니다.`,
    timeMs: 30,
  })

  steps.push({
    id: id++,
    from: 'rootNS',
    to: 'resolver',
    queryType: 'response',
    label: `.${tld} TLD NS: a.gtld-servers.net`,
    detail: `루트 NS가 ".${tld}" 도메인을 관리하는 TLD 네임서버의 주소를 응답합니다. NS 레퍼럴(referral)입니다.`,
    recordInfo: `NS: a.gtld-servers.net (${tld} TLD)`,
    timeMs: 60,
  })

  // 5. Resolver → TLD NS
  steps.push({
    id: id++,
    from: 'resolver',
    to: 'tldNS',
    queryType: 'query',
    label: `TLD NS에 질의: "${domain}" 어디?`,
    detail: `.${tld} TLD 네임서버에 질의합니다. 도메인을 등록할 때 지정한 권한 네임서버를 알려줍니다.`,
    timeMs: 80,
  })

  const baseDomain = domain.split('.').slice(-2).join('.')
  steps.push({
    id: id++,
    from: 'tldNS',
    to: 'resolver',
    queryType: 'response',
    label: `${baseDomain} NS: ns1.${baseDomain}`,
    detail: `TLD NS가 "${baseDomain}"의 권한 네임서버 주소를 응답합니다.`,
    recordInfo: `NS: ns1.${baseDomain}, ns2.${baseDomain}`,
    timeMs: 110,
  })

  // 6. Resolver → Authoritative NS
  steps.push({
    id: id++,
    from: 'resolver',
    to: 'authNS',
    queryType: 'query',
    label: `권한 NS에 질의: ${domain} ${recordType}?`,
    detail: `최종 권한 네임서버에 실제 DNS 레코드를 질의합니다. 이 서버가 도메인의 zone 파일을 보유합니다.`,
    timeMs: 130,
  })

  // Handle CNAME chain
  if (cnameChain && cnameChain.length > 0) {
    steps.push({
      id: id++,
      from: 'authNS',
      to: 'resolver',
      queryType: 'response',
      label: `CNAME → ${cnameChain[0]}`,
      detail: `권한 NS가 CNAME 레코드를 응답합니다. "${domain}"은 "${cnameChain[0]}"의 별칭(alias)입니다. CNAME 대상을 다시 조회해야 합니다.`,
      recordInfo: `CNAME: ${domain} → ${cnameChain[0]}`,
      timeMs: 160,
    })

    steps.push({
      id: id++,
      from: 'resolver',
      to: 'authNS',
      queryType: 'query',
      label: `CNAME 대상 조회: ${cnameChain[0]} A?`,
      detail: `CNAME 대상 "${cnameChain[0]}"의 A 레코드를 권한 NS에 추가 질의합니다.`,
      timeMs: 180,
    })
  }

  steps.push({
    id: id++,
    from: 'authNS',
    to: 'resolver',
    queryType: 'response',
    label: `${recordType}: ${ipResult}`,
    detail: `권한 NS가 최종 ${recordType} 레코드를 응답합니다. 리졸버는 이 결과를 캐시에 저장합니다.`,
    recordInfo: `${recordType}: ${ipResult} (TTL: 3600s)`,
    timeMs: 200,
  })

  // 7. Resolver → Browser (final response)
  steps.push({
    id: id++,
    from: 'resolver',
    to: 'browser',
    queryType: 'response',
    label: `최종 응답: ${ipResult}`,
    detail: `재귀 리졸버가 최종 결과를 브라우저에 전달합니다. 브라우저는 이 IP로 HTTP 연결을 시작합니다.`,
    recordInfo: `${recordType}: ${ipResult}`,
    timeMs: 220,
  })

  return steps
}

// ── Canvas drawing ───────────────────────────────────────────────────────────

function drawVisualization(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  servers: ServerDef[],
  steps: DnsStep[],
  currentStep: number,
  animProgress: number,
  isDark: boolean
) {
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  const bg = isDark ? '#1f2937' : '#f8fafc'
  const cardBg = isDark ? '#374151' : '#ffffff'
  const cardBorder = isDark ? '#4b5563' : '#e2e8f0'
  const textColor = isDark ? '#f3f4f6' : '#1e293b'
  const subtextColor = isDark ? '#9ca3af' : '#64748b'
  const queryColor = isDark ? '#60a5fa' : '#3b82f6'
  const responseColor = isDark ? '#34d399' : '#10b981'
  const cacheHitColor = isDark ? '#fbbf24' : '#f59e0b'
  const activeGlow = isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.2)'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Determine active servers
  const activeServers = new Set<ServerKey>()
  for (let i = 0; i <= currentStep && i < steps.length; i++) {
    activeServers.add(steps[i].from)
    activeServers.add(steps[i].to)
  }
  if (currentStep >= 0 && currentStep < steps.length) {
    activeServers.add(steps[currentStep].from)
    activeServers.add(steps[currentStep].to)
  }

  const boxW = Math.min(120, width * 0.14)
  const boxH = Math.min(70, height * 0.14)

  // Draw servers
  for (const server of servers) {
    const cx = server.x * width
    const cy = server.y * height
    const x = cx - boxW / 2
    const y = cy - boxH / 2
    const isActive = activeServers.has(server.key)
    const isCurrentFrom =
      currentStep >= 0 && currentStep < steps.length && steps[currentStep].from === server.key
    const isCurrentTo =
      currentStep >= 0 && currentStep < steps.length && steps[currentStep].to === server.key

    // Glow for active
    if (isCurrentFrom || isCurrentTo) {
      ctx.shadowColor = isCurrentTo ? responseColor : queryColor
      ctx.shadowBlur = 18
    }

    // Card
    ctx.fillStyle = isActive ? cardBg : isDark ? '#2d3748' : '#f1f5f9'
    ctx.strokeStyle = isCurrentFrom || isCurrentTo
      ? isCurrentTo
        ? responseColor
        : queryColor
      : cardBorder
    ctx.lineWidth = isCurrentFrom || isCurrentTo ? 2.5 : 1
    roundRect(ctx, x, y, boxW, boxH, 10)
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0

    // Icon
    ctx.font = `${Math.max(18, boxH * 0.3)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(server.icon, cx, cy - boxH * 0.12)

    // Name
    ctx.font = `bold ${Math.max(10, boxH * 0.16)}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = textColor
    ctx.fillText(server.name, cx, cy + boxH * 0.22)
  }

  // Draw completed arrows
  for (let i = 0; i < currentStep && i < steps.length; i++) {
    drawArrow(ctx, width, height, steps[i], 1, boxW, boxH, isDark, true)
  }

  // Draw current animated arrow
  if (currentStep >= 0 && currentStep < steps.length) {
    drawArrow(ctx, width, height, steps[currentStep], animProgress, boxW, boxH, isDark, false)
  }

  ctx.restore()
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  step: DnsStep,
  progress: number,
  boxW: number,
  boxH: number,
  isDark: boolean,
  isCompleted: boolean
) {
  const from = SERVER_MAP.get(step.from)!
  const to = SERVER_MAP.get(step.to)!
  const fx = from.x * width
  const fy = from.y * height
  const tx = to.x * width
  const ty = to.y * height

  // Offset to avoid overlapping with box
  const angle = Math.atan2(ty - fy, tx - fx)
  const startX = fx + Math.cos(angle) * (boxW / 2 + 4)
  const startY = fy + Math.sin(angle) * (boxH / 2 + 4)
  const endX = tx - Math.cos(angle) * (boxW / 2 + 4)
  const endY = ty - Math.sin(angle) * (boxH / 2 + 4)

  const curX = startX + (endX - startX) * progress
  const curY = startY + (endY - startY) * progress

  const isQuery = step.queryType === 'query'
  const baseColor = step.isCacheHit
    ? isDark
      ? '#fbbf24'
      : '#f59e0b'
    : isQuery
      ? isDark
        ? '#60a5fa'
        : '#3b82f6'
      : isDark
        ? '#34d399'
        : '#10b981'

  const alpha = isCompleted ? 0.35 : 0.9
  ctx.globalAlpha = alpha

  // Line
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(curX, curY)
  ctx.strokeStyle = baseColor
  ctx.lineWidth = isCompleted ? 1.5 : 2.5
  ctx.setLineDash(isQuery ? [6, 4] : [])
  ctx.stroke()
  ctx.setLineDash([])

  // Arrowhead
  if (progress > 0.1) {
    const headLen = 10
    const headAngle = Math.atan2(curY - startY, curX - startX)
    ctx.beginPath()
    ctx.moveTo(curX, curY)
    ctx.lineTo(curX - headLen * Math.cos(headAngle - 0.4), curY - headLen * Math.sin(headAngle - 0.4))
    ctx.lineTo(curX - headLen * Math.cos(headAngle + 0.4), curY - headLen * Math.sin(headAngle + 0.4))
    ctx.closePath()
    ctx.fillStyle = baseColor
    ctx.fill()
  }

  // Label on arrow (midpoint)
  if (!isCompleted && progress > 0.3) {
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const fontSize = Math.max(9, Math.min(11, width * 0.015))
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'

    // Background for label
    const text = step.label.length > 35 ? step.label.slice(0, 32) + '...' : step.label
    const metrics = ctx.measureText(text)
    const padX = 5
    const padY = 3
    const labelY = midY - 8
    ctx.fillStyle = isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.9)'
    roundRect(
      ctx,
      midX - metrics.width / 2 - padX,
      labelY - fontSize - padY,
      metrics.width + padX * 2,
      fontSize + padY * 2,
      4
    )
    ctx.fill()

    ctx.fillStyle = baseColor
    ctx.fillText(text, midX, labelY)
  }

  ctx.globalAlpha = 1
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DnsLookupVisualizer() {
  const [domain, setDomain] = useState('www.example.com')
  const [recordType, setRecordType] = useState<RecordType>('A')
  const [cacheEnabled, setCacheEnabled] = useState(false)
  const [cacheHitAt, setCacheHitAt] = useState<'browserCache' | 'osCache'>('browserCache')
  const [cnameChain, setCnameChain] = useState<string[] | undefined>(undefined)

  const [steps, setSteps] = useState<DnsStep[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [animProgress, setAnimProgress] = useState(0)
  const [isStarted, setIsStarted] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [guideOpen, setGuideOpen] = useState(false)

  // Detect dark mode
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const check = () => setIsDark(document.documentElement.classList.contains('dark') || mq.matches)
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    mq.addEventListener('change', check)
    return () => {
      obs.disconnect()
      mq.removeEventListener('change', check)
    }
  }, [])

  // Canvas resize + draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = window.devicePixelRatio || 1
    const w = parent.clientWidth
    const h = Math.max(340, Math.min(480, w * 0.55))
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawVisualization(ctx, w, h, dpr, SERVERS, steps, currentStep, animProgress, isDark)
  }, [steps, currentStep, animProgress, isDark])

  useEffect(() => {
    draw()
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  // Animation loop for arrow progress
  useEffect(() => {
    if (!isStarted || currentStep < 0 || currentStep >= steps.length) return
    if (animProgress >= 1) return

    let start: number | null = null
    const duration = 600

    const tick = (ts: number) => {
      if (!start) start = ts
      const elapsed = ts - start
      const p = Math.min(1, elapsed / duration)
      setAnimProgress(p)
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick)
      }
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [currentStep, isStarted, steps.length, animProgress])

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !isStarted) return
    if (animProgress < 1) return
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false)
      return
    }
    playTimerRef.current = setTimeout(() => {
      goNext()
    }, 800)
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [isPlaying, animProgress, currentStep, steps.length, isStarted])

  const startSimulation = useCallback(() => {
    const newSteps = generateSteps(
      domain,
      recordType,
      cacheEnabled,
      cacheEnabled ? cacheHitAt : undefined,
      cnameChain
    )
    setSteps(newSteps)
    setCurrentStep(0)
    setAnimProgress(0)
    setIsStarted(true)
    setIsPlaying(true)
  }, [domain, recordType, cacheEnabled, cacheHitAt, cnameChain])

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < steps.length - 1) {
        setAnimProgress(0)
        return prev + 1
      }
      return prev
    })
  }, [steps.length])

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev > 0) {
        setAnimProgress(1)
        return prev - 1
      }
      return prev
    })
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setIsStarted(false)
    setSteps([])
    setCurrentStep(-1)
    setAnimProgress(0)
  }, [])

  const applyPreset = useCallback((preset: Preset) => {
    setDomain(preset.domain)
    setRecordType(preset.recordType)
    setCacheEnabled(preset.cacheEnabled)
    if (preset.cacheHitAt) setCacheHitAt(preset.cacheHitAt)
    setCnameChain(preset.cnameChain)
    setIsPlaying(false)
    setIsStarted(false)
    setSteps([])
    setCurrentStep(-1)
    setAnimProgress(0)
  }, [])

  // Stats
  const totalQueries = steps.filter((s) => s.queryType === 'query').length
  const cacheHits = steps.filter((s) => s.isCacheHit).length
  const totalTimeMs = steps.length > 0 ? steps[steps.length - 1].timeMs : 0

  const currentStepData = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          DNS 조회 과정 시각화
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          도메인 이름이 IP 주소로 변환되는 과정을 단계별로 시각화합니다
        </p>
      </div>

      {/* Controls + Canvas */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left panel: settings */}
        <div className="lg:col-span-1 space-y-4">
          {/* Domain input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4" /> 조회 설정
            </h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                도메인
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="www.example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                레코드 타입
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['A', 'AAAA', 'CNAME', 'MX'] as RecordType[]).map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setRecordType(rt)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      recordType === rt
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                캐시 활성화
              </label>
              <button
                onClick={() => setCacheEnabled((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  cacheEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    cacheEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {cacheEnabled && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  캐시 히트 위치
                </label>
                <select
                  value={cacheHitAt}
                  onChange={(e) => setCacheHitAt(e.target.value as 'browserCache' | 'osCache')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="browserCache">브라우저 캐시</option>
                  <option value="osCache">OS 캐시</option>
                </select>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={startSimulation}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg px-4 py-3 font-medium hover:from-indigo-700 hover:to-violet-700 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isStarted ? '다시 시작' : '조회 시작'}
            </button>
          </div>

          {/* Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">프리셋</h2>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {preset.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          {isStarted && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" /> 통계
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {totalQueries}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">총 쿼리</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {cacheHits}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">캐시 히트</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ~{totalTimeMs}ms
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">총 소요</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: canvas + step detail */}
        <div className="lg:col-span-2 space-y-4">
          {/* Canvas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                DNS 조회 흐름
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-500 inline-block" style={{ borderTop: '2px dashed #3b82f6' }} /> 쿼리
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> 응답
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block" /> 캐시
                </span>
              </div>
            </div>
            <canvas ref={canvasRef} className="w-full rounded-lg" />

            {/* Playback controls */}
            {isStarted && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  onClick={goPrev}
                  disabled={currentStep <= 0}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                >
                  <SkipBack className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setIsPlaying((v) => !v)}
                  className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={goNext}
                  disabled={currentStep >= steps.length - 1}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                >
                  <SkipForward className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={reset}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>
            )}
          </div>

          {/* Step detail panel */}
          {currentStepData && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    currentStepData.isCacheHit
                      ? 'bg-amber-500'
                      : currentStepData.queryType === 'query'
                        ? 'bg-blue-500'
                        : 'bg-emerald-500'
                  }`}
                >
                  {currentStep + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {SERVER_MAP.get(currentStepData.from)?.name}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {SERVER_MAP.get(currentStepData.to)?.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentStepData.isCacheHit
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          : currentStepData.queryType === 'query'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      }`}
                    >
                      {currentStepData.isCacheHit
                        ? '캐시 히트'
                        : currentStepData.queryType === 'query'
                          ? '쿼리'
                          : '응답'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    {currentStepData.detail}
                  </p>
                  {currentStepData.recordInfo && (
                    <div className="mt-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono text-indigo-700 dark:text-indigo-300">
                      {currentStepData.recordInfo}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    ~{currentStepData.timeMs}ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step timeline */}
          {isStarted && steps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                전체 단계
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {steps.map((step, i) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      setCurrentStep(i)
                      setAnimProgress(1)
                      setIsPlaying(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      i === currentStep
                        ? 'bg-indigo-50 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-700'
                        : i < currentStep
                          ? 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
                          : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        step.isCacheHit
                          ? 'bg-amber-500'
                          : step.queryType === 'query'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate">{step.label}</span>
                    <span className="ml-auto shrink-0 text-gray-400">~{step.timeMs}ms</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DNS Record Types reference */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-500" />
          DNS 레코드 타입
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              type: 'A',
              desc: '도메인 → IPv4 주소',
              example: 'example.com → 93.184.216.34',
              color: 'blue',
            },
            {
              type: 'AAAA',
              desc: '도메인 → IPv6 주소',
              example: 'example.com → 2606:2800:...',
              color: 'purple',
            },
            {
              type: 'CNAME',
              desc: '도메인 별칭 (Alias)',
              example: 'www → example.com',
              color: 'amber',
            },
            {
              type: 'MX',
              desc: '메일 서버 레코드',
              example: '10 mail.example.com',
              color: 'emerald',
            },
          ].map((rec) => (
            <div
              key={rec.type}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div
                className={`text-sm font-bold ${
                  rec.color === 'blue'
                    ? 'text-blue-600 dark:text-blue-400'
                    : rec.color === 'purple'
                      ? 'text-purple-600 dark:text-purple-400'
                      : rec.color === 'amber'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {rec.type} 레코드
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{rec.desc}</div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                {rec.example}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            DNS 학습 가이드
          </h2>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {guideOpen && (
          <div className="px-6 pb-6 space-y-6">
            {/* What is DNS */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">DNS란?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                DNS(Domain Name System)는 인터넷의 전화번호부입니다. 사람이 기억하기 쉬운 도메인
                이름(예: www.google.com)을 컴퓨터가 통신에 사용하는 IP 주소(예: 142.250.196.68)로
                변환합니다. 1983년 Paul Mockapetris가 설계했으며, 전 세계 수십억 건의 DNS 조회가
                매일 처리됩니다.
              </p>
            </div>

            {/* Recursive vs Iterative */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                재귀 조회 vs 반복 조회
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    재귀 조회 (Recursive)
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    클라이언트가 리졸버에게 &quot;최종 답을 달라&quot;고 요청합니다. 리졸버가 다른
                    서버들을 대신 조회하여 완전한 답을 돌려줍니다. 일반 사용자가 주로 사용하는
                    방식입니다.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                    반복 조회 (Iterative)
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    리졸버가 각 네임서버에게 &quot;다음에 누구한테 물어봐야 하나요?&quot;라고
                    질의합니다. 각 서버는 가능한 최선의 참조(referral)를 응답하고, 리졸버가 직접
                    다음 서버에 질의합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* DNS Hierarchy */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">DNS 계층 구조</h3>
              <div className="space-y-2">
                {[
                  {
                    level: '루트 네임서버',
                    desc: '전 세계 13개 (a~m.root-servers.net). 모든 TLD 네임서버의 위치를 알고 있습니다.',
                  },
                  {
                    level: 'TLD 네임서버',
                    desc: '.com, .org, .kr 등 최상위 도메인별 서버. 해당 TLD에 등록된 모든 도메인의 권한 NS를 알고 있습니다.',
                  },
                  {
                    level: '권한 네임서버',
                    desc: '특정 도메인의 실제 DNS 레코드(A, AAAA, CNAME, MX 등)를 보유한 서버입니다.',
                  },
                ].map((item) => (
                  <div
                    key={item.level}
                    className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="shrink-0 w-1.5 rounded bg-indigo-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.level}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Caching */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">DNS 캐싱</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                DNS 응답에는 TTL(Time To Live) 값이 포함됩니다. 이 시간 동안 캐시에 저장되어 같은
                도메인을 다시 조회할 때 전체 과정을 생략합니다. 캐시는 브라우저(Chrome: 최대
                1분), OS(systemd-resolved 등), 재귀 리졸버 등 여러 계층에 존재합니다. TTL이
                만료되면 캐시가 삭제되고 다시 전체 조회를 수행합니다.
              </p>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">자주 묻는 질문</h3>
              <div className="space-y-3">
                {[
                  {
                    q: 'DNS 조회가 느리면 어떻게 하나요?',
                    a: '공용 DNS(8.8.8.8, 1.1.1.1)로 변경하거나, DNS over HTTPS(DoH)를 활성화하세요. 브라우저의 DNS 프리페치(dns-prefetch)도 도움이 됩니다.',
                  },
                  {
                    q: 'CNAME과 A 레코드의 차이는?',
                    a: 'A 레코드는 도메인을 IP 주소로 직접 매핑하고, CNAME은 도메인을 다른 도메인의 별칭으로 지정합니다. CNAME은 추가 DNS 조회가 필요하므로 약간 느릴 수 있습니다.',
                  },
                  {
                    q: 'DNS 캐시를 수동으로 지울 수 있나요?',
                    a: 'Windows: ipconfig /flushdns, macOS: sudo dscacheutil -flushcache, Chrome: chrome://net-internals/#dns에서 Clear host cache를 클릭하세요.',
                  },
                ].map((faq) => (
                  <div key={faq.q} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Q: {faq.q}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      A: {faq.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
