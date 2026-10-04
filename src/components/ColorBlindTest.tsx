'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/colorBlindTest'
import { Delete, RotateCcw, Check, X, ArrowRight } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  generatePlates, plateDots, scoreTest, expectedAnswer, dotHex, NONE, PLATE_COUNT,
  type Plate, type Observer, type Verdict,
} from '@/utils/colorBlindTest'

const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

function PlateCanvas({ plate, size, observer = 'normal', className = '' }: { plate: Plate; size: number; observer?: Observer; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const dots = useMemo(() => plateDots(plate), [plate])
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    const half = size / 2
    for (const d of dots) {
      ctx.fillStyle = dotHex(d.color, observer)
      ctx.beginPath()
      ctx.arc(half + d.x * half, half + d.y * half, d.r * half, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [dots, size, observer])
  return <canvas ref={ref} style={{ width: size, height: size }} className={`max-w-full h-auto ${className}`} aria-hidden="true" />
}

type Phase = 'intro' | 'test' | 'result'

export default function ColorBlindTest() {
  const t = useTranslations('colorBlindTest')
  const [phase, setPhase] = useState<Phase>('intro')
  const [seed, setSeed] = useState(20261001) // 첫 렌더(서버 HTML)는 고정 시드, 시작할 때 새로 뽑음
  const plates = useMemo(() => generatePlates(seed), [seed])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [view, setView] = useState<Observer>('normal')

  const start = () => {
    setSeed(Math.floor(Math.random() * 2 ** 31))
    setIndex(0); setAnswers([]); setInput(''); setView('normal'); setPhase('test')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = useCallback((value: string) => {
    if (!value) return
    const next = [...answers, value]
    setAnswers(next)
    setInput('')
    if (next.length >= plates.length) setPhase('result')
    else setIndex(next.length)
  }, [answers, plates.length])

  const press = useCallback((k: string) => {
    if (k === 'del') setInput((v) => v.slice(0, -1))
    else setInput((v) => (v.length >= 2 ? v : v === '' && k === '0' ? v : v + k))
  }, [])

  useEffect(() => {
    if (phase !== 'test') return
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
      else if (e.key === 'Enter') submit(input)
      else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') submit(NONE)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, input, press, submit])

  const score = useMemo(() => (phase === 'result' ? scoreTest(plates, answers) : null), [phase, plates, answers])
  const ans = (a: string) => (a === NONE ? t('test.notVisible') : a)
  const kindLabel = (p: Plate) => t(`kinds.${p.kind}`, { target: p.target ? t(`deficiency.${p.target}`) : '' })

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
      <p className="text-sm text-muted mt-1">{t('description')}</p>
    </div>
  )

  const guide = (
    <>
      <div className="ui-card p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {(['about', 'types'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-base font-bold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc list-inside space-y-2 text-body">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <GuideSection namespace="colorBlindTest" />
    </>
  )

  // ── 시작 화면 ──
  if (phase === 'intro') {
    return (
      <div className="space-y-8">
        {header}
        <div className="ui-card p-6 grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center">
            <PlateCanvas plate={plates[0]} size={300} />
            <p className="text-sm text-muted mt-3">{t('intro.preview', { n: plates[0].normal })}</p>
          </div>
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-fg">{t('intro.title')}</h2>
              <p className="text-body mt-2">{t('intro.lead', { count: PLATE_COUNT })}</p>
            </div>
            <ul className="bg-subtle rounded-2xl p-5 space-y-2 text-sm text-sub">
              {(t.raw('intro.checklist') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />{item}</li>
              ))}
            </ul>
            <button onClick={start} className="ui-btn w-full px-4 py-3">{t('intro.start')}</button>
            <p className="text-xs text-muted">{t('intro.note')}</p>
          </div>
        </div>
        {guide}
      </div>
    )
  }

  // ── 검사 ──
  if (phase === 'test') {
    const plate = plates[index]
    return (
      <div className="space-y-8">
        {header}
        <div className="ui-card p-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-fg">{t('test.progress', { n: index + 1, total: plates.length })}</span>
            {index === 0 && <span className="text-muted">{t('kinds.demo')}</span>}
          </div>
          <div className="w-full bg-track rounded-full h-2 mb-6">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${(index / plates.length) * 100}%` }} />
          </div>

          <div className="flex justify-center mb-5">
            <PlateCanvas key={plate.id + '-' + seed} plate={plate} size={340} />
          </div>

          <p className="text-center text-body mb-3">{t('test.instruction')}</p>
          <div className="ui-field h-14 flex items-center justify-center text-3xl font-bold tabular-nums text-fg mb-3" aria-live="polite">
            {input || <span className="text-base font-normal text-faint">{t('test.placeholder')}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
              <button key={k} onClick={() => press(k)} className="bg-soft hover:bg-subtle text-fg rounded-xl py-3 text-xl font-semibold tabular-nums">{k}</button>
            ))}
            <button onClick={() => submit(NONE)} className="bg-soft hover:bg-subtle text-body rounded-xl py-3 text-sm font-semibold">{t('test.notVisible')}</button>
            <button onClick={() => press('0')} className="bg-soft hover:bg-subtle text-fg rounded-xl py-3 text-xl font-semibold">0</button>
            <button onClick={() => press('del')} aria-label={t('test.clear')} className="bg-soft hover:bg-subtle text-body rounded-xl py-3 flex items-center justify-center">
              <Delete className="w-5 h-5" />
            </button>
          </div>
          <button onClick={() => submit(input)} disabled={!input} className="ui-btn w-full px-4 py-3 mt-3 disabled:opacity-40">
            {index === plates.length - 1 ? t('test.finish') : t('test.next')}
          </button>
          <p className="text-xs text-muted text-center mt-3">{t('test.hint')}</p>
        </div>
      </div>
    )
  }

  // ── 결과 ──
  const s = score!
  const v: Verdict = s.verdict
  const verdictText = t(`verdict.${v}`)
  const rgPass = s.rgTotal - s.rgFails
  const tritanPass = s.tritanTotal - s.tritanFails
  return (
    <div className="space-y-8">
      {header}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t('result.title')}</div>
            <div className="text-3xl font-bold mt-2">{verdictText}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">{t('result.summary', { correct: s.correct, total: s.total })}</div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('confidence.label')}: {t(`confidence.${s.confidence}`)}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('result.rgPlates')} {rgPass}/{s.rgTotal}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('result.tritanPlates')} {tritanPass}/{s.tritanTotal}</span>
            </div>
          </div>

          <div className="ui-card p-6 space-y-3">
            <p className="text-body leading-relaxed">{t(`verdictDesc.${v}`)}</p>
            <p className="text-sm text-sub leading-relaxed">{t(`confidenceDesc.${s.confidence}`)}</p>
            {(s.protan > 0 || s.deutan > 0) && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {(['protan', 'deutan'] as const).map((k) => (
                  <div key={k} className="bg-subtle rounded-xl p-4">
                    <div className="text-sm text-sub">{t(`result.signal.${k}`)}</div>
                    <div className="text-2xl font-bold text-fg tabular-nums">{s[k]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 rounded-2xl p-5 text-sm space-y-1">
            <p className="font-semibold">{t('disclaimer.title')}</p>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('disclaimer.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('share.label'),
              headline: verdictText,
              sub: t('result.summary', { correct: s.correct, total: s.total }),
              rows: [
                { label: t('result.rgPlates'), value: `${rgPass}/${s.rgTotal}` },
                { label: t('result.tritanPlates'), value: `${tritanPass}/${s.tritanTotal}` },
                { label: t('confidence.label'), value: t(`confidence.${s.confidence}`) },
              ],
            }}
            text={t('share.text', { correct: s.correct, total: s.total, verdict: verdictText })}
            fileName="color-vision-test"
          />
        </div>

        <div className="space-y-3">
          <button onClick={start} className="ui-btn w-full px-4 py-3"><RotateCcw className="w-4 h-4" />{t('result.retake')}</button>
          <Link href="/color-blindness-simulator/" className="ui-btn-soft w-full px-4 py-3 flex items-center justify-center gap-2">
            {t('result.simulatorLink')}<ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-muted">{t('result.simulatorDesc')}</p>
        </div>
      </div>

      {/* 판별 상세 */}
      <div className="ui-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-semibold text-fg">{t('result.breakdown')}</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('result.viewAs')}>
            {(['normal', 'protan', 'deutan', 'tritan'] as const).map((o) => (
              <button key={o} className={seg(view === o)} onClick={() => setView(o)}>{t(`view.${o}`)}</button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted mb-4">{t('result.viewDesc')}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {s.outcomes.map((o) => (
            <div key={o.plate.id} className="flex gap-4 p-3 rounded-xl bg-subtle">
              <PlateCanvas plate={o.plate} size={96} observer={view} className="shrink-0" />
              <div className="min-w-0 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-fg">{t('result.plateN', { n: o.plate.id })}</span>
                  {o.correct
                    ? <Check className="w-4 h-4 text-primary" aria-label={t('result.correct')} />
                    : <X className="w-4 h-4 text-red-500" aria-label={t('result.wrong')} />}
                </div>
                <div className="text-muted">{kindLabel(o.plate)}</div>
                <div className="text-body">{t('result.yourAnswer')}: <b className="tabular-nums">{ans(o.answer)}</b></div>
                <div className="text-sub tabular-nums">
                  {t('view.normal')} {ans(expectedAnswer(o.plate, 'normal'))} · {t('deficiency.protan')} {ans(expectedAnswer(o.plate, 'protan'))} · {t('deficiency.deutan')} {ans(expectedAnswer(o.plate, 'deutan'))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {guide}
    </div>
  )
}
