'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/spiritLevel'
import {
  upVector, toScreen, lowPass, surfaceReading, edgeReading, slopePercent, mmPerMeter, isLevel, bubbleScale,
  applyCalibration, reversalZero, nearestAxis, parseCalibration, compassHeading, smoothAngle, compassKey,
  type Vec3, type Calibration,
} from '@/utils/spiritLevel'

type Mode = 'surface' | 'edge' | 'compass'
type Status = 'idle' | 'active' | 'denied' | 'nosensor' | 'error'
type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number }
type PermissionApi = { requestPermission?: () => Promise<string> }

const CAL_KEY = 'spiritLevel.calibration'
const FLAT: Vec3 = [0, 0, 1]
const UPRIGHT: Vec3 = [0, 1, 0]

function screenAngle(): number {
  const legacy = (window as unknown as { orientation?: number }).orientation
  return Number(screen.orientation?.angle ?? legacy ?? 0) || 0
}

/** 0.1° 표시 (-0.0 방지) */
const fmt = (d: number) => (Math.round(Math.abs(d) * 10) / 10).toFixed(1)

export default function SpiritLevel() {
  const t = useTranslations('spiritLevel')
  const [mode, setMode] = useState<Mode>('surface')
  const [status, setStatus] = useState<Status>('idle')
  const [env, setEnv] = useState({ insecure: false, desktop: false })
  const [view, setView] = useState<{ s: Vec3; heading: number | null } | null>(null)
  const [held, setHeld] = useState(false)
  const [cal, setCal] = useState<Calibration>({})
  const [calFirst, setCalFirst] = useState<Vec3 | null>(null)
  const [calMsg, setCalMsg] = useState<string | null>(null)

  const raw = useRef<Vec3 | null>(null) // 필터된 위쪽 벡터 (기기 좌표, 보정 전)
  const heading = useRef<number | null>(null)
  const lastT = useRef(0)
  const lastH = useRef(0)
  const gotData = useRef(false)
  const wasLevel = useRef(false)

  // 마운트 후에만 브라우저 API 접근 (hydration 일치)
  useEffect(() => {
    setEnv({ insecure: !window.isSecureContext, desktop: !window.matchMedia('(pointer: coarse)').matches })
    try { setCal(parseCalibration(localStorage.getItem(CAL_KEY))) } catch { /* 저장소 차단 */ }
  }, [])

  // 센서 구독 + 화면 꺼짐 방지
  useEffect(() => {
    if (status !== 'active') return
    const onOrient = (e: Event) => {
      const ev = e as OrientationEvt
      if (ev.beta == null || ev.gamma == null) return // 데스크톱 Chrome은 null 이벤트 1회
      gotData.current = true
      const now = performance.now()
      raw.current = lowPass(raw.current, upVector(ev.beta, ev.gamma), (now - lastT.current) / 1000)
      lastT.current = now
      const h = compassHeading(ev.alpha, ev.absolute || e.type === 'deviceorientationabsolute', ev.webkitCompassHeading, screenAngle())
      if (h != null) {
        heading.current = smoothAngle(heading.current, h, (now - lastH.current) / 1000)
        lastH.current = now
      }
    }
    // Android Chrome: 일반 이벤트의 alpha는 임의 기준 → 방위는 absolute 이벤트에서. 기울기는 둘 다 같음.
    window.addEventListener('deviceorientation', onOrient)
    window.addEventListener('deviceorientationabsolute', onOrient)
    const timer = setTimeout(() => { if (!gotData.current) setStatus('nosensor') }, 2500)

    let alive = true
    let wake: WakeLockSentinel | null = null
    const lockScreen = async () => {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
        const w = await navigator.wakeLock.request('screen')
        if (alive) wake = w
        else w.release().catch(() => {})
      } catch { /* 미지원·절전 모드 */ }
    }
    const onVis = () => { if (document.visibilityState === 'visible') lockScreen() }
    lockScreen()
    document.addEventListener('visibilitychange', onVis)

    return () => {
      alive = false
      window.removeEventListener('deviceorientation', onOrient)
      window.removeEventListener('deviceorientationabsolute', onOrient)
      document.removeEventListener('visibilitychange', onVis)
      clearTimeout(timer)
      wake?.release().catch(() => {})
      raw.current = null
      heading.current = null
      gotData.current = false
    }
  }, [status])

  // 화면 갱신 (고정 중엔 멈춤)
  useEffect(() => {
    if (status !== 'active' || held) return
    let id = 0
    const tick = () => {
      if (raw.current) setView({ s: toScreen(applyCalibration(raw.current, cal), screenAngle()), heading: heading.current })
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [status, held, cal])

  const start = useCallback(async () => {
    const api = (typeof DeviceOrientationEvent === 'undefined' ? undefined : DeviceOrientationEvent) as unknown as PermissionApi | undefined
    if (!api) { setStatus('nosensor'); return }
    if (typeof api.requestPermission === 'function') {
      // iOS 13+: 반드시 탭 핸들러 안에서 호출
      try {
        if ((await api.requestPermission()) !== 'granted') { setStatus('denied'); return }
      } catch { setStatus('error'); return }
    }
    setHeld(false)
    setStatus('active')
  }, [])

  const stop = useCallback(() => {
    setStatus('idle')
    setView(null)
    setHeld(false)
    setCalFirst(null)
    setCalMsg(null)
  }, [])

  const calibrate = useCallback(() => {
    const u = raw.current
    if (!u) return
    if (!calFirst) { setCalFirst(u); setCalMsg(t('calStep2')); return }
    setCalFirst(null)
    const a = nearestAxis(calFirst)
    if (a.key !== nearestAxis(u).key) { setCalMsg(t('calMismatch')); return }
    const zero = reversalZero(calFirst, u)
    const off = Math.acos(Math.min(1, Math.abs(zero[0] * a.axis[0] + zero[1] * a.axis[1] + zero[2] * a.axis[2]))) * 180 / Math.PI
    if (off > 5) { setCalMsg(t('calTooFar')); return }
    const next = { ...cal, [a.key]: zero }
    setCal(next)
    try { localStorage.setItem(CAL_KEY, JSON.stringify(next)) } catch { /* 저장 실패해도 이번 세션엔 적용 */ }
    setCalMsg(t('calDone', { deg: fmt(off) }))
  }, [cal, calFirst, t])

  const resetCal = useCallback(() => {
    setCal({})
    setCalFirst(null)
    setCalMsg(null)
    try { localStorage.removeItem(CAL_KEY) } catch { /* noop */ }
  }, [])

  const active = status === 'active'
  const s = view?.s ?? (mode === 'edge' ? UPRIGHT : FLAT)
  const surf = surfaceReading(s)
  const edge = edgeReading(s)
  const mainDeg = mode === 'surface' ? surf.total : edge.abs
  const valid = view != null && (mode !== 'edge' || edge.upright)
  const level = valid && mode !== 'compass' && isLevel(mainDeg)

  // 수평에 들어오는 순간 짧은 진동 (iOS는 미지원)
  useEffect(() => {
    if (level && !held && !wasLevel.current) navigator.vibrate?.(40)
    wasLevel.current = level
  }, [level, held])

  const side = (v: number, pos: string, neg: string) => (fmt(v) === '0.0' ? '' : t(v > 0 ? pos : neg))
  const edgeSide = edge.vertical ? side(edge.offset, 'highTop', 'highBottom') : side(edge.offset, 'highRight', 'highLeft')
  const surfaceSide = [side(surf.x, 'highRight', 'highLeft'), side(surf.y, 'highTop', 'highBottom')].filter(Boolean).join(' · ')
  const hasCal = Object.keys(cal).length > 0
  const tabs: [Mode, string][] = [['surface', t('levelMode')], ['edge', t('edgeMode')], ['compass', t('compassMode')]]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <span className="px-2 py-0.5 text-xs font-medium bg-soft text-sub rounded-full">{t('mobileFriendly')}</span>
        </div>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-1 p-1 bg-soft rounded-xl" role="tablist">
          {tabs.map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setCalFirst(null); setCalMsg(null) }}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ui-card p-5 sm:p-6">
          <p className="text-sm text-muted text-center mb-4">
            {t(mode === 'surface' ? 'surfaceHint' : mode === 'edge' ? 'edgeHint' : 'compassHint')}
          </p>

          <div className={`flex justify-center ${active ? '' : 'opacity-50'}`}>
            {mode === 'surface' && <BubbleDisc s={s} level={level} />}
            {mode === 'edge' && <Vial offset={edge.offset} vertical={edge.vertical} level={level} />}
            {mode === 'compass' && <CompassDial heading={view?.heading ?? 0} />}
          </div>

          {/* 판독값 */}
          <div className="mt-5 text-center" aria-live="polite">
            {mode === 'compass' ? (
              <>
                <p className="text-6xl font-bold text-fg tabular-nums">
                  {view?.heading != null ? `${Math.round(view.heading) % 360}°` : '—'}
                </p>
                <p className="text-base font-semibold text-sub mt-1">
                  {view?.heading != null ? t(`directions.${compassKey(view.heading)}`) : t('heading')}
                </p>
                {active && view && view.heading == null && <p className="text-sm text-muted mt-2">{t('compassUnavailable')}</p>}
                {active && view && surf.total > 30 && <p className="text-sm text-muted mt-2">{t('compassFlat')}</p>}
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-muted">{t(mode === 'surface' ? 'totalTilt' : 'edgeTilt')}</p>
                <p className={`text-6xl font-bold tabular-nums ${level ? 'text-primary' : 'text-fg'}`}>
                  {valid ? `${fmt(mainDeg)}°` : '—'}
                </p>
                <p className={`text-base font-semibold mt-1 ${level ? 'text-primary' : 'text-sub'}`}>
                  {!valid ? (view ? t('edgeNotUpright') : ' ') : level ? t('levelOk') : (mode === 'surface' ? surfaceSide : edgeSide) || t('notLevel')}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Stat label={t('slope')} value={valid && mainDeg < 85 ? `${fmt(slopePercent(mainDeg))}%` : '—'} />
                  <Stat label={t('rise')} value={valid && mainDeg < 85 ? `${fmt(mmPerMeter(mainDeg))} mm` : '—'} />
                  {mode === 'surface' && (
                    <>
                      <Stat label={t('leftRight')} value={valid ? `${fmt(surf.x)}°` : '—'} />
                      <Stat label={t('frontBack')} value={valid ? `${fmt(surf.y)}°` : '—'} />
                    </>
                  )}
                </div>
              </>
            )}
            {held && <p className="text-sm font-semibold text-primary mt-3">{t('heldNote')}</p>}
          </div>

          {/* 조작 */}
          <div className="mt-6 space-y-3">
            {!active ? (
              <button onClick={start} className="ui-btn w-full px-4 py-4 text-lg">{t('start')}</button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHeld(h => !h)}
                    aria-pressed={held}
                    className={`px-4 py-3 rounded-xl font-semibold ${held ? 'bg-primary text-white' : 'ui-btn-soft'}`}
                  >
                    {held ? t('unlock') : t('lock')}
                  </button>
                  <button onClick={stop} className="px-4 py-3 rounded-xl font-semibold bg-soft hover:bg-subtle text-body">{t('stop')}</button>
                </div>
                {mode !== 'compass' && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={calibrate} disabled={held} className="ui-btn-soft flex-1 px-4 py-2.5 text-sm">
                      {calFirst ? t('calCapture2') : t('calibrate')}
                    </button>
                    {calFirst && (
                      <button onClick={() => { setCalFirst(null); setCalMsg(null) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-soft text-body">{t('calCancel')}</button>
                    )}
                    {hasCal && !calFirst && (
                      <button onClick={resetCal} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-soft text-body">{t('calReset')}</button>
                    )}
                  </div>
                )}
                {mode !== 'compass' && (
                  <p className="text-xs text-muted text-center">{calMsg ?? (hasCal ? t('calibrated') : t('calHint'))}</p>
                )}
              </>
            )}

            {status === 'denied' && <Notice text={t('permissionDenied')} sub={t('iosHint')} />}
            {status === 'error' && <Notice text={t('sensorError')} sub={t('iosHint')} />}
            {status === 'nosensor' && <Notice text={t('noSensor')} />}
            {!active && env.insecure && <Notice text={t('insecure')} />}
            {status === 'idle' && env.desktop && <p className="text-sm text-muted text-center">{t('desktopHint')}</p>}
            {status === 'idle' && !env.desktop && <p className="text-sm text-muted text-center">{t('startHint')}</p>}
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <section className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sm text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['level', 'calibration', 'compass', 'tips'] as const).map(k => (
          <div key={k}>
            <h3 className="font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-body">
              {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="bg-subtle rounded-xl p-4">
                <p className="text-sm font-semibold text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('disclaimer')}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-subtle rounded-xl py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold text-fg tabular-nums">{value}</p>
    </div>
  )
}

function Notice({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
      <p>{text}</p>
      {sub && <p className="mt-1 text-xs">{sub}</p>}
    </div>
  )
}

/** 원형 버블: 버블은 높은 쪽으로 간다. 눈금은 비선형(1°/3°/10°). */
function BubbleDisc({ s, level }: { s: Vec3; level: boolean }) {
  const { x, y } = surfaceReading(s)
  const mag = Math.hypot(x, y)
  const r = 80 * Math.abs(bubbleScale(mag)) // 중심에서 최대 80
  const bx = 100 + (mag ? (x / mag) * r : 0)
  const by = 100 - (mag ? (y / mag) * r : 0)
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[300px] aspect-square" aria-hidden="true">
      <circle cx="100" cy="100" r="96" className="fill-subtle stroke-line" strokeWidth="1.5" />
      <line x1="4" y1="100" x2="196" y2="100" className="stroke-line" />
      <line x1="100" y1="4" x2="100" y2="196" className="stroke-line" />
      {[1, 3, 10].map(d => (
        <g key={d}>
          <circle cx="100" cy="100" r={80 * bubbleScale(d) + 16} className="fill-none stroke-line-strong" strokeDasharray={d === 1 ? undefined : '2 3'} />
          <text x={100 + 80 * bubbleScale(d) + 18} y="96" fontSize="8" className="fill-faint">{d}°</text>
        </g>
      ))}
      <circle cx={bx} cy={by} r="14" className={level ? 'fill-primary' : 'fill-sub'} />
      <circle cx="100" cy="100" r="16" className="fill-none stroke-fg" strokeWidth="1.5" />
    </svg>
  )
}

/** 막대 수평계: 가로(화면 가로 변 기준) 또는 세로. offset>0 → 오른쪽(세로면 위쪽) 끝이 높음. */
function Vial({ offset, vertical, level }: { offset: number; vertical: boolean; level: boolean }) {
  const bx = 150 + 118 * bubbleScale(offset)
  // 짧은 눈금 = 버블 끝이 1°/3°/10°일 때 위치
  const ticks = [-10, -3, -1, 1, 3, 10].map(d => 150 + 118 * bubbleScale(d) + Math.sign(d) * 22)
  const body = (
    <>
      <rect x="4" y="8" width="292" height="48" rx="24" className="fill-subtle stroke-line" strokeWidth="1.5" />
      {ticks.map(x => <line key={x} x1={x} y1="12" x2={x} y2="20" className="stroke-line-strong" />)}
      {[126, 174].map(x => <line key={x} x1={x} y1="10" x2={x} y2="54" className="stroke-fg" strokeWidth="1.5" />)}
      <rect x={bx - 22} y="17" width="44" height="30" rx="15" className={level ? 'fill-primary' : 'fill-sub'} />
    </>
  )
  return vertical ? (
    <svg viewBox="0 0 64 300" className="h-[260px] w-auto" aria-hidden="true">
      <g transform="translate(0 300) rotate(-90)">{body}</g>
    </svg>
  ) : (
    <svg viewBox="0 0 300 64" className="w-full max-w-[340px]" aria-hidden="true">{body}</svg>
  )
}

function CompassDial({ heading }: { heading: number }) {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10)
  const pt = (deg: number, r: number) => [100 + Math.sin(deg * Math.PI / 180) * r, 100 - Math.cos(deg * Math.PI / 180) * r]
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[300px] aspect-square" aria-hidden="true">
      <circle cx="100" cy="100" r="96" className="fill-subtle stroke-line" strokeWidth="1.5" />
      <g transform={`rotate(${-heading} 100 100)`}>
        {ticks.map(d => {
          const [x1, y1] = pt(d, d % 90 === 0 ? 80 : d % 30 === 0 ? 84 : 88)
          const [x2, y2] = pt(d, 93)
          return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} className={d % 90 === 0 ? 'stroke-fg' : 'stroke-faint'} strokeWidth={d % 90 === 0 ? 2 : 1} />
        })}
        {(['N', 'E', 'S', 'W'] as const).map((l, i) => {
          const [x, y] = pt(i * 90, 66)
          return <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="700" className={l === 'N' ? 'fill-primary' : 'fill-sub'}>{l}</text>
        })}
        <path d="M100 40 L106 100 L94 100 Z" className="fill-primary" />
        <path d="M100 160 L106 100 L94 100 Z" className="fill-faint" />
      </g>
      <path d="M100 2 L107 14 L93 14 Z" className="fill-fg" />
      <circle cx="100" cy="100" r="5" className="fill-fg" />
    </svg>
  )
}
