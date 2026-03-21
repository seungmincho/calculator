'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles, Copy, Check, Download, Share2, RefreshCw,
  ChevronDown, ChevronLeft, ChevronRight, BookOpen,
} from 'lucide-react'

// ─── Type Data ───────────────────────────────────────────────
interface TypeInfo {
  num: number
  name: string
  sub: string
  emoji: string
  color: string
  colorHex: string
  traits: string
  motivation: string
  fear: string
  healthy: string
  unhealthy: string
  wings: string
  growth: string
  stress: string
  mbti: string[]
}

const TYPES: TypeInfo[] = [
  { num: 1, name: '개혁가', sub: 'Reformer', emoji: '⚖️', color: 'red', colorHex: '#ef4444', traits: '원칙적, 완벽주의, 정의감', motivation: '올바르고 정확하게 살고자 하는 욕구', fear: '부패하거나 결함이 있는 존재가 되는 것', healthy: '현명하고 분별력 있으며, 원칙적이면서도 유연한 태도를 보입니다. 도덕적 영웅이 됩니다.', unhealthy: '독선적이고 비판적이며, 완벽주의에 사로잡혀 자신과 타인을 가혹하게 판단합니다.', wings: '9번 날개(이상주의자) 또는 2번 날개(옹호자)', growth: '7번(낙천가) 방향 — 즐거움과 자발성을 배움', stress: '4번(예술가) 방향 — 감정적이고 우울해짐', mbti: ['ISTJ', 'ESTJ'] },
  { num: 2, name: '조력가', sub: 'Helper', emoji: '💕', color: 'orange', colorHex: '#f97316', traits: '배려, 관대, 소유욕', motivation: '사랑받고 필요한 존재가 되고자 하는 욕구', fear: '사랑받을 가치가 없는 존재가 되는 것', healthy: '진정으로 이타적이고 무조건적으로 사랑하며, 다른 사람의 성장을 돕습니다.', unhealthy: '소유욕이 강해지고 조종적이 되며, 자신의 희생을 내세워 죄책감을 유발합니다.', wings: '1번 날개(봉사자) 또는 3번 날개(매력가)', growth: '4번(예술가) 방향 — 자기 감정을 인식하고 돌봄', stress: '8번(도전가) 방향 — 공격적이고 지배적이 됨', mbti: ['ESFJ', 'ENFJ'] },
  { num: 3, name: '성취가', sub: 'Achiever', emoji: '🏆', color: 'yellow', colorHex: '#eab308', traits: '야심, 효율적, 이미지 의식', motivation: '가치 있고 성공한 존재로 인정받고자 하는 욕구', fear: '무가치하고 실패한 존재가 되는 것', healthy: '진정성 있고 자신감 넘치며, 다른 사람에게 영감을 주는 롤모델이 됩니다.', unhealthy: '허영심이 강해지고 기만적이 되며, 성공 이미지에 집착합니다.', wings: '2번 날개(매력가) 또는 4번 날개(전문가)', growth: '6번(충성가) 방향 — 협력과 헌신을 배움', stress: '9번(평화주의자) 방향 — 무기력해지고 회피적', mbti: ['ENTJ', 'ESTP'] },
  { num: 4, name: '예술가', sub: 'Individualist', emoji: '🎨', color: 'purple', colorHex: '#a855f7', traits: '감성적, 창의적, 자기몰두', motivation: '독특하고 특별한 존재가 되고자 하는 욕구', fear: '평범하고 존재감 없는 사람이 되는 것', healthy: '영감을 주는 창의력과 깊은 공감 능력으로 아름다움을 창조합니다.', unhealthy: '자기연민에 빠지고 질투심이 강해지며, 감정 기복이 극심해집니다.', wings: '3번 날개(귀족) 또는 5번 날개(보헤미안)', growth: '1번(개혁가) 방향 — 원칙과 절제를 배움', stress: '2번(조력가) 방향 — 집착적으로 타인에게 매달림', mbti: ['INFP', 'ISFP'] },
  { num: 5, name: '관찰자', sub: 'Investigator', emoji: '🔬', color: 'blue', colorHex: '#3b82f6', traits: '분석적, 독립적, 고립', motivation: '유능하고 지식이 풍부한 존재가 되고자 하는 욕구', fear: '무능하고 쓸모없는 존재가 되는 것', healthy: '선구적인 통찰력으로 세상을 이해하고, 복잡한 문제를 해결하는 혁신가가 됩니다.', unhealthy: '현실과 동떨어지고 은둔적이 되며, 극단적으로 고립됩니다.', wings: '4번 날개(상징주의자) 또는 6번 날개(문제해결사)', growth: '8번(도전가) 방향 — 자신감과 결단력을 배움', stress: '7번(낙천가) 방향 — 산만하고 충동적이 됨', mbti: ['INTP', 'INTJ'] },
  { num: 6, name: '충성가', sub: 'Loyalist', emoji: '🛡️', color: 'teal', colorHex: '#14b8a6', traits: '신중, 책임감, 불안', motivation: '안전하고 지지받는 환경을 확보하고자 하는 욕구', fear: '도움 없이 혼자 버려지는 것', healthy: '용감하고 신뢰할 수 있으며, 공동체를 위해 헌신하는 든든한 리더가 됩니다.', unhealthy: '불안과 의심에 사로잡혀 편집증적이 되고, 방어적으로 공격합니다.', wings: '5번 날개(방어자) 또는 7번 날개(친구)', growth: '9번(평화주의자) 방향 — 평화로움과 신뢰를 배움', stress: '3번(성취가) 방향 — 경쟁적이고 이미지에 집착', mbti: ['ISFJ', 'ISTJ'] },
  { num: 7, name: '낙천가', sub: 'Enthusiast', emoji: '🎉', color: 'amber', colorHex: '#f59e0b', traits: '즐거움, 다재다능, 산만', motivation: '행복하고 만족스러운 경험을 추구하는 욕구', fear: '고통과 결핍에 갇히는 것', healthy: '감사하고 현재에 충실하며, 다양한 재능으로 세상에 기쁨을 전파합니다.', unhealthy: '충동적이고 무절제하며, 고통을 회피하기 위해 중독에 빠집니다.', wings: '6번 날개(엔터테이너) 또는 8번 날개(현실주의자)', growth: '5번(관찰자) 방향 — 깊이와 집중을 배움', stress: '1번(개혁가) 방향 — 비판적이고 완벽주의적', mbti: ['ENFP', 'ENTP'] },
  { num: 8, name: '도전가', sub: 'Challenger', emoji: '🦁', color: 'rose', colorHex: '#f43f5e', traits: '자신감, 결단력, 지배적', motivation: '자신을 보호하고 환경을 통제하고자 하는 욕구', fear: '다른 사람에 의해 통제당하거나 약해지는 것', healthy: '관대하고 보호적이며, 약자를 위해 힘을 사용하는 영웅적 리더가 됩니다.', unhealthy: '독재적이고 파괴적이 되며, 모든 것을 지배하려 합니다.', wings: '7번 날개(독립가) 또는 9번 날개(곰)', growth: '2번(조력가) 방향 — 부드러움과 배려를 배움', stress: '5번(관찰자) 방향 — 은둔적이고 냉소적', mbti: ['ENTJ', 'ESTJ'] },
  { num: 9, name: '평화주의자', sub: 'Peacemaker', emoji: '🕊️', color: 'green', colorHex: '#22c55e', traits: '수용적, 조화, 게으름', motivation: '내면의 평화와 조화를 유지하고자 하는 욕구', fear: '갈등과 분리, 상실', healthy: '포용적이고 통합적이며, 모든 관점을 이해하는 진정한 중재자가 됩니다.', unhealthy: '수동적이고 무기력해지며, 현실을 외면하고 자아를 잃습니다.', wings: '8번 날개(심판관) 또는 1번 날개(꿈꾸는 사람)', growth: '3번(성취가) 방향 — 목표의식과 추진력을 배움', stress: '6번(충성가) 방향 — 불안하고 의심이 많아짐', mbti: ['INFP', 'ISFP'] },
]

// ─── Questions (36 total, 4 per type) ────────────────────────
interface Question {
  text: string
  type: number // 1-9
}

const QUESTIONS: Question[] = [
  // Type 1 — 개혁가
  { text: '나는 규칙과 원칙을 지키는 것이 중요하다고 생각한다.', type: 1 },
  { text: '실수나 부정확한 것을 보면 고치고 싶은 충동을 느낀다.', type: 1 },
  { text: '다른 사람들이 올바르지 않은 행동을 하면 화가 난다.', type: 1 },
  { text: '나는 항상 더 나은 사람이 되려고 노력한다.', type: 1 },
  // Type 2 — 조력가
  { text: '다른 사람을 돕는 것이 나에게 큰 기쁨을 준다.', type: 2 },
  { text: '나는 주변 사람들의 감정과 필요를 잘 파악한다.', type: 2 },
  { text: '사람들이 나에게 고마워할 때 보람을 느낀다.', type: 2 },
  { text: '나는 다른 사람의 부탁을 거절하기 어렵다.', type: 2 },
  // Type 3 — 성취가
  { text: '목표를 세우고 달성하는 것에서 에너지를 얻는다.', type: 3 },
  { text: '나는 다른 사람에게 성공적인 이미지를 보여주고 싶다.', type: 3 },
  { text: '효율성과 생산성이 나에게 매우 중요하다.', type: 3 },
  { text: '경쟁 상황에서 최선을 다해 이기려 한다.', type: 3 },
  // Type 4 — 예술가
  { text: '나는 다른 사람과는 다른 특별한 존재라고 느낀다.', type: 4 },
  { text: '감정의 깊이가 나의 강점이라고 생각한다.', type: 4 },
  { text: '아름다운 것에 강하게 끌리고 감동을 받는다.', type: 4 },
  { text: '가끔 이유 없이 우울하거나 외로움을 느낀다.', type: 4 },
  // Type 5 — 관찰자
  { text: '혼자서 깊이 생각하고 분석하는 시간이 필요하다.', type: 5 },
  { text: '나는 관심 분야에 대해 깊이 파고드는 편이다.', type: 5 },
  { text: '사회적 상황에서 에너지가 소모되는 느낌이다.', type: 5 },
  { text: '감정보다 논리와 사실에 근거해 판단한다.', type: 5 },
  // Type 6 — 충성가
  { text: '새로운 상황에서 일어날 수 있는 위험을 미리 생각한다.', type: 6 },
  { text: '신뢰할 수 있는 사람과 조직에 충성하는 편이다.', type: 6 },
  { text: '중요한 결정을 내릴 때 여러 사람의 의견을 구한다.', type: 6 },
  { text: '최악의 상황에 대비하는 것이 현명하다고 생각한다.', type: 6 },
  // Type 7 — 낙천가
  { text: '새롭고 재미있는 경험을 추구하는 편이다.', type: 7 },
  { text: '여러 가지 일을 동시에 하는 것이 즐겁다.', type: 7 },
  { text: '힘든 상황에서도 긍정적인 면을 찾으려 한다.', type: 7 },
  { text: '한 가지에 오래 집중하기보다 다양하게 경험하고 싶다.', type: 7 },
  // Type 8 — 도전가
  { text: '불공정한 상황에 맞서 싸우는 것을 두려워하지 않는다.', type: 8 },
  { text: '리더 역할을 맡아 상황을 주도하는 것이 편하다.', type: 8 },
  { text: '약한 모습을 보이는 것이 불편하다.', type: 8 },
  { text: '빠르고 과감한 결정을 내리는 편이다.', type: 8 },
  // Type 9 — 평화주의자
  { text: '갈등이 생기면 화해시키고 중재하는 역할을 한다.', type: 9 },
  { text: '나보다 다른 사람의 의견을 우선시하는 경우가 많다.', type: 9 },
  { text: '편안하고 평화로운 환경을 선호한다.', type: 9 },
  { text: '급한 결정보다는 시간을 두고 천천히 판단한다.', type: 9 },
]

// Shuffle questions deterministically by interleaving types
const SHUFFLED_ORDER: number[] = (() => {
  const byType: number[][] = Array.from({ length: 9 }, () => [])
  QUESTIONS.forEach((q, i) => byType[q.type - 1].push(i))
  const order: number[] = []
  for (let round = 0; round < 4; round++) {
    for (let t = 0; t < 9; t++) {
      order.push(byType[t][round])
    }
  }
  return order
})()

// ─── Component ───────────────────────────────────────────────
type Phase = 'intro' | 'test' | 'result'

export default function Enneagram() {
  const searchParams = useSearchParams()
  const radarRef = useRef<HTMLCanvasElement>(null)
  const shareCardRef = useRef<HTMLCanvasElement>(null)

  // URL param for direct result
  const urlType = searchParams.get('type')
  const initialPhase: Phase = urlType ? 'result' : 'intro'

  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>(new Array(36).fill(0))
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  // Compute scores
  const scores = useMemo(() => {
    const s = new Array(9).fill(0)
    QUESTIONS.forEach((q, i) => { s[q.type - 1] += answers[i] })
    return s as number[]
  }, [answers])

  const maxScore = 20
  const percentages = useMemo(() => scores.map(s => Math.round((s / maxScore) * 100)), [scores])

  const primaryType = useMemo(() => {
    if (urlType && phase === 'result') {
      const n = parseInt(urlType, 10)
      if (n >= 1 && n <= 9) return n
    }
    let maxIdx = 0
    for (let i = 1; i < 9; i++) {
      if (scores[i] > scores[maxIdx]) maxIdx = i
    }
    return maxIdx + 1
  }, [scores, urlType, phase])

  const primaryInfo = TYPES[primaryType - 1]

  // ── Clipboard ──
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* ignore */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // ── Draw Radar Chart ──
  const drawRadar = useCallback((canvas: HTMLCanvasElement, size: number, mini = false) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = (size / 2) * 0.72
    const n = 9
    const angleStep = (Math.PI * 2) / n
    const startAngle = -Math.PI / 2

    // Get point on polygon
    const pt = (i: number, radius: number) => ({
      x: cx + radius * Math.cos(startAngle + i * angleStep),
      y: cy + radius * Math.sin(startAngle + i * angleStep),
    })

    // Background rings
    const rings = [0.25, 0.5, 0.75, 1.0]
    ctx.strokeStyle = mini ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.2)'
    ctx.lineWidth = 1
    for (const frac of rings) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const p = pt(i, r * frac)
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Axis lines
    ctx.strokeStyle = mini ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)'
    for (let i = 0; i < n; i++) {
      const p = pt(i, r)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }

    // Data polygon
    const dataScores = urlType && phase === 'result' && scores.every(s => s === 0)
      ? TYPES.map((_, i) => i === primaryType - 1 ? 18 : 8 + Math.floor(Math.random() * 6))
      : scores

    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const frac = Math.max(dataScores[i] / maxScore, 0.05)
      const p = pt(i, r * frac)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(99,102,241,0.25)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(99,102,241,0.8)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Data points
    for (let i = 0; i < n; i++) {
      const frac = Math.max(dataScores[i] / maxScore, 0.05)
      const p = pt(i, r * frac)
      ctx.beginPath()
      ctx.arc(p.x, p.y, mini ? 2 : 4, 0, Math.PI * 2)
      ctx.fillStyle = TYPES[i].colorHex
      ctx.fill()
    }

    // Labels
    if (!mini) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labelR = r + 28
      for (let i = 0; i < n; i++) {
        const p = pt(i, labelR)
        ctx.font = 'bold 13px sans-serif'
        ctx.fillStyle = TYPES[i].colorHex
        ctx.fillText(`${TYPES[i].num}`, p.x, p.y - 8)
        ctx.font = '11px sans-serif'
        ctx.fillStyle = '#6b7280'
        ctx.fillText(TYPES[i].name, p.x, p.y + 8)
      }
    }
  }, [scores, primaryType, urlType, phase])

  // Draw radar on result
  useEffect(() => {
    if (phase !== 'result') return
    if (radarRef.current) drawRadar(radarRef.current, 380)
  }, [phase, drawRadar])

  // ── Navigation ──
  const currentIndex = SHUFFLED_ORDER[currentQ]

  const handleAnswer = (val: number) => {
    setAnswers(prev => {
      const next = [...prev]
      next[currentIndex] = val
      return next
    })
  }

  const canGoNext = answers[currentIndex] > 0
  const goNext = () => {
    if (currentQ < 35) setCurrentQ(currentQ + 1)
    else setPhase('result')
  }
  const goPrev = () => { if (currentQ > 0) setCurrentQ(currentQ - 1) }

  const restart = () => {
    setPhase('intro')
    setCurrentQ(0)
    setAnswers(new Array(36).fill(0))
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('type')
      window.history.replaceState({}, '', url.toString())
    }
  }

  // ── Share / Download ──
  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    url.searchParams.set('type', String(primaryType))
    return url.toString()
  }, [primaryType])

  const drawShareCard = useCallback(() => {
    const canvas = shareCardRef.current
    if (!canvas) return
    const w = 600, h = 400
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#4f46e5')
    grad.addColorStop(1, '#7c3aed')
    ctx.fillStyle = grad
    ctx.roundRect(0, 0, w, h, 16)
    ctx.fill()

    // Content
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.arc(w - 80, 80, 120, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('에니어그램 성격유형 테스트', 40, 50)

    ctx.font = '64px sans-serif'
    ctx.fillText(primaryInfo.emoji, 40, 140)

    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(`Type ${primaryType}`, 120, 135)

    ctx.font = 'bold 32px sans-serif'
    ctx.fillText(primaryInfo.name, 40, 200)

    ctx.font = '18px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(primaryInfo.sub, 40, 235)

    ctx.font = '16px sans-serif'
    ctx.fillText(primaryInfo.traits, 40, 270)

    // Mini radar in corner
    ctx.save()
    ctx.translate(w - 170, h - 150)
    const miniSize = 140
    const mr = miniSize / 2 * 0.7
    const mcx = miniSize / 2, mcy = miniSize / 2
    const angleStep = (Math.PI * 2) / 9
    const startA = -Math.PI / 2
    const mpt = (i: number, radius: number) => ({
      x: mcx + radius * Math.cos(startA + i * angleStep),
      y: mcy + radius * Math.sin(startA + i * angleStep),
    })
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < 9; i++) {
      const p = mpt(i, mr)
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.stroke()

    const ds = scores.every(s => s === 0)
      ? TYPES.map((_, i) => i === primaryType - 1 ? 18 : 8)
      : scores
    ctx.beginPath()
    for (let i = 0; i < 9; i++) {
      const frac = Math.max(ds[i] / maxScore, 0.05)
      const p = mpt(i, mr * frac)
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('toolhub.ai.kr/enneagram', 40, h - 30)
  }, [primaryType, primaryInfo, scores])

  const downloadCard = useCallback(() => {
    drawShareCard()
    const canvas = shareCardRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `enneagram-type${primaryType}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [drawShareCard, primaryType])

  const shareResult = useCallback(async () => {
    const url = getShareUrl()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `에니어그램 Type ${primaryType} — ${primaryInfo.name}`,
          text: `나의 에니어그램 유형은 ${primaryType}번 ${primaryInfo.name}(${primaryInfo.sub})입니다!`,
          url,
        })
      } catch { /* cancelled */ }
    } else {
      copyToClipboard(url, 'share')
    }
  }, [getShareUrl, primaryType, primaryInfo, copyToClipboard])

  // ─── Render ────────────────────────────────────────────────
  const likertLabels = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다']

  // Intro Phase
  if (phase === 'intro') {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            36문항 · 약 5분 소요
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            에니어그램 성격유형 테스트
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            에니어그램은 인간의 성격을 9가지 유형으로 분류하는 성격 분석 체계입니다.
            각 유형은 고유한 동기, 두려움, 강점을 가지고 있으며, 자기 이해와 성장의 도구로 활용됩니다.
          </p>
        </div>

        {/* 9 Types Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {TYPES.map(t => (
            <div key={t.num} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-1">{t.emoji}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Type {t.num}</div>
              <div className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => setPhase('test')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-8 py-4 text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            테스트 시작하기
          </button>
        </div>
      </div>
    )
  }

  // Test Phase
  if (phase === 'test') {
    const q = QUESTIONS[currentIndex]
    const progress = ((currentQ + 1) / 36) * 100

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>질문 {currentQ + 1} / 36</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-8 text-center leading-relaxed">
            {q.text}
          </p>

          {/* Likert Scale */}
          <div className="space-y-3">
            {likertLabels.map((label, idx) => {
              const val = idx + 1
              const selected = answers[currentIndex] === val
              return (
                <button
                  key={val}
                  onClick={() => handleAnswer(val)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {val}
                  </span>
                  <span className="font-medium">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={goPrev}
            disabled={currentQ === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className={`flex items-center gap-1 px-6 py-2.5 rounded-lg font-medium transition-all ${
              canGoNext
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentQ === 35 ? '결과 보기' : '다음'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ─── Result Phase ──────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Primary Type Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white text-center">
        <div className="text-6xl mb-3">{primaryInfo.emoji}</div>
        <div className="text-lg opacity-80 mb-1">당신의 에니어그램 유형은</div>
        <h2 className="text-4xl font-bold mb-1">Type {primaryType} — {primaryInfo.name}</h2>
        <div className="text-xl opacity-80">{primaryInfo.sub}</div>
        <div className="mt-3 inline-block bg-white/20 rounded-full px-4 py-1 text-sm">
          {primaryInfo.traits}
        </div>
      </div>

      {/* Radar + Scores Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Radar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">유형별 점수 분포</h3>
          <div className="flex justify-center">
            <canvas ref={radarRef} style={{ width: 380, height: 380 }} />
          </div>
        </div>

        {/* Score Bars */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">유형별 점수</h3>
          <div className="space-y-3">
            {TYPES.map((t, i) => {
              const pct = percentages[i]
              const isPrimary = t.num === primaryType
              return (
                <div key={t.num} className="flex items-center gap-3">
                  <div className="w-8 text-center text-lg">{t.emoji}</div>
                  <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {t.num}. {t.name}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-5 relative">
                      <div
                        className="h-5 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: t.colorHex,
                          opacity: isPrimary ? 1 : 0.6,
                        }}
                      />
                    </div>
                  </div>
                  <div className={`w-12 text-right text-sm font-bold ${isPrimary ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Type Detail */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Type {primaryType} {primaryInfo.name} 상세 분석
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">핵심 동기</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.motivation}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">기본 두려움</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.fear}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">건강한 상태</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.healthy}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">불건강한 상태</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.unhealthy}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">날개</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.wings}</div>
          </div>
          <div className="bg-teal-50 dark:bg-teal-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-1">성장 방향</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.growth}</div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950 rounded-xl p-4">
            <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">스트레스 방향</div>
            <div className="text-gray-800 dark:text-gray-200 text-sm">{primaryInfo.stress}</div>
          </div>
        </div>

        {/* MBTI Connection */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">관련 MBTI 유형</div>
          <div className="flex gap-3">
            {primaryInfo.mbti.map(m => (
              <span key={m} className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold text-lg">
                {m}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            * MBTI와 에니어그램은 서로 다른 체계이며, 위 연계는 통계적 상관관계입니다.
          </p>
        </div>
      </div>

      {/* Share Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">결과 공유</h3>
        <canvas ref={shareCardRef} className="hidden" />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => copyToClipboard(getShareUrl(), 'link')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copiedId === 'link' ? '복사됨!' : '링크 복사'}
          </button>
          <button
            onClick={downloadCard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download className="w-4 h-4" /> 이미지 저장
          </button>
          <button
            onClick={shareResult}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            <Share2 className="w-4 h-4" /> 공유하기
          </button>
          <button
            onClick={restart}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> 다시 하기
          </button>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">에니어그램 가이드</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
        </button>

        {guideOpen && (
          <div className="mt-6 space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">에니어그램이란?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                에니어그램(Enneagram)은 그리스어 &apos;아홉&apos;(ennea)과 &apos;그림&apos;(gramma)에서 유래한 성격 유형 체계입니다.
                인간의 성격을 9가지 기본 유형으로 분류하며, 각 유형은 고유한 세계관, 동기, 두려움을 가지고 있습니다.
                단순한 성격 분류를 넘어 자기 이해, 대인관계 개선, 개인 성장의 도구로 널리 활용됩니다.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">9가지 유형 한눈에 보기</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                {TYPES.map(t => (
                  <div key={t.num} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{t.emoji}</span>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{t.num}. {t.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.traits}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">결과 활용 팁</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-disc list-inside">
                <li>에니어그램 유형은 고정된 것이 아니라 성장과 스트레스에 따라 변화합니다.</li>
                <li>날개(인접 유형)의 영향도 고려하면 더 정확한 자기 이해가 가능합니다.</li>
                <li>모든 유형에는 건강한 상태와 불건강한 상태가 있으며, 성장 방향을 의식하세요.</li>
                <li>대인관계에서 상대방의 유형을 이해하면 소통이 원활해집니다.</li>
                <li>이 테스트는 참고용이며, 전문 상담을 대체하지 않습니다.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
