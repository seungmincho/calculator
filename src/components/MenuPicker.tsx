'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Search, Copy, Check, ChevronDown, ChevronUp, Shuffle, BookOpen } from 'lucide-react'

// ── Food Database (200+ items, 10 categories) ──
interface FoodItem {
  name: string
  emoji: string
}

const FOOD_DB: Record<string, { emoji: string; items: FoodItem[] }> = {
  korean: {
    emoji: '🍚',
    items: [
      { name: '김치찌개', emoji: '🍲' }, { name: '된장찌개', emoji: '🍲' },
      { name: '비빔밥', emoji: '🍚' }, { name: '볶음밥', emoji: '🍳' },
      { name: '김밥', emoji: '🍙' }, { name: '냉면', emoji: '🍜' },
      { name: '삼계탕', emoji: '🐔' }, { name: '제육볶음', emoji: '🍖' },
      { name: '순두부찌개', emoji: '🍲' }, { name: '갈비탕', emoji: '🍖' },
      { name: '칼국수', emoji: '🍜' }, { name: '쌈밥', emoji: '🥬' },
      { name: '감자탕', emoji: '🍲' }, { name: '부대찌개', emoji: '🍲' },
      { name: '잡채', emoji: '🍝' }, { name: '해물탕', emoji: '🦐' },
      { name: '떡갈비', emoji: '🥩' }, { name: '콩나물국밥', emoji: '🍲' },
      { name: '설렁탕', emoji: '🍲' }, { name: '갈비찜', emoji: '🍖' },
      { name: '청국장', emoji: '🍲' }, { name: '돌솥비빔밥', emoji: '🍚' },
      { name: '오징어볶음', emoji: '🦑' }, { name: '두부김치', emoji: '🥬' },
      { name: '소머리국밥', emoji: '🍲' }, { name: '곰탕', emoji: '🍲' },
      { name: '육개장', emoji: '🍲' }, { name: '미역국', emoji: '🍲' },
      { name: '떡국', emoji: '🍲' }, { name: '잔치국수', emoji: '🍜' },
      { name: '수제비', emoji: '🍜' }, { name: '닭볶음탕', emoji: '🍗' },
      { name: '해물파전', emoji: '🥞' }, { name: '김치볶음밥', emoji: '🍳' },
      { name: '제육덮밥', emoji: '🍚' }, { name: '된장비빔밥', emoji: '🍚' },
    ],
  },
  meat: {
    emoji: '🥩',
    items: [
      { name: '삼겹살', emoji: '🥓' }, { name: '불고기', emoji: '🥩' },
      { name: '소갈비', emoji: '🍖' }, { name: '목살', emoji: '🥩' },
      { name: '항정살', emoji: '🥩' }, { name: '차돌박이', emoji: '🥩' },
      { name: '양념갈비', emoji: '🍖' }, { name: '곱창', emoji: '🫕' },
      { name: '대패삼겹살', emoji: '🥓' }, { name: '닭갈비', emoji: '🍗' },
      { name: '제주흑돼지', emoji: '🥩' }, { name: '갈매기살', emoji: '🥩' },
      { name: '족발', emoji: '🍖' }, { name: '보쌈', emoji: '🥬' },
      { name: '막창', emoji: '🫕' }, { name: '소고기구이', emoji: '🥩' },
      { name: '양꼬치', emoji: '🍢' }, { name: '떡갈비', emoji: '🥩' },
      { name: '찜닭', emoji: '🍗' }, { name: '수육', emoji: '🍖' },
      { name: '뼈해장국', emoji: '🍲' }, { name: '돼지갈비', emoji: '🍖' },
      { name: '등심스테이크', emoji: '🥩' }, { name: '채끝스테이크', emoji: '🥩' },
    ],
  },
  seafood: {
    emoji: '🐟',
    items: [
      { name: '회/초밥', emoji: '🍣' }, { name: '매운탕', emoji: '🍲' },
      { name: '조개구이', emoji: '🐚' }, { name: '해물찜', emoji: '🦀' },
      { name: '생선구이', emoji: '🐟' }, { name: '새우튀김', emoji: '🍤' },
      { name: '꽃게탕', emoji: '🦀' }, { name: '아귀찜', emoji: '🐟' },
      { name: '전복죽', emoji: '🍲' }, { name: '굴전', emoji: '🦪' },
      { name: '간장게장', emoji: '🦀' }, { name: '양념게장', emoji: '🦀' },
      { name: '낙지볶음', emoji: '🐙' }, { name: '오징어순대', emoji: '🦑' },
      { name: '대하구이', emoji: '🦐' }, { name: '장어구이', emoji: '🐟' },
      { name: '생선회', emoji: '🐟' }, { name: '해물칼국수', emoji: '🍜' },
      { name: '조개탕', emoji: '🐚' }, { name: '참치회', emoji: '🍣' },
      { name: '연어덮밥', emoji: '🍣' }, { name: '광어회', emoji: '🐟' },
    ],
  },
  chinese: {
    emoji: '🥡',
    items: [
      { name: '짜장면', emoji: '🍜' }, { name: '짬뽕', emoji: '🍜' },
      { name: '탕수육', emoji: '🍖' }, { name: '마라탕', emoji: '🌶️' },
      { name: '마파두부', emoji: '🫕' }, { name: '깐풍기', emoji: '🍗' },
      { name: '중국식볶음밥', emoji: '🍳' }, { name: '유린기', emoji: '🍗' },
      { name: '팔보채', emoji: '🥘' }, { name: '라조기', emoji: '🍗' },
      { name: '잡탕밥', emoji: '🍚' }, { name: '고추잡채', emoji: '🌶️' },
      { name: '마라샹궈', emoji: '🌶️' }, { name: '꿔바로우', emoji: '🍖' },
      { name: '양장피', emoji: '🥗' }, { name: '울면', emoji: '🍜' },
      { name: '잡채밥', emoji: '🍚' }, { name: '유산슬', emoji: '🥘' },
      { name: '칠리새우', emoji: '🦐' }, { name: '멘보샤', emoji: '🍤' },
    ],
  },
  japanese: {
    emoji: '🍣',
    items: [
      { name: '초밥', emoji: '🍣' }, { name: '라멘', emoji: '🍜' },
      { name: '돈카츠', emoji: '🥩' }, { name: '우동', emoji: '🍜' },
      { name: '규동', emoji: '🍚' }, { name: '소바', emoji: '🍝' },
      { name: '카레', emoji: '🍛' }, { name: '오코노미야키', emoji: '🥞' },
      { name: '타코야키', emoji: '🐙' }, { name: '텐동', emoji: '🍤' },
      { name: '카츠동', emoji: '🍚' }, { name: '야키토리', emoji: '🍢' },
      { name: '사시미', emoji: '🐟' }, { name: '오니기리', emoji: '🍙' },
      { name: '나베', emoji: '🍲' }, { name: '차슈덮밥', emoji: '🍚' },
      { name: '에비텐동', emoji: '🍤' }, { name: '규카츠', emoji: '🥩' },
      { name: '연어덮밥', emoji: '🍣' }, { name: '스키야키', emoji: '🍲' },
    ],
  },
  western: {
    emoji: '🍝',
    items: [
      { name: '파스타', emoji: '🍝' }, { name: '피자', emoji: '🍕' },
      { name: '스테이크', emoji: '🥩' }, { name: '햄버거', emoji: '🍔' },
      { name: '리조또', emoji: '🍚' }, { name: '샐러드', emoji: '🥗' },
      { name: '샌드위치', emoji: '🥪' }, { name: '오믈렛', emoji: '🥚' },
      { name: '그라탕', emoji: '🧀' }, { name: '브런치', emoji: '🥞' },
      { name: '뇨끼', emoji: '🍝' }, { name: '립스테이크', emoji: '🥩' },
      { name: '크림파스타', emoji: '🍝' }, { name: '로제파스타', emoji: '🍝' },
      { name: '까르보나라', emoji: '🍝' }, { name: '봉골레', emoji: '🍝' },
      { name: '라자냐', emoji: '🧀' }, { name: '필레미뇽', emoji: '🥩' },
      { name: '치킨텐더', emoji: '🍗' }, { name: '피쉬앤칩스', emoji: '🐟' },
      { name: '타코', emoji: '🌮' }, { name: '부리또', emoji: '🌯' },
    ],
  },
  snack: {
    emoji: '🍢',
    items: [
      { name: '떡볶이', emoji: '🌶️' }, { name: '순대', emoji: '🌭' },
      { name: '어묵', emoji: '🍢' }, { name: '튀김', emoji: '🍤' },
      { name: '라면', emoji: '🍜' }, { name: '만두', emoji: '🥟' },
      { name: '핫도그', emoji: '🌭' }, { name: '토스트', emoji: '🍞' },
      { name: '컵밥', emoji: '🍚' }, { name: '김치전', emoji: '🥞' },
      { name: '떡꼬치', emoji: '🍢' }, { name: '치즈볼', emoji: '🧀' },
      { name: '감자튀김', emoji: '🍟' }, { name: '떡순이', emoji: '🌶️' },
      { name: '라볶이', emoji: '🍜' }, { name: '계란빵', emoji: '🥚' },
      { name: '군고구마', emoji: '🍠' }, { name: '닭꼬치', emoji: '🍢' },
      { name: '주먹밥', emoji: '🍙' }, { name: '쫄면', emoji: '🍜' },
    ],
  },
  chicken: {
    emoji: '🍗',
    items: [
      { name: '후라이드치킨', emoji: '🍗' }, { name: '양념치킨', emoji: '🍗' },
      { name: '간장치킨', emoji: '🍗' }, { name: '마늘치킨', emoji: '🍗' },
      { name: '파닭', emoji: '🍗' }, { name: '치킨+맥주', emoji: '🍺' },
      { name: '순살치킨', emoji: '🍗' }, { name: '닭강정', emoji: '🍗' },
      { name: '뿌링클', emoji: '🍗' }, { name: '허니콤보', emoji: '🍗' },
      { name: '교촌치킨', emoji: '🍗' }, { name: '굽네치킨', emoji: '🍗' },
      { name: 'BBQ치킨', emoji: '🍗' }, { name: 'BHC치킨', emoji: '🍗' },
      { name: '네네치킨', emoji: '🍗' }, { name: '치킨윙', emoji: '🍗' },
    ],
  },
  fastfood: {
    emoji: '🍔',
    items: [
      { name: '맥도날드', emoji: '🍔' }, { name: '버거킹', emoji: '🍔' },
      { name: 'KFC', emoji: '🍗' }, { name: '서브웨이', emoji: '🥪' },
      { name: '맘스터치', emoji: '🍔' }, { name: '롯데리아', emoji: '🍔' },
      { name: '파이브가이즈', emoji: '🍔' }, { name: '쉐이크쉑', emoji: '🍔' },
      { name: '피자헛', emoji: '🍕' }, { name: '도미노피자', emoji: '🍕' },
      { name: '미스터피자', emoji: '🍕' }, { name: '타코벨', emoji: '🌮' },
      { name: '노브랜드버거', emoji: '🍔' }, { name: '이삭토스트', emoji: '🍞' },
    ],
  },
  asian: {
    emoji: '🍜',
    items: [
      { name: '쌀국수', emoji: '🍜' }, { name: '팟타이', emoji: '🍝' },
      { name: '나시고렝', emoji: '🍚' }, { name: '반미', emoji: '🥖' },
      { name: '월남쌈', emoji: '🥬' }, { name: '똠양꿍', emoji: '🍲' },
      { name: '분짜', emoji: '🍜' }, { name: '카오팟', emoji: '🍚' },
      { name: '그린커리', emoji: '🍛' }, { name: '사테', emoji: '🍢' },
      { name: '볶음국수', emoji: '🍜' }, { name: '미고렝', emoji: '🍜' },
      { name: '똠카가이', emoji: '🍲' }, { name: '카오소이', emoji: '🍜' },
      { name: '소고기쌀국수', emoji: '🍜' }, { name: '탄탄면', emoji: '🍜' },
      { name: '마살라커리', emoji: '🍛' }, { name: '비리야니', emoji: '🍚' },
      { name: '난+커리', emoji: '🍛' }, { name: '훠궈', emoji: '🍲' },
    ],
  },
}

const ALL_CATEGORIES = Object.keys(FOOD_DB)

const SITUATION_PRESETS: Record<string, string[]> = {
  any: ALL_CATEGORIES,
  solo: ['korean', 'snack', 'chicken', 'fastfood', 'japanese'],
  group: ['korean', 'meat', 'chinese', 'chicken', 'seafood'],
  date: ['japanese', 'western', 'asian', 'seafood', 'meat'],
  lateNight: ['chicken', 'snack', 'chinese', 'korean', 'fastfood'],
  hangover: ['korean'],
  diet: ['japanese', 'western', 'asian', 'korean', 'seafood'],
}

// Hangover-specific curated items
const HANGOVER_ITEMS: FoodItem[] = [
  { name: '해장국', emoji: '🍲' }, { name: '순두부찌개', emoji: '🍲' },
  { name: '콩나물해장국', emoji: '🍲' }, { name: '북어해장국', emoji: '🍲' },
  { name: '라면', emoji: '🍜' }, { name: '칼국수', emoji: '🍜' },
  { name: '설렁탕', emoji: '🍲' }, { name: '국밥', emoji: '🍚' },
  { name: '된장찌개', emoji: '🍲' }, { name: '뼈해장국', emoji: '🍲' },
  { name: '김치찌개', emoji: '🍲' }, { name: '우동', emoji: '🍜' },
  { name: '소머리국밥', emoji: '🍲' }, { name: '육개장', emoji: '🍲' },
  { name: '감자탕', emoji: '🍲' }, { name: '떡국', emoji: '🍲' },
]

// Colors for wheel segments
const SEGMENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#F8C471', '#82E0AA',
  '#BB8FCE', '#85C1E9', '#F1948A', '#73C6B6',
]

const WHEEL_ITEM_COUNT = 10

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getInitialWheelItems(): FoodItem[] {
  const pool = Object.values(FOOD_DB).flatMap(cat => cat.items)
  return shuffleArray(pool).slice(0, WHEEL_ITEM_COUNT)
}

export default function MenuPicker() {
  const t = useTranslations('menuPicker')

  // State
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES))
  const [situation, setSituation] = useState<string>('any')
  const [wheelItems, setWheelItems] = useState<FoodItem[]>(getInitialWheelItems)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<FoodItem | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [history, setHistory] = useState<FoodItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [canvasSize, setCanvasSize] = useState(380)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('menuPicker_favorites') || '[]')
    } catch { return [] }
  })
  const [eatenToday, setEatenToday] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(sessionStorage.getItem('menuPicker_eaten') || '[]')
    } catch { return [] }
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const pendingSpinRef = useRef(false)

  // Pool of items based on selected categories and situation (excluding eaten today)
  const itemPool = useMemo(() => {
    let pool: FoodItem[]
    if (situation === 'hangover') {
      pool = HANGOVER_ITEMS
    } else {
      pool = []
      selectedCategories.forEach(cat => {
        if (FOOD_DB[cat]) pool.push(...FOOD_DB[cat].items)
      })
    }
    return eatenToday.length > 0 ? pool.filter(item => !eatenToday.includes(item.name)) : pool
  }, [selectedCategories, situation, eatenToday])

  // Pick items for the wheel
  const pickWheelItems = useCallback(() => {
    if (itemPool.length === 0) return []
    const count = Math.min(WHEEL_ITEM_COUNT, itemPool.length)
    return shuffleArray(itemPool).slice(0, count)
  }, [itemPool])

  // Update wheel items when pool changes
  useEffect(() => {
    setWheelItems(pickWheelItems())
  }, [pickWheelItems])

  // Responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 48, 420)
      setCanvasSize(Math.max(280, w))
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Setup canvas DPR (only when size changes)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    canvas.style.width = `${canvasSize}px`
    canvas.style.height = `${canvasSize}px`
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }, [canvasSize])

  // ── Canvas Drawing ──
  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current
    if (!canvas || wheelItems.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvasSize
    const center = size / 2
    const outerR = center - 18
    const innerR = 32
    const n = wheelItems.length
    const segAngle = (Math.PI * 2) / n

    ctx.clearRect(0, 0, size, size)

    // Outer shadow
    ctx.save()
    ctx.shadowBlur = 20
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.arc(center, center, outerR + 4, 0, Math.PI * 2)
    ctx.fillStyle = '#2d3436'
    ctx.fill()
    ctx.restore()

    // Draw segments
    for (let i = 0; i < n; i++) {
      const startA = -Math.PI / 2 + i * segAngle + rotation
      const endA = startA + segAngle

      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, outerR, startA, endA)
      ctx.closePath()

      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
      const grad = ctx.createRadialGradient(center, center, innerR, center, center, outerR)
      grad.addColorStop(0, lightenColor(color, 30))
      grad.addColorStop(1, color)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Text
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(startA + segAngle / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      const fontSize = size < 320 ? 11 : size < 380 ? 13 : 14
      ctx.font = `bold ${fontSize}px "Noto Sans KR", system-ui, sans-serif`
      ctx.fillText(`${wheelItems[i].emoji} ${wheelItems[i].name}`, outerR - 18, 0)
      ctx.restore()
    }

    // Outer rim
    ctx.beginPath()
    ctx.arc(center, center, outerR + 4, 0, Math.PI * 2)
    ctx.strokeStyle = '#2d3436'
    ctx.lineWidth = 5
    ctx.stroke()

    // Gold tick dots
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + i * segAngle + rotation
      const x = center + (outerR + 4) * Math.cos(angle)
      const y = center + (outerR + 4) * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd700'
      ctx.fill()
      ctx.strokeStyle = '#b8860b'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    // Center circle
    const cGrad = ctx.createRadialGradient(center, center, 0, center, center, innerR)
    cGrad.addColorStop(0, '#ffffff')
    cGrad.addColorStop(1, '#f0f0f0')
    ctx.beginPath()
    ctx.arc(center, center, innerR, 0, Math.PI * 2)
    ctx.fillStyle = cGrad
    ctx.fill()
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2
    ctx.stroke()

    // Center emoji
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.font = `${size < 320 ? 18 : 22}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🍽️', center, center)

    // Pointer (fixed at top)
    const tipY = center - outerR - 2
    ctx.beginPath()
    ctx.moveTo(center, tipY + 26)
    ctx.lineTo(center - 14, tipY)
    ctx.lineTo(center + 14, tipY)
    ctx.closePath()
    ctx.fillStyle = '#e74c3c'
    ctx.fill()
    ctx.strokeStyle = '#c0392b'
    ctx.lineWidth = 2
    ctx.stroke()

    // Pointer highlight
    ctx.beginPath()
    ctx.moveTo(center, tipY + 22)
    ctx.lineTo(center - 8, tipY + 5)
    ctx.lineTo(center + 2, tipY + 5)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fill()
  }, [wheelItems, canvasSize])

  // Redraw on wheel change
  useEffect(() => {
    drawWheel(rotationRef.current)
  }, [drawWheel])

  // ── Spin Logic ──
  const spin = useCallback(() => {
    if (spinning || wheelItems.length === 0) return
    setSpinning(true)
    setResult(null)
    setShowResult(false)

    const totalRotation = Math.PI * 2 * (8 + Math.random() * 7) + Math.random() * Math.PI * 2
    const duration = 5000 + Math.random() * 2000
    const startTime = performance.now()
    const startRotation = rotationRef.current
    const targetRotation = startRotation + totalRotation

    const animate = (time: number) => {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)

      rotationRef.current = startRotation + (targetRotation - startRotation) * eased
      drawWheel(rotationRef.current)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        const n = wheelItems.length
        const segAngle = (Math.PI * 2) / n
        const normalizedRot = (((-rotationRef.current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const idx = Math.floor(normalizedRot / segAngle) % n
        const winner = wheelItems[idx]

        setResult(winner)
        setTimeout(() => setShowResult(true), 100)
        setHistory(prev => [winner, ...prev.slice(0, 9)])
        setSpinning(false)

        if (navigator.vibrate) navigator.vibrate(100)
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [spinning, wheelItems, drawWheel])

  // Handle pending respin after wheelItems update
  useEffect(() => {
    if (pendingSpinRef.current && wheelItems.length > 0 && !spinning) {
      pendingSpinRef.current = false
      spin()
    }
  }, [wheelItems, spin, spinning])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ── Handlers ──
  const handleSituation = useCallback((sit: string) => {
    setSituation(sit)
    setSelectedCategories(new Set(SITUATION_PRESETS[sit] || ALL_CATEGORIES))
  }, [])

  const handleCategoryToggle = useCallback((cat: string) => {
    setSituation('any')
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])

  const handleShuffle = useCallback(() => {
    if (spinning) return
    setWheelItems(pickWheelItems())
    setResult(null)
    setShowResult(false)
  }, [spinning, pickWheelItems])

  const handleRespin = useCallback(() => {
    setWheelItems(pickWheelItems())
    pendingSpinRef.current = true
  }, [pickWheelItems])

  const copyResult = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedId('result')
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const toggleFavorite = useCallback((name: string) => {
    setFavorites(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      try { localStorage.setItem('menuPicker_favorites', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const markEatenToday = useCallback((name: string) => {
    setEatenToday(prev => {
      if (prev.includes(name)) return prev
      const next = [...prev, name]
      try { sessionStorage.setItem('menuPicker_eaten', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const situationKeys = ['any', 'solo', 'group', 'date', 'lateNight', 'hangover', 'diet'] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Situation Chips */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
          {t('situation')}
        </p>
        <div className="flex flex-wrap gap-2">
          {situationKeys.map(s => (
            <button
              key={s}
              onClick={() => handleSituation(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                situation === s
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`situations.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
          {t('categories')}
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                selectedCategories.has(cat)
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <span>{FOOD_DB[cat].emoji}</span>
              <span>{t(`categoryLabels.${cat}`)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {t('itemCount', { count: itemPool.length })}
        </p>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            ⭐ 즐겨찾기
          </p>
          <div className="flex flex-wrap gap-2">
            {favorites.map(name => (
              <div key={name} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                <span>{name}</span>
                <button
                  onClick={() => toggleFavorite(name)}
                  className="text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-100 leading-none ml-0.5"
                  title="즐겨찾기 해제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roulette Wheel */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="cursor-pointer"
            onClick={spin}
            style={{ width: canvasSize, height: canvasSize }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleShuffle}
            disabled={spinning}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-all text-sm font-medium"
          >
            <Shuffle className="w-4 h-4" />
            {t('shuffle')}
          </button>
          <button
            onClick={spin}
            disabled={spinning || wheelItems.length === 0}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-white text-lg transition-all shadow-lg ${
              spinning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:shadow-xl hover:scale-105 active:scale-95'
            }`}
          >
            {spinning ? t('spinning') : t('spin')}
          </button>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-500 ${
            showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3">
            <p className="text-white font-semibold text-sm">{t('result')}</p>
          </div>
          <div className="p-6 text-center">
            <div className="text-5xl mb-3">{result.emoji}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {result.name}
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={handleRespin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium hover:from-orange-600 hover:to-red-600 transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                {t('respin')}
              </button>
              <a
                href={`https://map.naver.com/v5/search/${encodeURIComponent(result.name + ' 맛집')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-all text-sm"
              >
                <Search className="w-4 h-4" />
                {t('searchNaver')}
              </a>
              <button
                onClick={() => copyResult(result.name)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
              >
                {copiedId === 'result' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copiedId === 'result' ? t('copied') : t('copy')}
              </button>
              <button
                onClick={() => markEatenToday(result.name)}
                disabled={eatenToday.includes(result.name)}
                className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {eatenToday.includes(result.name) ? '오늘 제외됨' : '오늘 이미 먹었어요'}
              </button>
              <button
                onClick={() => toggleFavorite(result.name)}
                className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
              >
                {favorites.includes(result.name) ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}
              </button>
            </div>
            {eatenToday.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">오늘 제외:</span>
                {eatenToday.map(name => (
                  <span key={name} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full line-through">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            {t('history')}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {history.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                  i === 0
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-1 ring-orange-300 dark:ring-orange-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-expanded={showGuide}
        >
          <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </span>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.section1.title')}
              </h3>
              <ul className="space-y-1">
                {(t.raw('guide.section1.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.section2.title')}
              </h3>
              <ul className="space-y-1">
                {(t.raw('guide.section2.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('faqTitle')}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <details key={i} className="group">
              <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                {t(`faq.q${i}.question`)}
              </summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-orange-300 dark:border-orange-700">
                {t(`faq.q${i}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helper ──
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent))
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent))
  const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent))
  return `rgb(${r},${g},${b})`
}
