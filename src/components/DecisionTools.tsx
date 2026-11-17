'use client'

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/decisionTools'
import {
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Eye,
  Download,
} from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { shuffle } from '@/utils/password' // Fisher–Yates (sort+random은 편향)
import MealHistoryPanel from '@/components/MealHistoryPanel'
import MealPlanPanel from '@/components/MealPlanPanel'
import MenuRoundExclusions from '@/components/MenuRoundExclusions'
import MobileResultLink from '@/components/MobileResultLink'
import DecisionResultCopyRecovery from '@/components/DecisionResultCopyRecovery'
import { createOrderRevealController, isOrderBusy, canRevealNext, canRevealAll, canExportOrder, type OrderRevealSnapshot } from '@/utils/orderReveal'
import { copyDecisionResult, createDecisionResultDownloads, createDecisionResultGuard, createOrderResultSnapshot, createRouletteResultSnapshot, type DecisionResultSnapshot } from '@/utils/decisionResultActions'
import { useHydrated } from '@/hooks/useHydrated'
import { MEAL_HISTORY_KEY, MAX_MEAL_RECORDS, parseMealHistory, excludedMeals, localDateKey, dateNumber, type MealRecord, type MealHistory } from '@/utils/mealHistory'
import { createMenuRoundExclusions, updateMenuRoundContext, excludeMenuRoundName, restoreMenuRoundName, restoreAllMenuRoundNames, createMenuSpinGuard, type MenuRoundChange } from '@/utils/menuRoundExclusions'

interface DecisionToolsProps {
  initialTab?: 'roulette' | 'order'
  /** 단일 도구 모드: 탭 전환기를 숨기고 initialTab 도구만 노출 (전용 랜딩 페이지용) */
  single?: boolean
  /** 메뉴 전용: 빠른 식사 선택과 돌리기를 후보 편집보다 먼저 배치 */
  menuMode?: boolean
  /** URL 파라미터가 없을 때 룰렛 기본 항목으로 적용할 프리셋 (예: 메뉴 룰렛 → '저녁메뉴') */
  defaultPreset?: keyof typeof PRESETS
}

const WHEEL_COLORS = [
  '#EF4444', // red
  '#3B82F6', // blue
  '#22C55E', // green
  '#F97316', // orange
  '#A855F7', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F59E0B', // amber
]

const PRESETS: Record<string, string[]> = {
  저녁메뉴: ['삼겹살', '치킨', '피자', '파스타', '초밥', '국밥', '찜닭', '부대찌개', '마라탕', '쌀국수', '족발', '보쌈'],
  점심메뉴: ['김치찌개', '제육볶음', '돈까스', '비빔밥', '냉면', '라멘', '짜장면', '짬뽕', '우동', '덮밥', '샐러드', '김밥'],
  한식: ['된장찌개', '불고기', '비빔밥', '삼계탕', '순두부찌개', '갈비탕', '제육볶음', '냉면'],
  중식: ['짜장면', '짬뽕', '탕수육', '볶음밥', '마파두부', '깐풍기', '유린기', '양장피'],
  일식: ['초밥', '라멘', '우동', '돈카츠', '규동', '텐동', '가츠동', '소바'],
  양식: ['피자', '파스타', '스테이크', '리조또', '버거', '오므라이스', '그라탱', '샐러드'],
  분식: ['떡볶이', '순대', '튀김', '라면', '김밥', '만두', '어묵', '쫄면'],
  야식배달: ['치킨', '피자', '족발', '보쌈', '곱창', '마라탕', '떡볶이', '햄버거'],
  카페: ['아메리카노', '카페라떼', '케이크', '와플', '빙수', '마카롱', '스무디', '쿠키'],
  벌칙: ['노래 한 곡', '춤 한 번', '커피 사기', '청소당번', '발표하기', '간식 사기'],
}

// 프리셋 버튼 라벨 번역 키(presets.*). PRESETS 키·항목은 defaultPreset·URL 과 맞물린 데이터라 한국어 그대로 둔다.
const PRESET_LABEL: Record<string, string> = {
  저녁메뉴: 'dinner', 점심메뉴: 'lunch', 한식: 'korean', 중식: 'chinese', 일식: 'japanese', 양식: 'western', 분식: 'bunsik', 야식배달: 'lateNight', 카페: 'cafe', 벌칙: 'penalty',
}

// confetti colours
const CONFETTI_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899']

interface Confetti {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  alpha: number
}

export default function DecisionTools({ initialTab = 'roulette', single = false, menuMode = false, defaultPreset }: DecisionToolsProps) {
  const t = useTranslations('decisionTools')
  const defaultParticipants = [1, 2, 3, 4].map(n => t('common.participant', { n }))
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'roulette' | 'order'>(initialTab)
  const mounted = useRef(false), tabRef = useRef(activeTab)
  const [copiedTarget, setCopiedTarget] = useState<'roulette' | 'order' | null>(null)
  const [copyPending, setCopyPending] = useState(false)
  const [copyRecovery, setCopyRecovery] = useState<{ snapshot: DecisionResultSnapshot; request: number } | null>(null)
  const [downloadError, setDownloadError] = useState(false)
  const copyGuard = useRef(createDecisionResultGuard())
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downloads = useRef<ReturnType<typeof createDecisionResultDownloads> | null>(null)
  const orderCopyRef = useRef<HTMLButtonElement>(null), rouletteCopyRef = useRef<HTMLButtonElement>(null), drawRef = useRef<HTMLButtonElement>(null)
  const revealFocus = useRef<'copy' | 'draw' | null>(null)
  const recoveryFocus = useRef<'roulette' | 'order' | null>(null)
  const invalidateCopy = useCallback(() => {
    copyGuard.current.invalidate()
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopiedTarget(null); setCopyPending(false); setCopyRecovery(null)
  }, [])

  // ─── Roulette state ───────────────────────────────────────────────────────
  // 초기값은 결정적 기본값(정적 HTML = 첫 클라이언트 렌더). 공유 링크 파라미터는 마운트 후 적용.
  const [rouletteItems, setRouletteItems] = useState<string[]>(() =>
    defaultPreset ? PRESETS[defaultPreset].slice(0, 12) : defaultParticipants
  )
  const [canvasSize, setCanvasSize] = useState(300)
  const [newRouletteItem, setNewRouletteItem] = useState('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [spinResult, setSpinResult] = useState<string | null>(null)
  const [spinHistory, setSpinHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [rouletteRun, setRouletteRun] = useState(0)
  const rouletteRunRef = useRef(0), rouletteResultRef = useRef<string | null>(null), spinningRef = useRef(false)
  const [spinGuard] = useState(createMenuSpinGuard)
  const menuSpinRef = useRef<HTMLButtonElement>(null), menuFocusRevision = useRef<number | null>(null)
  const clearRouletteResult = useCallback(() => {
    spinGuard.invalidate()
    rouletteResultRef.current = null; setSpinResult(null)
    setRouletteRun(++rouletteRunRef.current); invalidateCopy()
  }, [invalidateCopy, spinGuard])
  const [wheelSaved, setWheelSaved] = useState(false)
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [excludeDays, setExcludeDays] = useState<0 | 1 | 7>(1)
  const [mealReady, setMealReady] = useState(false)
  const [mealRaw, setMealRaw] = useState<string | null | undefined>(undefined)
  const [today, setToday] = useState('')
  const [mealError, setMealError] = useState('')
  const [mealNotice, setMealNotice] = useState('')
  const hydrated = useHydrated()
  if (hydrated && menuMode && !mealReady) {
    try { const raw = localStorage.getItem(MEAL_HISTORY_KEY); const saved = parseMealHistory(raw); setMeals(saved.records); setExcludeDays(saved.excludeDays); setMealRaw(raw) }
    catch { setMealError('weekly.storageFailed') }
    setToday(localDateKey()); setMealReady(true)
  }
  useEffect(() => {
    if (!menuMode) return
    const update = () => { if (!isSpinning) setToday(localDateKey()) }
    const timer = setInterval(update, 60000)
    window.addEventListener('focus', update)
    return () => { clearInterval(timer); window.removeEventListener('focus', update) }
  }, [menuMode, isSpinning])
  const excluded = useMemo(() => excludedMeals(meals, today, excludeDays), [meals, today, excludeDays])
  const [menuRound, setMenuRound] = useState(() => createMenuRoundExclusions(rouletteItems, menuMode ? excluded : []))
  const nextMenuRound = updateMenuRoundContext(menuRound, rouletteItems, menuMode ? excluded : [])
  if (nextMenuRound !== menuRound) {
    setMenuRound(nextMenuRound)
    if (menuMode) { setSpinResult(null); setIsSpinning(false); setWheelSaved(false) }
  }
  const menuRoundRef = useRef(menuRound)
  const mealEligibleItems = useMemo(() => menuMode ? menuRound.eligible.map(item => item.value) : rouletteItems, [menuMode, menuRound.eligible, rouletteItems])
  const wheelItems = useMemo(() => menuMode ? menuRound.items.map(item => item.value) : rouletteItems, [menuMode, menuRound.items, rouletteItems])
  useLayoutEffect(() => {
    if (menuRoundRef.current !== menuRound) {
      menuRoundRef.current = menuRound
      if (menuMode) { spinGuard.invalidate(); rouletteResultRef.current = null; spinningRef.current = false; copyGuard.current.invalidate() }
    }
    if (menuFocusRevision.current !== null) {
      const requested = menuFocusRevision.current; menuFocusRevision.current = null
      if (requested === menuRound.revision && mounted.current && tabRef.current === 'roulette' && !menuSpinRef.current?.disabled) menuSpinRef.current?.focus({ preventScroll: true })
    }
  }, [menuRound, menuMode, spinGuard])
  const persistMeals = (next: MealHistory) => {
    try {
      const currentRaw = localStorage.getItem(MEAL_HISTORY_KEY)
      const current = parseMealHistory(currentRaw)
      if (mealRaw === undefined || currentRaw !== mealRaw) {
        setMeals(current.records); setExcludeDays(current.excludeDays); setMealRaw(currentRaw)
        setMealError('mealPlan.historyConflict'); setMealNotice('')
        return false
      }
      const raw = JSON.stringify(next); parseMealHistory(raw); localStorage.setItem(MEAL_HISTORY_KEY, raw)
      if (localStorage.getItem(MEAL_HISTORY_KEY) !== raw) throw new Error('Meal history write failed')
      setMealRaw(raw); setMeals(next.records); setExcludeDays(next.excludeDays); setMealError(''); clearRouletteResult()
      return true
    } catch { setMealError('weekly.storageFailed'); setMealNotice(''); return false }
  }
  const addMeal = (name: string, date: string) => {
    if (!mealReady || isSpinning) return false
    const clean = name.trim()
    if (!clean || clean.length > 80 || dateNumber(date) === null || date > localDateKey()) { setMealError('weekly.invalid'); return false }
    if (meals.some(record => record.name === clean && record.date === date)) { setMealError('weekly.duplicate'); return false }
    if (meals.length >= MAX_MEAL_RECORDS) { setMealError('weekly.full'); return false }
    if (persistMeals({ records: [{ id: crypto.randomUUID(), name: clean, date }, ...meals], excludeDays })) { setMealNotice(t('weekly.saved', { name: clean })); return true }
    return false
  }
  const changeExclusion = (days: 0 | 1 | 7) => { if (!isSpinning && persistMeals({ records: meals, excludeDays: days })) setMealNotice('') }
  const deleteMeal = (id: string) => { if (!isSpinning && persistMeals({ records: meals.filter(record => record.id !== id), excludeDays })) setMealNotice(t('weekly.deleted')) }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const confettiRef = useRef<Confetti[]>([])
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null)
  const confettiRafRef = useRef<number | null>(null)

  // ─── Order Picker state ──────────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState<string[]>(defaultParticipants)
  const [newOrderItem, setNewOrderItem] = useState('')
  const [orderState, setOrderState] = useState<OrderRevealSnapshot>(() => ({ runId: 0, phase: 'idle', mode: 'auto', items: [], revealedCount: 0, active: initialTab === 'order' }))
  const [orderController] = useState(() => createOrderRevealController({ shuffle, onChange: next => { if (mounted.current) setOrderState(next) } }, initialTab === 'order'))
  const orderResult = orderState.items, revealedCount = orderState.revealedCount
  const isShuffling = orderState.phase === 'shuffling' && orderState.mode === 'auto'
  const orderBusy = isOrderBusy(orderState)
  const orderExport = useMemo(() => createOrderResultSnapshot(orderState, (rank, name) => t('order.copyLine', { rank, name })), [orderState, t])
  const rouletteExport = useMemo(() => createRouletteResultSnapshot(spinResult, rouletteRun), [spinResult, rouletteRun])
  const exportKey = JSON.stringify([activeTab, orderExport, rouletteExport])
  const [lastExportKey, setLastExportKey] = useState(exportKey)
  if (lastExportKey !== exportKey) {
    setLastExportKey(exportKey); setCopiedTarget(null); setCopyPending(false); setCopyRecovery(null); setDownloadError(false)
  }
  const exportRef = useRef({ key: exportKey, order: orderExport, roulette: rouletteExport })
  useLayoutEffect(() => {
    mounted.current = true
    spinGuard.activate()
    orderController.setActive(tabRef.current === 'order')
    const guard = copyGuard.current
    return () => {
      mounted.current = false; orderController.setActive(false); guard.invalidate(); spinGuard.dispose(); spinningRef.current = false; menuFocusRevision.current = null
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      downloads.current?.dispose(); downloads.current = null
    }
  }, [orderController, spinGuard])
  useLayoutEffect(() => {
    tabRef.current = activeTab
    orderController.setActive(activeTab === 'order')
  }, [activeTab, orderController])
  useLayoutEffect(() => {
    if (exportRef.current.key !== exportKey) {
      copyGuard.current.invalidate()
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = null
    }
    exportRef.current = { key: exportKey, order: orderExport, roulette: rouletteExport }
  }, [exportKey, orderExport, rouletteExport])
  useLayoutEffect(() => {
    const requested = revealFocus.current
    if (!requested) return
    revealFocus.current = null
    const target = requested === 'copy' ? orderCopyRef.current : drawRef.current
    if (target && !target.disabled) target.focus({ preventScroll: true })
  }, [orderState])
  useLayoutEffect(() => {
    if (!recoveryFocus.current || copyPending) return
    const target = recoveryFocus.current === 'order' ? orderCopyRef.current : rouletteCopyRef.current
    recoveryFocus.current = null
    if (target && !target.disabled) target.focus({ preventScroll: true })
  }, [copiedTarget, copyPending])
  const currentExport = (snapshot: DecisionResultSnapshot) => {
    if (!mounted.current || tabRef.current !== snapshot.target || exportRef.current[snapshot.target]?.text !== snapshot.text) return false
    return snapshot.target === 'order'
      ? orderController.getSnapshot().runId === snapshot.runId && canExportOrder(orderController.getSnapshot())
      : !spinningRef.current && rouletteRunRef.current === snapshot.runId && rouletteResultRef.current === snapshot.text
  }
  const applyMenuRoundChange = (change: MenuRoundChange) => {
    if (!change.ok || !change.changed) return
    menuRoundRef.current = change.state; setMenuRound(change.state); menuFocusRevision.current = change.state.revision
    clearRouletteResult(); setWheelSaved(false)
  }
  const excludeCurrentMenu = () => {
    if (!menuMode || !mounted.current || tabRef.current !== 'roulette' || spinningRef.current || !rouletteExport || !currentExport(rouletteExport)) return
    applyMenuRoundChange(excludeMenuRoundName(menuRoundRef.current, rouletteExport.text, menuRound.revision))
  }
  const restoreMenu = (name: string, revision: number) => {
    if (!menuMode || !mounted.current || tabRef.current !== 'roulette' || spinningRef.current) return
    applyMenuRoundChange(restoreMenuRoundName(menuRoundRef.current, name, revision))
  }
  const restoreMenus = (revision: number) => {
    if (!menuMode || !mounted.current || tabRef.current !== 'roulette' || spinningRef.current) return
    applyMenuRoundChange(restoreAllMenuRoundNames(menuRoundRef.current, revision))
  }
  const excludePreview = menuMode && spinResult ? excludeMenuRoundName(menuRound, spinResult, menuRound.revision) : null
  const copyResult = async (snapshot: DecisionResultSnapshot | null) => {
    if (!snapshot || !currentExport(snapshot)) return
    const fromRecovery = copyRecovery?.snapshot === snapshot
    invalidateCopy(); const token = copyGuard.current.begin()
    setCopyPending(true)
    const current = () => copyGuard.current.isCurrent(token) && currentExport(snapshot)
    const outcome = await copyDecisionResult(snapshot, current)
    if (!current()) return
    setCopyPending(false)
    if (outcome === 'copied') {
      if (fromRecovery) recoveryFocus.current = snapshot.target
      setCopiedTarget(snapshot.target)
      copyTimer.current = setTimeout(() => { if (current()) { setCopiedTarget(null); copyTimer.current = null } }, 2000)
    } else if (outcome === 'failed') setCopyRecovery({ snapshot, request: token.request })
  }
  const closeCopyRecovery = () => {
    const target = copyRecovery?.snapshot.target === 'roulette' ? rouletteCopyRef.current : orderCopyRef.current
    invalidateCopy()
    if (target && !target.disabled) target.focus({ preventScroll: true })
  }
  const switchTab = (tab: 'roulette' | 'order') => {
    if (!mounted.current || tab === tabRef.current) return
    invalidateCopy(); tabRef.current = tab; orderController.setActive(tab === 'order'); setActiveTab(tab)
  }

  // ─── URL restore (마운트 1회) ─────────────────────────────────────────────
  // 아래 URL sync 효과보다 먼저 선언해야 함(효과는 선언 순서대로 실행 → sync가 URL을 기본값으로 덮기 전에 읽음).
  // 렌더 시점의 searchParams 클로저를 쓰므로 StrictMode 이중 실행에도 원래 URL 값 유지.
  useEffect(() => {
    const parse = (key: string) => (searchParams.get(key) ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const r = parse('roulette')
    if (r.length >= 2) setRouletteItems(r.slice(0, 12))
    const o = parse('order')
    if (o.length >= 2) setOrderItems(o)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── URL sync ─────────────────────────────────────────────────────────────
  // 기본 항목 그대로면 URL에서 뺀다 — 첫 방문 주소가 깨끗하게(서버 HTML과 같은 상태)
  const syncParam = (key: string, items: string[], defaults: string[]) => {
    const url = new URL(window.location.href)
    if (items.join(',') === defaults.join(',')) url.searchParams.delete(key)
    else url.searchParams.set(key, items.join(','))
    window.history.replaceState(window.history.state, '', url)
  }
  useEffect(() => {
    syncParam('roulette', rouletteItems, defaultPreset ? PRESETS[defaultPreset].slice(0, 12) : defaultParticipants)
  }, [rouletteItems]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    syncParam('order', orderItems, defaultParticipants)
  }, [orderItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Draw roulette wheel ─────────────────────────────────────────────────
  const drawWheel = useCallback((angle: number, items: string[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const radius = cx - 4

    ctx.clearRect(0, 0, size, size)

    const sliceAngle = (2 * Math.PI) / items.length

    items.forEach((item, i) => {
      const startAngle = angle + i * sliceAngle
      const endAngle = startAngle + sliceAngle

      // slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(10, Math.min(16, Math.floor(radius / items.length * 1.4)))}px sans-serif`
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 3

      const maxLen = 12
      const label = item.length > maxLen ? item.slice(0, maxLen - 1) + '…' : item
      ctx.fillText(label, radius - 12, 5)
      ctx.restore()
    })

    // center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [])

  useEffect(() => {
    drawWheel(currentAngle, wheelItems)
    // canvasSize 변경 시 width 속성 재설정으로 비트맵이 지워지므로 다시 그려야 함 (첫 화면 빈 원 버그)
  }, [currentAngle, wheelItems, drawWheel, canvasSize])

  // ─── Spin logic ───────────────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (!mounted.current || tabRef.current !== 'roulette' || spinningRef.current || wheelItems.length < 2) return

    // clear confetti
    if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current)
    confettiRef.current = []
    const confettiCanvas = confettiCanvasRef.current
    if (confettiCanvas) {
      const ctx = confettiCanvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
    }

    clearRouletteResult()
    const token = spinGuard.begin(rouletteRunRef.current)
    if (!token) return
    spinningRef.current = true; setIsSpinning(true)

    // 시간 기준으로 종료한다. 속도 감쇠만 쓰면 최소 회전수에 도달하지 못할 수 있다.
    const startAngle = angleRef.current
    const travel = (4 + Math.random()) * 2 * Math.PI
    const duration = 4200
    const startedAt = performance.now()

    const animate = (now: number) => {
      if (!mounted.current || !spinningRef.current || !spinGuard.current(token, rouletteRunRef.current)) return
      const progress = Math.min(1, (now - startedAt) / duration)
      angleRef.current = startAngle + travel * (1 - Math.pow(1 - progress, 3))
      setCurrentAngle(angleRef.current)

      if (progress >= 1) {
        if (!spinGuard.finish(token, rouletteRunRef.current)) return
        // determine result: pointer is at top (angle = -PI/2 from canvas)
        // The item under the top is determined by normalizing the angle
        const sliceAngle = (2 * Math.PI) / wheelItems.length
        // top of canvas is at -PI/2; find which segment contains that angle
        const normalizedAngle = ((angleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        // pointer at top = -PI/2 => in wheel coords that's 3PI/2 from 0
        const pointerAngle = ((3 * Math.PI) / 2 - normalizedAngle + 2 * Math.PI) % (2 * Math.PI)
        const index = Math.floor(pointerAngle / sliceAngle) % wheelItems.length
        const result = wheelItems[index]

        rouletteResultRef.current = result; setSpinResult(result)
        setSpinHistory(prev => [result, ...prev].slice(0, 20))
        spinningRef.current = false; setIsSpinning(false)
        rafRef.current = null

        // launch confetti
        launchConfetti()
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [wheelItems, clearRouletteResult, spinGuard])

  const launchConfetti = () => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    const particles: Confetti[] = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 40,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 12 - 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      alpha: 1,
    }))
    confettiRef.current = particles
    const run = rouletteRunRef.current

    const animateConfetti = () => {
      if (!mounted.current || rouletteRunRef.current !== run) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      confettiRef.current.forEach(p => {
        p.vy += 0.4
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.alpha -= 0.015
        if (p.alpha > 0) {
          alive = true
          ctx.save()
          ctx.globalAlpha = p.alpha
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          ctx.restore()
        }
      })

      if (alive) confettiRafRef.current = requestAnimationFrame(animateConfetti)
    }
    confettiRafRef.current = requestAnimationFrame(animateConfetti)
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current)
    }
  }, [])

  // ─── Roulette item management ─────────────────────────────────────────────
  const addRouletteItem = () => {
    const trimmed = newRouletteItem.trim()
    if (!mounted.current || tabRef.current !== 'roulette' || spinningRef.current || !trimmed || rouletteItems.length >= 12) return
    clearRouletteResult()
    setRouletteItems(prev => [...prev, trimmed])
    setNewRouletteItem('')
  }

  const removeRouletteItem = (index: number) => {
    if (!mounted.current || tabRef.current !== 'roulette' || spinningRef.current || rouletteItems.length <= 2) return
    clearRouletteResult()
    setRouletteItems(prev => prev.filter((_, i) => i !== index))
  }

  const applyPreset = (key: keyof typeof PRESETS) => {
    if (!mounted.current || tabRef.current !== 'roulette' || spinningRef.current) return
    clearRouletteResult()
    if (menuMode) { const next = updateMenuRoundContext(menuRoundRef.current, PRESETS[key].slice(0, 12), excluded, true); menuRoundRef.current = next; setMenuRound(next); setWheelSaved(false) }
    setRouletteItems(PRESETS[key].slice(0, 12))
  }

  const copyRouletteResult = () => { void copyResult(rouletteExport) }

  const saveWheelImage = () => {
    if (!spinResult || !rouletteExport || !currentExport(rouletteExport)) return
    const W = 600, H = 340
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#1e1b4b'); grad.addColorStop(1, '#312e81')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#c7d2fe'; ctx.font = '22px system-ui, sans-serif'
    ctx.fillText(t('roulette.imageHeading'), W / 2, 70)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 54px system-ui, sans-serif'
    const label = spinResult.length > 10 ? spinResult.slice(0, 10) + '…' : spinResult
    ctx.fillText(label, W / 2, H / 2 + 10)
    ctx.fillStyle = '#818cf8'; ctx.font = '15px system-ui, sans-serif'
    // 메뉴 룰렛과 돌림판이 이 컴포넌트를 같이 쓴다 → 바닥글 도구 이름을 모드에 맞춘다
    ctx.fillText(menuMode ? t('roulette.imageFooter') : `toolhub.ai.kr · ${t('header.rouletteTitle')}`, W / 2, H - 38)
    const link = document.createElement('a')
    link.download = `roulette-${spinResult}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setWheelSaved(true)
    setTimeout(() => { if (currentExport(rouletteExport)) setWheelSaved(false) }, 2000)
  }

  // ─── Order Picker logic ───────────────────────────────────────────────────
  const addOrderItem = () => {
    const trimmed = newOrderItem.trim()
    if (!mounted.current || tabRef.current !== 'order' || isOrderBusy(orderController.getSnapshot()) || !trimmed) return
    invalidateCopy(); orderController.reset()
    setOrderItems(prev => [...prev, trimmed])
    setNewOrderItem('')
  }

  const removeOrderItem = (index: number) => {
    if (!mounted.current || tabRef.current !== 'order' || isOrderBusy(orderController.getSnapshot()) || orderItems.length <= 2 || index < 0 || index >= orderItems.length) return
    invalidateCopy(); orderController.reset()
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  const startOrder = () => {
    if (!mounted.current || tabRef.current !== 'order') return
    if (orderController.start(orderItems, orderState.runId)) invalidateCopy()
  }
  const revealNext = () => {
    if (!mounted.current || tabRef.current !== 'order' || orderController.getSnapshot().runId !== orderState.runId) return
    if (canRevealNext(orderController.getSnapshot()) && orderController.getSnapshot().revealedCount + 1 === orderResult.length) revealFocus.current = 'copy'
    orderController.revealNext(orderState.runId)
  }
  const revealAll = () => {
    if (!mounted.current || tabRef.current !== 'order' || orderController.getSnapshot().runId !== orderState.runId || !canRevealAll(orderController.getSnapshot())) return
    revealFocus.current = 'copy'; orderController.revealAll(orderState.runId)
  }
  const resetOrder = () => {
    if (!mounted.current || tabRef.current !== 'order' || orderController.getSnapshot().runId !== orderState.runId) return
    revealFocus.current = 'draw'; invalidateCopy(); orderController.reset(orderState.runId)
  }
  const copyOrderResult = () => { void copyResult(orderExport) }
  const downloadOrder = () => {
    if (!orderExport || !currentExport(orderExport)) return
    setDownloadError(false)
    downloads.current ??= createDecisionResultDownloads()
    const outcome = downloads.current.download(orderExport, () => currentExport(orderExport))
    if (outcome === 'failed' && currentExport(orderExport)) setDownloadError(true)
  }

  // ─── Canvas responsive size ───────────────────────────────────────────────
  const wheelContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      if (wheelContainerRef.current) {
        const w = wheelContainerRef.current.clientWidth
        setCanvasSize(Math.max(1, Math.min(380, w - 8)))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div className="space-y-6" data-roulette-run={rouletteRun} data-roulette-spinning={isSpinning}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">
          {menuMode ? t('menu.title') : single ? (initialTab === 'order' ? t('header.orderTitle') : t('header.rouletteTitle')) : t('header.title')}
        </h1>
        <p className="text-sm text-muted mt-1">
          {menuMode ? t('menu.subtitle') : single
            ? initialTab === 'order'
              ? t('header.orderSubtitle')
              : t('header.rouletteSubtitle')
            : t('header.subtitle')}
        </p>
      </div>

      {/* Tab switcher (숨김: single 모드) */}
      {!single && (
        <div className="flex gap-2 bg-soft p-1 rounded-xl w-fit">
          {(['roulette', 'order'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              data-decision-tab={tab}
              aria-pressed={activeTab === tab}
              className={`min-h-11 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>
      )}

      {/* ═══ ROULETTE TAB ═══════════════════════════════════════════════════ */}
      {activeTab === 'roulette' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: items + presets */}
          <div id="roulette-items" className={`min-w-0 lg:col-span-2 space-y-4 scroll-mt-20 ${menuMode ? 'order-2 lg:order-1' : ''}`}>
            <div className={`${glassCard} ${glassInset} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-fg">{menuMode ? t('menu.itemsTitle') : t('roulette.itemsTitle')}</h2>
                <span className="text-xs text-gray-400">{rouletteItems.length}/12</span>
              </div>

              {/* Preset buttons */}
              <div>
                <p className="text-xs text-muted mb-2">{t('roulette.presetsLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PRESETS).filter(key => !menuMode || key !== '벌칙').map(key => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      disabled={isSpinning}
                      aria-pressed={rouletteItems.join(',') === PRESETS[key].join(',')}
                      className={`min-h-11 px-3 py-2 text-sm rounded-xl disabled:opacity-50 ${rouletteItems.join(',') === PRESETS[key].join(',') ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {PRESET_LABEL[key] ? t(`presets.${PRESET_LABEL[key]}`) : key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item list */}
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {rouletteItems.map((item, i) => (
                  <li key={i} data-menu-candidate-index={menuMode ? i : undefined} data-menu-temporarily-excluded={menuMode ? menuRound.excluded.includes(item.trim()) : undefined} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 text-sm text-body [overflow-wrap:anywhere]">
                      {item}
                      {menuMode && menuRound.excluded.includes(item.trim()) && <span className="block text-xs text-muted">{t('menuRound.excludedBadge')}</span>}
                    </span>
                    <button
                      onClick={() => removeRouletteItem(i)}
                      disabled={isSpinning || rouletteItems.length <= 2}
                      aria-label={t('common.removeItem', { item })}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRouletteItem}
                  onChange={e => setNewRouletteItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRouletteItem()}
                  placeholder={t('roulette.addPlaceholder')}
                  aria-label={t('roulette.addInputLabel')}
                  maxLength={20}
                  disabled={isSpinning || rouletteItems.length >= 12}
                  className={`${glassInput} min-w-0 min-h-11 flex-1 px-3 py-2 text-base disabled:opacity-50`}
                />
                <button
                  onClick={addRouletteItem}
                  disabled={isSpinning || rouletteItems.length >= 12 || !newRouletteItem.trim()}
                  aria-label={t('roulette.addButton')}
                  className="ui-btn min-h-11 min-w-11 px-3 py-2 disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* History */}
            {menuMode && <MealHistoryPanel records={meals} excludeDays={excludeDays} today={today} ready={mealReady} busy={isSpinning} pick={spinResult ?? undefined} candidates={wheelItems.length} suggestions={[...new Set(Object.entries(PRESETS).filter(([key]) => key !== '벌칙').flatMap(([, items]) => items))]} onExclude={changeExclusion} onAdd={addMeal} onDelete={deleteMeal} error={mealError} notice={mealNotice} />}
            {menuMode && <MealPlanPanel candidates={mealEligibleItems} today={today} history={meals} ready={mealReady} busy={isSpinning} onAddMeal={addMeal} />}
            {spinHistory.length > 0 && (
              <div className={`${glassCard} ${glassInset} p-5`}>
                <button
                  onClick={() => setShowHistory(v => !v)}
                  aria-expanded={showHistory}
                  className="flex min-h-11 items-center justify-between w-full text-sm font-medium text-body"
                >
                  <span>{t('roulette.history', { count: spinHistory.length })}</span>
                  {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showHistory && (
                  <ul className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                    {spinHistory.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-sub">
                        <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right: wheel + result */}
          <div className={`min-w-0 lg:col-span-3 space-y-4 ${menuMode ? 'order-1 lg:order-2' : ''}`}>
            {menuMode && (
              <div className="ui-card p-4 sm:p-5 space-y-3">
                <p className="text-sm font-semibold text-body">{t('menu.quickTitle')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {['저녁메뉴', '점심메뉴'].map(key => (
                    <button key={key} onClick={() => applyPreset(key)} disabled={isSpinning}
                      aria-pressed={rouletteItems.join(',') === PRESETS[key].join(',')}
                      className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50 ${rouletteItems.join(',') === PRESETS[key].join(',') ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                      {t(`presets.${PRESET_LABEL[key]}`)}
                    </button>
                  ))}
                </div>
                <a href="#meal-history" className="min-h-11 inline-flex items-center text-sm text-primary font-medium mr-3">{t('weekly.title')} · {t('weekly.days' + excludeDays)}</a>
                <a href="#roulette-items" className="min-h-11 inline-flex items-center text-sm text-primary font-medium">{t('menu.edit', { count: rouletteItems.length })}</a>
              </div>
            )}
            <div className={`${glassCard} ${glassInset} p-5`}>
              {/* Wheel container */}
              <div ref={wheelContainerRef} className="relative flex flex-col items-center gap-4">
                {/* 스크린리더용 결과 알림 (결과 카드는 조건부 렌더라 live region 을 따로 둔다) */}
                <p className="sr-only" aria-live="polite">{spinResult ? t('roulette.resultAnnounce', { result: spinResult }) : ''}</p>
                {/* Relative wrapper for confetti overlay */}
                <div className="relative order-2 max-w-full" style={{ width: canvasSize, height: canvasSize }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <div
                      className="w-0 h-0"
                      style={{
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '20px solid var(--color-fg)',
                      }}
                    />
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    className="rounded-full max-w-full"
                    role="img"
                    aria-label={t('roulette.wheelLabel', { items: wheelItems.join(', ') })}
                  />
                  <canvas
                    ref={confettiCanvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                  />
                </div>

                {/* Spin button */}
                <button
                  onClick={spin}
                  ref={menuSpinRef}
                  disabled={isSpinning || wheelItems.length < 2}
                  id="roulette-spin"
                  className="ui-btn order-1 w-full min-h-12 px-6 py-3 font-bold text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSpinning ? t('roulette.spinning') : t('roulette.spin')}
                </button>
                {spinResult && (
                  <a href="#roulette-result" className="order-1 min-h-11 inline-flex items-center text-lg font-semibold text-primary break-words">
                    {t('roulette.resultAnnounce', { result: spinResult })}
                  </a>
                )}
                {menuMode && mealNotice && <p role="status" className="order-1 text-sm text-sub">{mealNotice}</p>}
              </div>
            </div>

            {/* Result card */}
            {spinResult && (
              <div id="roulette-result" className="ui-card p-4 sm:p-5">
                <p className="text-sm text-sub font-medium mb-1">{t('roulette.result')}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="min-w-0 break-words text-2xl font-bold text-fg">{spinResult}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveWheelImage}
                      className="ui-btn-soft min-h-11 flex items-center gap-1 px-3 py-2 text-sm"
                    >
                      {wheelSaved ? <Check size={14} className="text-green-500" /> : <Download size={14} />}
                      {wheelSaved ? t('roulette.saved') : t('roulette.saveImage')}
                    </button>
                    <button
                      onClick={copyRouletteResult}
                      ref={rouletteCopyRef}
                      data-roulette-copy=""
                      data-roulette-copied={copiedTarget === 'roulette'}
                      disabled={copyPending}
                      className="ui-btn-soft min-h-11 flex items-center gap-1 px-3 py-2 text-sm"
                    >
                      {copiedTarget === 'roulette' ? <Check size={14} /> : <Copy size={14} />}
                      {copiedTarget === 'roulette' ? t('common.copied') : t('roulette.copy')}
                    </button>
                  </div>
                </div>
                {menuMode && <div className="mt-3 space-y-2">
                  <button type="button" data-menu-exclude-result="" onClick={excludeCurrentMenu} disabled={!mealReady || isSpinning || !excludePreview?.ok} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('menuRound.exclude')}</button>
                  {excludePreview && !excludePreview.ok && excludePreview.error === 'minimum' && <p role="status" className="text-sm text-sub">{t('menuRound.minimum')}</p>}
                  <button type="button" onClick={() => addMeal(spinResult, today)} disabled={!mealReady || isSpinning || meals.some(record => record.name === spinResult && record.date === today)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('weekly.savePick', { name: spinResult })}</button>
                  {mealError && <p role="alert" className="text-sm text-body">{t(mealError)}</p>}
                </div>}
              </div>
            )}
            {menuMode && <MenuRoundExclusions state={menuRound} busy={!mealReady || isSpinning} onRestore={restoreMenu} onRestoreAll={restoreMenus} />}
          </div>
        </div>
      )}

      {/* ═══ ORDER PICKER TAB ════════════════════════════════════════════════ */}
      {activeTab === 'order' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: participants */}
          <div className="min-w-0 lg:col-span-2 space-y-4">
            <div className={`${glassCard} ${glassInset} p-5 space-y-4`}>
              <MobileResultLink href="#order-picker-result" label={t('order.resultLink')} value={t('order.revealProgress', { count: revealedCount, total: orderResult.length || orderItems.length })} />
              <h2 className="font-semibold text-fg">{t('order.participantsTitle')}</h2>

              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {orderItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-soft text-sub text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-body [overflow-wrap:anywhere]">
                      {item}
                    </span>
                    <button
                      onClick={() => removeOrderItem(i)}
                      data-order-remove={i}
                      disabled={orderBusy || orderItems.length <= 2}
                      aria-label={t('common.removeItem', { item })}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-sub hover:text-body disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add participant */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOrderItem}
                  onChange={e => { if (!isOrderBusy(orderController.getSnapshot())) setNewOrderItem(e.target.value) }}
                  onKeyDown={e => e.key === 'Enter' && addOrderItem()}
                  placeholder={t('order.addPlaceholder')}
                  aria-label={t('order.addInputLabel')}
                  maxLength={20}
                  disabled={orderBusy}
                  data-order-input=""
                  className={`${glassInput} min-w-0 min-h-11 flex-1 px-3 py-2 text-base`}
                />
                <button
                  onClick={addOrderItem}
                  data-order-add=""
                  disabled={orderBusy || !newOrderItem.trim()}
                  aria-label={t('order.addButton')}
                  className="ui-btn min-h-11 min-w-11 px-3 py-2 disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </div>
              {orderBusy && <p className="text-sm text-sub">{t('order.inputLocked')}</p>}
              <div className="space-y-2">
                <p className="text-sm font-medium text-body">{t('order.revealMode')}</p>
                <div role="group" aria-label={t('order.revealMode')} className="flex flex-wrap gap-2">
                  {(['auto', 'manual'] as const).map(mode => <button key={mode} type="button" data-order-mode={mode} aria-pressed={orderState.mode === mode}
                    onClick={() => { if (mounted.current && tabRef.current === 'order') orderController.setMode(mode) }}
                    className={`min-h-11 rounded-xl px-3 py-2 text-sm ${orderState.mode === mode ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(mode === 'auto' ? 'order.autoReveal' : 'order.manualReveal')}</button>)}
                </div>
                <p className="text-xs text-sub">{t('order.fixedOrderHint')}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={startOrder}
                  ref={drawRef}
                  data-order-draw=""
                  disabled={orderBusy || orderItems.length < 2}
                  className="ui-btn min-h-11 min-w-0 flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60"
                >
                  <Shuffle size={18} />
                  {isShuffling ? t('order.shuffling') : t('order.draw')}
                </button>
                  <button type="button"
                    onClick={resetOrder}
                    data-order-reset=""
                    disabled={orderState.phase === 'idle'}
                    className="ui-btn-soft min-h-11 min-w-11 px-3 py-2 disabled:opacity-40"
                    title={t('order.reset')}
                    aria-label={t('order.reset')}
                  >
                    <RotateCcw size={18} />
                  </button>
              </div>
            </div>
          </div>

          {/* Right: result cards */}
          <div className="min-w-0 lg:col-span-3">
            <div id="order-picker-result" data-order-revealed-count={revealedCount} data-order-phase={orderState.phase} data-order-run={orderState.runId} data-order-reveal-mode={orderState.mode} className={`${glassCard} ${glassInset} p-5 scroll-mt-20`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold text-fg">
                  {t('order.resultTitle')}
                  {orderResult.length > 0 && (
                    <span className="ml-2 text-sm text-sub">
                      {revealedCount}/{orderResult.length}
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {orderState.mode === 'manual' && <button type="button" data-order-next="" onClick={revealNext} disabled={!canRevealNext(orderState)} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('order.nextPerson')}</button>}
                    <button type="button"
                      onClick={revealAll}
                      data-order-reveal-all=""
                      disabled={!canRevealAll(orderState)}
                      className="ui-btn-soft min-h-11 flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
                    >
                      <Eye size={14} />
                      {t('order.revealAll')}
                    </button>
                  {orderResult.length > 0 && revealedCount === orderResult.length && (
                    <button type="button"
                      onClick={copyOrderResult}
                      ref={orderCopyRef}
                      data-order-copy=""
                      data-order-copied={copiedTarget === 'order'}
                      disabled={!canExportOrder(orderState) || copyPending}
                      className="ui-btn-soft min-h-11 flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
                    >
                      {copiedTarget === 'order' ? <Check size={14} /> : <Copy size={14} />}
                      {copiedTarget === 'order' ? t('common.copied') : t('order.copyResult')}
                    </button>
                  )}
                  {canExportOrder(orderState) && <button type="button" data-order-download="" onClick={downloadOrder} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('order.downloadText')}</button>}
                </div>
              </div>
              <p role="status" className="mb-3 text-sm text-sub">{orderState.phase === 'complete' ? t('order.revealComplete', { total: orderResult.length }) : orderBusy ? t('order.revealProgress', { count: revealedCount, total: orderResult.length }) : ''}</p>
              {orderState.mode === 'manual' && orderBusy && <p className="mb-3 text-sm text-body">{t('order.manualReady')}</p>}
              <p className="mb-3 text-xs text-sub">{t('order.exportHint')}</p>
              {downloadError && <p role="alert" className="mb-3 text-sm text-body">{t('order.downloadFailed')}</p>}

              {orderResult.length === 0 && !isShuffling && (
                <div className="flex flex-col items-center justify-center py-16 text-faint">
                  <Shuffle size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">{t('order.empty')}</p>
                </div>
              )}

              {isShuffling && (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm text-muted">{t('order.shuffling')}</p>
                </div>
              )}

              {!isShuffling && orderResult.length > 0 && (
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-3" data-order-cards="">
                  {orderResult.map((name, i) => {
                    const revealed = i < revealedCount
                    return (
                      <div
                        key={i}
                        data-order-card={i}
                        data-order-visible={revealed}
                        className={`relative min-w-0 rounded-xl overflow-hidden transition-opacity motion-reduce:transition-none duration-500 ${
                          revealed ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                        }`}
                        style={{ minHeight: 96 }}
                      >
                        {revealed ? (
                          <div
                            className="flex min-w-0 flex-col items-center justify-center h-full p-3 bg-subtle text-fg"
                            style={{ minHeight: 96 }}
                          >
                            <span className="text-xs font-bold text-sub mb-1">{t('order.rank', { rank: i + 1 })}</span>
                            <span className="text-base font-bold text-center [overflow-wrap:anywhere] leading-tight">
                              {name}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center h-full p-3 bg-track"
                            style={{ minHeight: 96 }}
                          >
                            <span className="text-3xl text-faint">?</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {copyRecovery && <DecisionResultCopyRecovery key={copyRecovery.request} text={copyRecovery.snapshot.text} busy={copyPending} onRetry={() => { void copyResult(copyRecovery.snapshot) }} onClose={closeCopyRecovery} />}
    </div>
  )
}
