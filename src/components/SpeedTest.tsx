'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { Play, Square, ChevronDown, ChevronUp } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  mbps, median, jitter as calcJitter, nextSize, bandwidth, gaugeRatio, downloadSeconds, verdict, speedClass,
  planGuarantee, fmtMbps, serverTimeFromHeader, pingMs, downSample, upSample,
  DOWN_STEPS, UP_STEPS, type Sample, type Need, type Verdict, type Step,
} from '@/utils/speedTest'

// 측정 서버: Cloudflare 공개 속도 측정 엔드포인트 (Access-Control-Allow-Origin: * / Timing-Allow-Origin: *)
const CF = 'https://speed.cloudflare.com'
const BUDGET_MS = 10_000
const HARD_STOP_MS = 15_000 // 예산 직전에 시작된 큰 요청이 늘어질 때 강제 중단
const LATENCY_COUNT = 20
const HISTORY_KEY = 'toolhub-speed-test-history'

type Phase = 'idle' | 'latency' | 'download' | 'upload' | 'done' | 'error'

interface Result {
  ts: number
  down: number
  up: number
  ping: number
  jitter: number
  loaded: number
  colo?: string
}

interface Meta { colo?: string; isp?: string }

// 용도별 기준 (근거: 넷플릭스 고객센터 권장 속도, Zoom 1080p 그룹통화, NVIDIA GeForce NOW 1080p60, YouTube 라이브 1080p 권장 비트레이트)
const USES: { id: string; need: Need }[] = [
  { id: 'web', need: { down: 5 } },
  { id: 'fhd', need: { down: 5 } },
  { id: 'uhd', need: { down: 15 } },
  { id: 'family', need: { down: 60 } },
  { id: 'video', need: { down: 4, up: 4, ping: 150 } },
  { id: 'game', need: { down: 3, ping: 50, jitter: 30 } },
  { id: 'cloudGame', need: { down: 25, ping: 40 } },
  { id: 'live', need: { up: 10 } },
]
const FILES: { id: string; gb: number }[] = [
  { id: 'photo', gb: 0.005 }, { id: 'movie', gb: 4 }, { id: 'game', gb: 100 },
]
const PLANS = [0, 100, 500, 1000] as const

const VERDICT_CLS: Record<Verdict, string> = {
  good: 'text-primary',
  ok: 'text-amber-600',
  bad: 'text-red-600',
}

let seq = 0
const uniq = (path: string) => `${CF}${path}${path.includes('?') ? '&' : '?'}measId=${Date.now()}${++seq}`
const bodyCache = new Map<number, string>()
const uploadBody = (n: number) => {
  if (!bodyCache.has(n)) bodyCache.set(n, '0'.repeat(n)) // text/plain → 사전 요청(preflight) 없는 단순 요청
  return bodyCache.get(n)!
}

/** 한 번 요청하고 Resource Timing(없으면 performance.now)으로 해석 */
async function measure(
  kind: 'down' | 'up', bytes: number, signal: AbortSignal,
  onProgress?: (loaded: number, ms: number) => void,
): Promise<{ sample: Sample; ping: number; headers: Headers }> {
  const url = kind === 'down' ? uniq(`/__down?bytes=${bytes}`) : uniq('/__up')
  const t0 = performance.now()
  const res = await fetch(url, kind === 'down'
    ? { cache: 'no-store', signal }
    : { method: 'POST', body: uploadBody(bytes), signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const tHead = performance.now()
  const server = serverTimeFromHeader(res.headers.get('server-timing'))
  if (onProgress && res.body) {
    const reader = res.body.getReader()
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      loaded += value.length
      onProgress(loaded, performance.now() - tHead)
    }
  } else {
    await res.arrayBuffer()
  }
  const tEnd = performance.now()
  const e = performance.getEntriesByName(url).slice(-1)[0] as PerformanceResourceTiming | undefined
  const rt = !!e && e.requestStart > 0 && e.responseStart > 0 && e.responseEnd > 0
  const ttfb = rt ? e!.responseStart - e!.requestStart : tHead - t0
  const payload = rt ? e!.responseEnd - e!.responseStart : tEnd - tHead
  return {
    sample: kind === 'down' ? downSample(bytes, ttfb, payload, server) : upSample(bytes, ttfb),
    ping: pingMs(ttfb, server),
    headers: res.headers,
  }
}

function loadHistory(): Result[] {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}
function saveHistory(h: Result[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch { /* 저장소 차단 */ }
}

const num = (v: string | null) => (v !== null && v !== '' && Number.isFinite(+v) ? +v : NaN)
const fmtMs = (v: number) => (Number.isFinite(v) ? (v >= 10 ? String(Math.round(v)) : v.toFixed(1)) : '—')

// 반원 게이지 (제곱근 눈금 — 10Mbps 도 보이게)
function Gauge({ value, label }: { value: number; label: string }) {
  const ratio = gaugeRatio(Number.isFinite(value) ? value : 0)
  const arc = 'M 20 110 A 90 90 0 0 1 200 110'
  const tick = (v: number) => {
    const a = Math.PI * (1 - gaugeRatio(v))
    return { x: 110 + 108 * Math.cos(a), y: 110 - 108 * Math.sin(a) }
  }
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <svg viewBox="-12 0 244 125" overflow="visible" className="w-full" aria-hidden="true">
        <path d={arc} fill="none" stroke="var(--track)" strokeWidth="14" strokeLinecap="round" />
        <path d={arc} fill="none" stroke="var(--primary)" strokeWidth="14" strokeLinecap="round" pathLength={1}
          strokeDasharray={`${ratio} 1`} style={{ transition: 'stroke-dasharray .3s ease' }} opacity={ratio > 0 ? 1 : 0} />
        {[0, 10, 50, 100, 250, 500, 1000].map(v => {
          const p = tick(v)
          return <text key={v} x={p.x} y={p.y + 3} fontSize="8" fill="var(--faint)" textAnchor="middle">{v === 1000 ? '1G' : v}</text>
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="text-4xl sm:text-5xl font-bold text-fg tabular-nums">{fmtMbps(value)}</div>
        <div className="text-sm text-muted">Mbps · {label}</div>
      </div>
    </div>
  )
}

export default function SpeedTest() {
  const t = useTranslations('speedTest')
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [live, setLive] = useState(NaN)
  const [partial, setPartial] = useState<Partial<Result>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [shared, setShared] = useState(false)
  const [meta, setMeta] = useState<Meta>({})
  const [history, setHistory] = useState<Result[]>([])
  const [plan, setPlan] = useState<number>(0)
  const [guideOpen, setGuideOpen] = useState(false)
  const ctrlRef = useRef<AbortController | null>(null)
  const coloRef = useRef<string | undefined>(undefined)

  useEffect(() => { setHistory(loadHistory()) }, [])

  // 공유 링크 (?d=&u=&p=&j=) → 결과 재현
  useEffect(() => {
    const d = num(searchParams.get('d'))
    if (!Number.isFinite(d) || result) return
    setResult({
      ts: 0, down: d, up: num(searchParams.get('u')), ping: num(searchParams.get('p')),
      jitter: num(searchParams.get('j')), loaded: NaN, colo: searchParams.get('c') ?? undefined,
    })
    setShared(true)
    setPhase('done')
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => ctrlRef.current?.abort(), [])

  const running = phase === 'latency' || phase === 'download' || phase === 'upload'

  const stop = useCallback(() => ctrlRef.current?.abort(), [])

  const start = useCallback(async () => {
    if (running) return
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    const signal = ctrl.signal
    try { performance.setResourceTimingBufferSize(1000) } catch { /* 미지원 */ }
    setShared(false)
    setResult(null)
    setPartial({})
    setLive(NaN)
    setMeta({})
    coloRef.current = undefined
    setPhase('latency')

    // 통신사 이름 (자체 /api/ip — 로컬 개발 서버에는 없음)
    fetch('/api/ip', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j) return
        coloRef.current ??= j.colo || undefined
        setMeta(m => ({ colo: m.colo ?? (j.colo || undefined), isp: j.asOrganization || undefined }))
      }).catch(() => {})

    try {
      // 1) 무부하 핑: 첫 요청은 연결 수립(워밍업) → 제외, 중앙값
      const pings: number[] = []
      for (let i = 0; i <= LATENCY_COUNT; i++) {
        const r = await measure('down', 0, signal)
        if (i === 0) continue
        pings.push(r.ping)
        setPartial({ ping: median(pings), jitter: calcJitter(pings) })
      }
      const ping = median(pings)
      const jit = calcJitter(pings)

      // 2) 다운로드 (+ 부하 중 핑: 400ms 마다 병렬 0바이트 요청)
      const loadedPings: number[] = []
      const direction = async (kind: 'down' | 'up', steps: Step[]) => {
        const dirCtrl = new AbortController()
        const onAbort = () => dirCtrl.abort()
        signal.addEventListener('abort', onAbort)
        const hard = setTimeout(() => dirCtrl.abort(), HARD_STOP_MS)
        const done: Sample[] = []
        const skip = kind === 'down' ? 1 : 0
        const t0 = performance.now()
        let loadedOn = false
        let probe: ReturnType<typeof setInterval> | undefined
        if (kind === 'down') {
          probe = setInterval(() => {
            if (!loadedOn) return
            measure('down', 0, dirCtrl.signal).then(r => loadedPings.push(r.ping)).catch(() => {})
          }, 400)
        }
        try {
          let size: number | null
          while ((size = nextSize(steps, done, performance.now() - t0, BUDGET_MS)) !== null) {
            loadedOn = size >= 1e6
            const big = size >= 1e6
            const r = await measure(kind, size, dirCtrl.signal,
              kind === 'down' && big ? (loaded, ms) => { if (ms > 100) setLive(mbps(loaded, ms)) } : undefined)
            done.push(r.sample)
            // 실제 측정 서버 위치: __up 응답만 cf-meta-colo 를 노출 (__down 은 미노출)
            const c = r.headers.get('cf-meta-colo')
            if (c && coloRef.current !== c) { coloRef.current = c; setMeta(m => ({ ...m, colo: c })) }
            const bw = bandwidth(done, skip)
            if (Number.isFinite(bw)) setLive(bw)
          }
        } catch (e) {
          // 사용자 중지 → 전파, 강제 중단(시간 초과) → 모인 표본으로 결과
          if (signal.aborted) throw e
          if (!dirCtrl.signal.aborted && done.length <= skip) throw e
        } finally {
          clearTimeout(hard)
          if (probe) clearInterval(probe)
          signal.removeEventListener('abort', onAbort)
        }
        return bandwidth(done, skip)
      }

      setPhase('download')
      setLive(NaN)
      const down = await direction('down', DOWN_STEPS)
      setPartial(p => ({ ...p, down }))

      setPhase('upload')
      setLive(NaN)
      const up = await direction('up', UP_STEPS)

      const res: Result = {
        ts: Date.now(), down, up, ping, jitter: jit,
        loaded: loadedPings.length >= 3 ? median(loadedPings) : NaN,
        colo: coloRef.current,
      }
      setResult(res)
      setPhase('done')
      setHistory(prev => {
        const next = [res, ...prev].slice(0, 30)
        saveHistory(next)
        return next
      })
      // 결과를 URL에 → 링크로 재현
      const url = new URL(window.location.href)
      url.searchParams.set('d', fmtMbps(down))
      url.searchParams.set('u', fmtMbps(up))
      url.searchParams.set('p', fmtMs(ping))
      url.searchParams.set('j', fmtMs(jit))
      if (res.colo) url.searchParams.set('c', res.colo)
      window.history.replaceState({}, '', url)
    } catch {
      setPhase(signal.aborted ? 'idle' : 'error')
    } finally {
      ctrlRef.current = null
    }
  }, [running])

  const view: Partial<Result> = result ?? partial
  const shownDown = phase === 'download' ? live : (view.down ?? NaN)
  const shownUp = phase === 'upload' ? live : (view.up ?? NaN)
  const gaugeValue = phase === 'upload' ? shownUp : shownDown
  const gaugeLabel = phase === 'upload' ? t('metric.upload') : t('metric.download')

  const measured = useMemo(() => (result
    ? { down: result.down, up: result.up, ping: result.ping, jitter: result.jitter }
    : null), [result])

  const colo = result?.colo ?? meta.colo
  const card = result ? {
    tool: t('title'),
    label: t('share.label'),
    headline: `${fmtMbps(result.down)} Mbps`,
    sub: t('share.sub', { up: fmtMbps(result.up), ping: fmtMs(result.ping) }),
    rows: [
      { label: t('metric.upload'), value: `${fmtMbps(result.up)} Mbps` },
      { label: t('metric.ping'), value: `${fmtMs(result.ping)} ms` },
      { label: t('metric.jitter'), value: `${fmtMs(result.jitter)} ms` },
      ...(colo ? [{ label: t('server.label'), value: `Cloudflare ${colo}` }] : []),
    ],
  } : null

  const fmtDuration = (s: number) => {
    if (!Number.isFinite(s)) return '—'
    if (s < 60) return t('files.sec', { n: s < 10 ? s.toFixed(1) : Math.round(s) })
    if (s < 3600) return t('files.min', { m: Math.floor(s / 60), s: Math.round(s % 60) })
    return t('files.hour', { h: Math.floor(s / 3600), m: Math.round((s % 3600) / 60) })
  }

  const chartData = useMemo(() => [...history].slice(0, 20).reverse().map(h => ({
    x: new Date(h.ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    down: Math.round(h.down), up: Math.round(h.up),
  })), [history])

  const avgDown = history.length ? median(history.map(h => h.down)) : NaN
  const cls = result ? speedClass(result.down) : null

  const phases: Phase[] = ['latency', 'download', 'upload']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 측정 카드 */}
      <div className="ui-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex gap-1.5">
            {phases.map(p => {
              const idx = phases.indexOf(p), cur = phases.indexOf(phase as Phase)
              const on = phase === p
              const past = phase === 'done' || (cur > idx)
              return (
                <span key={p} className={`px-3 py-1 rounded-full text-xs font-medium ${on ? 'bg-primary text-white' : past ? 'bg-primary-soft text-primary' : 'bg-soft text-muted'}`}>
                  {t(`phase.${p}`)}
                </span>
              )
            })}
          </div>
          <span className="text-muted text-xs">
            {colo ? t('server.value', { colo }) : t('server.pending')}
            {meta.isp ? ` · ${meta.isp}` : ''}
          </span>
        </div>

        <div className="mt-4">
          <Gauge value={running ? gaugeValue : (result?.down ?? NaN)} label={running ? gaugeLabel : t('metric.download')} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
          {[
            { k: 'download', v: fmtMbps(shownDown), u: 'Mbps', on: phase === 'download' },
            { k: 'upload', v: fmtMbps(shownUp), u: 'Mbps', on: phase === 'upload' },
            { k: 'ping', v: fmtMs(view.ping ?? NaN), u: 'ms', on: phase === 'latency' },
            { k: 'jitter', v: fmtMs(view.jitter ?? NaN), u: 'ms', on: phase === 'latency' },
          ].map(m => (
            <div key={m.k} className={`rounded-xl p-3 text-center ${m.on ? 'bg-primary-soft' : 'bg-subtle'}`}>
              <div className={`text-xs ${m.on ? 'text-primary' : 'text-muted'}`}>{t(`metric.${m.k}`)}</div>
              <div className="text-xl font-bold text-fg tabular-nums mt-0.5">{m.v}<span className="text-xs font-normal text-muted ml-1">{m.u}</span></div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          {running ? (
            <button onClick={stop} className="ui-btn-soft px-8 py-3 min-w-48">
              <Square className="w-4 h-4" /> {t('stop')}
            </button>
          ) : (
            <button onClick={start} className="ui-btn px-8 py-3 min-w-48">
              <Play className="w-4 h-4" /> {result && !shared ? t('again') : t('start')}
            </button>
          )}
        </div>
        {phase === 'error' && (
          <p className="mt-4 bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm" role="alert">{t('errorMsg')}</p>
        )}
        <p className="text-xs text-faint text-center mt-4">{t('method')}</p>
      </div>

      {/* 결과 */}
      {result && phase === 'done' && (
        <div className="space-y-3">
          <div className="ui-hero p-6 sm:p-8" aria-live="polite">
            <div className="text-sm text-white/70">{shared ? t('hero.shared') : t('hero.label')}</div>
            <div className="text-4xl sm:text-5xl font-bold tabular-nums mt-1">
              {fmtMbps(result.down)}<span className="text-xl font-semibold ml-1">Mbps</span>
            </div>
            <div className="text-white/80 mt-2">
              {t('hero.sub', { up: fmtMbps(result.up), ping: fmtMs(result.ping), jitter: fmtMs(result.jitter) })}
            </div>
            {cls && (
              <div className="mt-4 text-sm text-white/90">
                <span className="font-semibold">{t(cls)}</span> · {t(`${cls}Desc`)}
              </div>
            )}
            {Number.isFinite(result.loaded) && (
              <div className="mt-1 text-sm text-white/70">
                {t('hero.loaded', { loaded: fmtMs(result.loaded), diff: fmtMs(Math.max(0, result.loaded - result.ping)) })}
              </div>
            )}
            {shared && <div className="mt-3 text-sm text-white/70">{t('hero.sharedHint')}</div>}
          </div>
          {card && <ShareResult card={card} text={t('share.text', { d: fmtMbps(result.down), u: fmtMbps(result.up), p: fmtMs(result.ping) })} fileName="toolhub-speed-test" />}
        </div>
      )}

      {/* 요금제 비교 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('plan.title')}</h2>
        <div className="flex gap-1 mt-3 p-1 bg-soft rounded-xl w-fit" role="radiogroup">
          {PLANS.map(p => (
            <button key={p} role="radio" aria-checked={plan === p} onClick={() => setPlan(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${plan === p ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
              {p === 0 ? t('plan.none') : p === 1000 ? '1G' : `${p}M`}
            </button>
          ))}
        </div>
        {plan > 0 && result && (
          <div className="mt-4 bg-subtle rounded-2xl p-5">
            <div className="text-sm text-sub">{t('plan.ratio', { pct: Math.round((result.down / plan) * 100) })}</div>
            <div className="h-2 bg-track rounded-full mt-2 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${Math.min(100, (result.down / plan) * 100)}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-fg" style={{ left: '50%' }} />
            </div>
            <p className={`text-sm font-medium mt-3 ${result.down >= planGuarantee(plan) ? 'text-primary' : 'text-amber-700'}`}>
              {result.down >= planGuarantee(plan)
                ? t('plan.meets', { g: planGuarantee(plan) })
                : t('plan.below', { g: planGuarantee(plan) })}
            </p>
          </div>
        )}
        {plan > 0 && !result && <p className="text-sm text-muted mt-3">{t('plan.needResult')}</p>}
        <ul className="mt-4 space-y-1.5 text-sm text-sub list-disc pl-5">
          {(t.raw('plan.notes') as string[]).map((n, i) => <li key={i}>{n}</li>)}
        </ul>
        <a href="https://speed.nia.or.kr/" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-primary mt-3 hover:underline">
          {t('plan.nia')}
        </a>
      </div>

      {/* 용도별 판정 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('uses.title')}</h2>
        <p className="text-sm text-muted mt-1">{measured ? t('uses.hintMeasured') : t('uses.hint')}</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="py-2 pr-3 font-medium">{t('uses.colUse')}</th>
                <th className="py-2 pr-3 font-medium">{t('uses.colNeed')}</th>
                <th className="py-2 font-medium text-right">{t('uses.colResult')}</th>
              </tr>
            </thead>
            <tbody>
              {USES.map(u => {
                const v = measured ? verdict(u.need, measured) : null
                return (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3 text-body">{t(`uses.${u.id}.name`)}</td>
                    <td className="py-2.5 pr-3 text-muted">{t(`uses.${u.id}.need`)}</td>
                    <td className={`py-2.5 text-right font-semibold whitespace-nowrap ${v ? VERDICT_CLS[v] : 'text-faint'}`}>
                      {v ? t(`uses.${v}`) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {result && (
          <div className="mt-5 bg-subtle rounded-2xl p-5">
            <div className="text-sm font-semibold text-body mb-2">{t('files.title', { d: fmtMbps(result.down) })}</div>
            <div className="grid sm:grid-cols-3 gap-2">
              {FILES.map(f => (
                <div key={f.id} className="text-sm">
                  <div className="text-muted">{t(`files.${f.id}`)}</div>
                  <div className="font-semibold text-fg tabular-nums">{fmtDuration(downloadSeconds(f.gb, result.down))}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 측정 기록 */}
      <div className="ui-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{t('history')}</h2>
          {history.length > 0 && (
            <button onClick={() => { setHistory([]); saveHistory([]) }} className="text-sm text-muted hover:text-fg">{t('hist.clear')}</button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted mt-3">{t('historyEmpty')}</p>
        ) : (
          <>
            <p className="text-sm text-muted mt-1">{t('hist.summary', { count: history.length, d: fmtMbps(avgDown) })}</p>
            {chartData.length >= 2 && (
              <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="x" tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--line)" tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--line)" tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v, name) => [`${v ?? 0} Mbps`, name === 'down' ? t('metric.download') : t('metric.upload')]} />
                    <Line type="monotone" dataKey="down" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="up" stroke="var(--faint)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-muted border-b border-line">
                    <th className="py-2 pr-3 font-medium">{t('hist.date')}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t('metric.download')}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t('metric.upload')}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t('metric.ping')}</th>
                    <th className="py-2 font-medium text-right">{t('server.short')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map(h => (
                    <tr key={h.ts} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3 text-muted whitespace-nowrap">{new Date(h.ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-fg">{fmtMbps(h.down)}</td>
                      <td className="py-2 pr-3 text-right text-body">{fmtMbps(h.up)}</td>
                      <td className="py-2 pr-3 text-right text-body">{fmtMs(h.ping)}</td>
                      <td className="py-2 text-right text-muted">{h.colo ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 결과가 낮게 나오는 이유 */}
      <div className="bg-subtle rounded-2xl p-5">
        <h2 className="font-semibold text-fg">{t('caveats.title')}</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-sub list-disc pl-5">
          {(t.raw('caveats.items') as string[]).map((c, i) => <li key={i}>{c}</li>)}
        </ul>
        <p className="text-xs text-muted mt-3">{t('disclaimer')}</p>
      </div>

      {/* 가이드 */}
      <div className="ui-card overflow-hidden">
        <button className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-subtle transition-colors"
          onClick={() => setGuideOpen(v => !v)} aria-expanded={guideOpen}>
          <h2 className="text-lg font-semibold text-fg">{t('guideTitle')}</h2>
          {guideOpen ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
        </button>
        {guideOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-line pt-4">
            {(['guideSection1', 'guideSection2'] as const).map(s => (
              <div key={s}>
                <h3 className="font-semibold text-body mb-2">{t(`${s}Title`)}</h3>
                <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
                  {(t.raw(`${s}Items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
