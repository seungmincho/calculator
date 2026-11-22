'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/mandalart'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import { createShareResultDownloads } from '@/utils/shareResultActions'
import {
  cellOf, toBlock, actIndex, textOf, withCell, isEmpty, progress, pct, sameChart, saveText, parseSaved, encode, decode, fromTemplate, wrapText,
  EMPTY, NO_DONE, RING, BLOCK_ORDER, CELL_MAX, SAVE_KEY, URL_WARN, TEMPLATE_IDS, EXAMPLE_ID,
  type Cell, type Chart, type Saved, type TemplateId,
} from '@/utils/mandalart'

type View = 'grid' | 'edit'
type Status = 'saving' | 'saved' | 'saveFailed'

const GUIDE = ['what', 'howTo', 'actions', 'tips'] as const
const PRINT_ID = 'mandalart-print'
const chip = (on: boolean) =>
  `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const navBtn = 'ui-btn-soft inline-flex size-11 shrink-0 items-center justify-center'
/** 편집 칸 테두리·배경: 핵심 = 파랑 테두리, 세부 목표 = primary-soft, 실천 = 흰 칸 */
const cellBox = (c: Cell) =>
  c.kind === 'core' ? 'border-primary bg-primary-soft' : c.kind === 'goal' ? 'border-transparent bg-primary-soft' : 'border-line bg-surface'

const readSaved = (): Saved | null => {
  try { return parseSaved(window.localStorage.getItem(SAVE_KEY)) } catch { return null }
}
const store = (chart: Chart, done: readonly boolean[]): boolean => {
  try { window.localStorage.setItem(SAVE_KEY, saveText(chart, done)); return true } catch { return false }
}

// ── PNG: 9×9 를 캔버스에 직접 그린다(2배). 내보내기는 늘 밝은 색(globals.css :root 값)
const INK = { bg: '#ffffff', fg: '#191f28', body: '#333d4b', muted: '#6b7684', line: '#d1d6db', soft: '#e8f3ff', primary: '#3182f6' }
const CELL = 120, GAP = 3, BGAP = 10, PAD = 28, FOOT = 40, LINE = 18, INSET = 8

async function renderPng(chart: Chart, footer: string): Promise<Blob> {
  await document.fonts?.ready
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
  const block = CELL * 3 + GAP * 2
  const size = block * 3 + BGAP * 2
  const w = size + PAD * 2, h = size + PAD + FOOT
  const canvas = document.createElement('canvas')
  canvas.width = w * 2
  canvas.height = h * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.scale(2, 2)
  ctx.fillStyle = INK.bg
  ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const maxLines = Math.floor((CELL - INSET * 2) / LINE)
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const { b, p } = toBlock(r, c)
    const cell = cellOf(b, p)
    const x = PAD + Math.floor(c / 3) * (block + BGAP) + (c % 3) * (CELL + GAP)
    const y = PAD + Math.floor(r / 3) * (block + BGAP) + (r % 3) * (CELL + GAP)
    ctx.beginPath()
    ctx.roundRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1, 10)
    ctx.fillStyle = cell.kind === 'act' ? INK.bg : INK.soft
    ctx.fill()
    if (cell.kind !== 'goal') {
      ctx.lineWidth = cell.kind === 'core' ? 2 : 1
      ctx.strokeStyle = cell.kind === 'core' ? INK.primary : INK.line
      ctx.stroke()
    }
    ctx.font = `${cell.kind === 'act' ? 500 : 700} 14px ${family}`
    ctx.fillStyle = cell.kind === 'act' ? INK.body : INK.fg
    const lines = wrapText(textOf(chart, cell), CELL - INSET * 2, maxLines, (s) => ctx.measureText(s).width)
    lines.forEach((l, i) => ctx.fillText(l, x + CELL / 2, y + CELL / 2 + (i - (lines.length - 1) / 2) * LINE))
  }
  ctx.font = `500 13px ${family}`
  ctx.fillStyle = INK.muted
  ctx.textAlign = 'right'
  ctx.fillText(footer, w - PAD, h - FOOT / 2)
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((bl) => (bl ? resolve(bl) : reject(new Error('toBlob'))), 'image/png'))
}

// ── 인쇄: A4 가로 한 장, 20mm 칸 9×9. 블록 경계는 굵은 선
const PRINT_CSS = `@media print{body>*:not(#${PRINT_ID}){display:none!important}html,body{background:#fff!important}@page{size:A4 landscape;margin:10mm}}
#${PRINT_ID} table{border-collapse:collapse;table-layout:fixed;margin:0 auto}
#${PRINT_ID} td{width:20mm;height:20mm;padding:1mm;border:.25mm solid #d1d6db;text-align:center;vertical-align:middle;color:#333d4b;font-size:8pt;line-height:1.25}
#${PRINT_ID} td>div{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:5;overflow:hidden;overflow-wrap:anywhere}
#${PRINT_ID} .md-h{background:#e8f3ff;color:#191f28;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#${PRINT_ID} .md-k{font-weight:700;border:.6mm solid #3182f6}
#${PRINT_ID} .md-l{border-left:.6mm solid #191f28}
#${PRINT_ID} .md-t{border-top:.6mm solid #191f28}
#${PRINT_ID} td:last-child{border-right:.6mm solid #191f28}
#${PRINT_ID} tr:last-child>td{border-bottom:.6mm solid #191f28}`

export default function Mandalart() {
  const t = useTranslations('mandalart')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  const [chart, setChart] = useState<Chart>(EMPTY)
  const [done, setDone] = useState<boolean[]>(NO_DONE)
  const [loaded, setLoaded] = useState(false)
  /** 풀어야 할 ?m= (마운트 뒤 비동기) */
  const [incoming, setIncoming] = useState<string | null>(null)
  /** 링크로 받은 표를 보는 중: 내 표에 저장하기 전까지 자동 저장하지 않는다 */
  const [fromLink, setFromLink] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const [link, setLink] = useState({ ok: true, len: 0 })
  const [storageOk, setStorageOk] = useState(true)
  const [view, setView] = useState<View>('grid')
  const [block, setBlock] = useState(4)
  const [status, setStatus] = useState<Status | null>(null)
  const downloads = useMemo(() => createShareResultDownloads(), [])
  useEffect(() => { downloads.activate(); return () => downloads.dispose() }, [downloads])

  // 첫 렌더 = 빈 표(정적 HTML 과 같다, 빈 칸에는 흐린 예시). 하이드레이션 뒤 저장된 표, ?m= 이 있으면 그 표를 먼저
  if (hydrated && !loaded) {
    setLoaded(true)
    const saved = readSaved()
    if (saved) { setChart(saved.chart); setDone(saved.done) }
    const m = sp.get('m')
    if (m) setIncoming(m)
  }
  useEffect(() => {
    if (!incoming) return
    let live = true
    decode(incoming).then((c) => {
      if (!live) return
      setIncoming(null)
      if (!c) { setLinkError(true); return }
      const mine = readSaved()
      if (mine && sameChart(mine.chart, c)) return // 내 표의 링크(새로고침 등) — 체크 그대로
      setChart(c)
      setDone(NO_DONE)
      if (mine && !isEmpty(mine.chart)) setFromLink(true) // 덮어쓰기 전에 고르게 한다
      else setStorageOk(store(c, NO_DONE))
    })
    return () => { live = false }
  }, [incoming])

  // 화면의 표 → 주소창 ?m= (빈 표면 쿼리 없음). ShareResult 는 누른 순간의 주소를 쓴다
  useEffect(() => {
    if (!loaded || incoming) return
    let live = true
    encode(chart).then(
      (m) => {
        if (!live) return
        const { pathname, hash } = window.location
        window.history.replaceState(window.history.state, '', `${pathname}${m ? `?m=${m}` : ''}${hash}`)
        setLink({ ok: true, len: m ? window.location.href.length : 0 })
      },
      () => { if (live) setLink({ ok: false, len: 0 }) },
    )
    return () => { live = false }
  }, [chart, loaded, incoming])

  const apply = (c: Chart, d: boolean[], save = !fromLink) => {
    setChart(c)
    setDone(d)
    setStatus(null)
    if (save) setStorageOk(store(c, d))
  }
  const edit = (cell: Cell, value: string) => {
    const next = withCell(chart, cell, value)
    // 실천 칸을 비우면 체크도 푼다(다시 채웠을 때 예전 체크가 살아나지 않게)
    const i = cell.kind === 'act' ? actIndex(cell.g, cell.k) : -1
    apply(next, i >= 0 && done[i] && !next.acts[i].trim() ? done.map((x, j) => (j === i ? false : x)) : done)
  }
  const toggle = (i: number) => apply(chart, done.map((x, j) => (j === i ? !x : x)))

  const tpl = (id: TemplateId) => (id === 'blank' ? EMPTY : fromTemplate(t.raw(`templates.data.${id}`)))
  const example = tpl(EXAMPLE_ID)
  const tplId = TEMPLATE_IDS.find((id) => sameChart(chart, tpl(id))) ?? null
  const checked = done.some(Boolean)
  const empty = isEmpty(chart)
  const applyTemplate = (id: TemplateId) => {
    if (id === tplId && !checked) return
    if (!empty && (tplId === null || checked) && !window.confirm(t('templates.confirm', { name: t(`templates.names.${id}`) }))) return
    apply(tpl(id), NO_DONE)
    setBlock(4)
  }
  const reset = () => {
    if (!window.confirm(t('save.resetConfirm'))) return
    setFromLink(false)
    apply(EMPTY, NO_DONE, true)
    setBlock(4)
  }
  const keepLink = () => {
    setFromLink(false)
    setStorageOk(store(chart, done))
  }
  const backToMine = () => {
    const mine = readSaved()
    setFromLink(false)
    setChart(mine?.chart ?? EMPTY)
    setDone(mine?.done ?? NO_DONE)
  }
  const openBlock = (b: number) => {
    flushSync(() => { setBlock(b); setView('edit') })
    document.getElementById('md-editor')?.scrollIntoView({ block: 'nearest' })
  }
  const step = (d: number) => setBlock(BLOCK_ORDER[(BLOCK_ORDER.indexOf(block) + d + 9) % 9])
  const savePng = async () => {
    setStatus('saving')
    try {
      const blob = await renderPng(chart, `${t('share.tool')} · toolhub.ai.kr/mandalart`)
      setStatus(downloads.download(blob, 'mandalart.png', () => true) === 'started' ? 'saved' : 'saveFailed')
    } catch { setStatus('saveFailed') }
  }

  const goalName = (g: number) => chart.goals[g].trim() || t('edit.goal', { n: g + 1 })
  const blockName = (b: number) => (b === 4 ? t('edit.core') : goalName(RING.indexOf(b)))
  const cellName = (c: Cell) =>
    c.kind === 'core' ? t('edit.core') : c.kind === 'goal' ? t('edit.goal', { n: c.g + 1 }) : t('edit.act', { n: c.k + 1 })
  const g = block === 4 ? -1 : RING.indexOf(block)
  const pr = progress(chart, done)
  const goalsFilled = chart.goals.flatMap((s, i) => (s.trim() ? [{ s: s.trim(), n: i + 1 }] : []))
  const card = {
    tool: t('share.tool'),
    label: t('share.label'),
    headline: chart.core.trim() || t('share.noCore'),
    sub: pr.filled
      ? t('share.sub', { done: pr.done, filled: pr.filled, p: pct(pr) })
      : t('share.subPlan', { goals: goalsFilled.length, acts: pr.filled }),
    rows: goalsFilled.slice(0, 4).map((x) => ({ label: t('share.goalRow', { n: x.n }), value: x.s })),
  }
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      {fromLink && (
        <section role="status" className="bg-subtle rounded-2xl p-5 space-y-3">
          <p className="text-sm text-body">{t('link.banner')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={keepLink} className="ui-btn min-h-11 px-4 py-2.5 text-sm">{t('link.keep')}</button>
            <button type="button" onClick={backToMine} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm">{t('link.back')}</button>
          </div>
        </section>
      )}
      {linkError && <p role="alert" className={warnCls}>{t(typeof DecompressionStream === 'undefined' ? 'link.unsupported' : 'link.error')}</p>}

      <section className="ui-card p-6" aria-labelledby="md-tpl">
        <h2 id="md-tpl" className="text-lg font-semibold text-fg">{t('templates.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('templates.desc')}</p>
        <div role="group" aria-labelledby="md-tpl" className="flex flex-wrap gap-2 mt-4">
          {TEMPLATE_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={tplId === id} onClick={() => applyTemplate(id)} className={chip(tplId === id)}>
              {t(`templates.names.${id}`)}
            </button>
          ))}
        </div>
      </section>

      {/* 모바일: 전체 보기 ↔ 블록 편집. 넓은 화면은 둘 다 나란히 */}
      <div role="group" aria-label={t('view.label')} className="lg:hidden grid grid-cols-2 gap-2">
        {(['grid', 'edit'] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={chip(view === v)}>{t(`view.${v}`)}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 블록 편집 */}
        <section id="md-editor" aria-labelledby="md-edit"
          className={`ui-card p-4 sm:p-6 space-y-4 min-w-0 scroll-mt-20 ${view === 'edit' ? '' : 'hidden lg:block'}`}>
          <h2 id="md-edit" className="text-lg font-semibold text-fg">{t('edit.title')}</h2>
          <div role="group" aria-label={t('edit.minimap')} className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }, (_, b) => {
              const on = b === block
              return (
                <button key={b} type="button" aria-pressed={on} aria-label={t('edit.pick', { name: blockName(b) })} onClick={() => setBlock(b)}
                  className={`min-h-11 min-w-0 rounded-xl px-2 py-1.5 text-xs font-medium leading-tight transition-colors ${on ? 'bg-primary text-white' : b === 4 ? 'bg-primary-soft text-primary hover:bg-soft' : 'bg-soft text-body hover:bg-subtle'}`}>
                  <span className="line-clamp-2 [overflow-wrap:anywhere]">{b === 4 ? t('edit.coreShort') : goalName(RING.indexOf(b))}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => step(-1)} aria-label={t('edit.prev')} className={navBtn}><ChevronLeft className="size-5" aria-hidden /></button>
            <div className="min-w-0 flex-1 text-center" aria-live="polite">
              <p className="text-sm font-semibold text-fg truncate">
                {block === 4 ? t('edit.coreBlock') : chart.goals[g].trim() ? t('edit.goalBlock', { n: g + 1, name: chart.goals[g].trim() }) : t('edit.goal', { n: g + 1 })}
              </p>
              <p className="text-xs text-muted tabular-nums">{t('edit.position', { i: BLOCK_ORDER.indexOf(block) + 1 })}</p>
            </div>
            <button type="button" onClick={() => step(1)} aria-label={t('edit.next')} className={navBtn}><ChevronRight className="size-5" aria-hidden /></button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, p) => {
              const cell = cellOf(block, p)
              const value = textOf(chart, cell)
              const i = cell.kind === 'act' ? actIndex(cell.g, cell.k) : -1
              const id = `md-cell-${p}`
              return (
                <div key={`${block}-${p}`} className={`flex min-w-0 flex-col rounded-xl border p-1.5 focus-within:ring-2 focus-within:ring-primary ${cellBox(cell)}`}>
                  <label htmlFor={id} className="px-1 text-[11px] font-medium text-muted">{cellName(cell)}</label>
                  <textarea
                    id={id} value={value} placeholder={textOf(example, cell)} maxLength={CELL_MAX} rows={3}
                    onChange={(e) => edit(cell, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault() // 칸은 한 줄 — Enter 는 다음 칸으로(한글 조합 중에는 이동하지 않는다)
                      if (!e.nativeEvent.isComposing) document.getElementById(`md-cell-${p + 1}`)?.focus()
                    }}
                    className={`min-h-[4.5rem] w-full flex-1 resize-none bg-transparent px-1 text-center text-base sm:text-sm leading-snug text-fg placeholder:text-faint focus:outline-none [overflow-wrap:anywhere] ${cell.kind === 'core' ? 'font-bold' : cell.kind === 'goal' ? 'font-semibold' : ''}`}
                  />
                  {i >= 0 && (
                    <button
                      type="button" aria-pressed={done[i]} disabled={!value.trim()} onClick={() => toggle(i)}
                      aria-label={t('edit.doneAria', { name: value.trim() || cellName(cell) })}
                      className={`mt-1 min-h-11 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${done[i] ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}
                    >
                      {t('edit.done')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {block !== 4 && <p className="text-xs text-muted">{t('edit.linked')}</p>}
          <p className="text-xs text-muted">{t('edit.hint', { max: CELL_MAX })}</p>
        </section>

        {/* 전체 보기 9×9 (읽기용). 블록을 누르면 그 블록 편집 */}
        <section id="mandalart-result" aria-labelledby="md-grid"
          className={`ui-card p-4 sm:p-6 space-y-4 min-w-0 scroll-mt-20 ${view === 'grid' ? '' : 'hidden lg:block'}`}>
          <div>
            <h2 id="md-grid" className="text-lg font-semibold text-fg">{t('grid.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('grid.desc')}</p>
          </div>
          {/* 휴대폰(375px)에선 칸이 37px라 글자가 안 읽힘 → 표만 540px로 두고 가로로 밀어 본다(페이지는 넘치지 않음) */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="grid min-w-[540px] grid-cols-3 gap-1 sm:min-w-0 sm:gap-1.5">
            {Array.from({ length: 9 }, (_, b) => (
              <button key={b} type="button" onClick={() => openBlock(b)} aria-label={t('grid.open', { name: blockName(b) })}
                className={`grid min-w-0 grid-cols-3 gap-px overflow-hidden rounded-lg border bg-line transition-colors ${b === block ? 'border-primary' : 'border-line-strong hover:border-primary'}`}>
                {Array.from({ length: 9 }, (_, p) => {
                  const cell = cellOf(b, p)
                  const v = textOf(chart, cell).trim()
                  const i = cell.kind === 'act' ? actIndex(cell.g, cell.k) : -1
                  const tone = !v ? 'text-faint' : i >= 0 && done[i] ? 'text-muted line-through' : cell.kind === 'act' ? 'text-body' : 'font-semibold text-fg'
                  return (
                    <span key={p} aria-hidden
                      className={`flex aspect-square min-w-0 items-center justify-center overflow-hidden p-0.5 text-center text-[11px] leading-tight sm:text-xs ${cell.kind === 'act' ? 'bg-surface' : 'bg-primary-soft'} ${tone}`}>
                      <span className="line-clamp-3 [overflow-wrap:anywhere]">{v || textOf(example, cell)}</span>
                    </span>
                  )
                })}
              </button>
            ))}
          </div>
          </div>
          <p aria-live="polite" className="text-sm text-sub tabular-nums">
            {pr.filled ? t('grid.progress', { done: pr.done, filled: pr.filled, p: pct(pr) }) : t('grid.progressEmpty')}
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 실천 체크 */}
        <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="md-progress">
          <div>
            <h2 id="md-progress" className="text-lg font-semibold text-fg">{t('progress.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('progress.desc')}</p>
          </div>
          <div aria-live="polite">
            {pr.filled === 0 ? <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('progress.empty')}</p> : (
              <>
                <p className="text-sm text-sub">{t('progress.total')}</p>
                <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{pct(pr)}%</p>
                <p className="text-sm text-body tabular-nums">{t('progress.count', { done: pr.done, filled: pr.filled })}</p>
              </>
            )}
          </div>
          {pr.filled > 0 && (
            <ul className="space-y-3">
              {pr.goals.map((x, gi) => x.filled > 0 && (
                <li key={gi}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-body">{goalName(gi)}</span>
                    <span className="shrink-0 font-semibold text-fg tabular-nums">{x.done}/{x.filled}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-track overflow-hidden" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct(x)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 저장·내보내기·공유 */}
        <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="md-save">
          <h2 id="md-save" className="text-lg font-semibold text-fg">{t('save.title')}</h2>
          <p className={storageOk ? 'text-sm text-sub' : warnCls}>{!storageOk ? t('save.storageError') : fromLink ? t('save.linkMode') : t('save.auto')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={savePng} disabled={status === 'saving'} className="ui-btn min-h-11 px-4 py-2.5 text-sm disabled:opacity-50">{t('save.png')}</button>
            <button type="button" onClick={() => window.print()} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm">{t('save.print')}</button>
            <button type="button" onClick={reset} disabled={empty && !checked && !fromLink} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm disabled:opacity-50">{t('save.reset')}</button>
          </div>
          <p role="status" className="text-sm text-body min-h-5">{status && t(`save.${status}`)}</p>
          <p className="text-xs text-muted">{t('save.exportNote')}</p>

          <div className="border-t border-line pt-4 space-y-3">
            <h3 className="font-semibold text-fg">{t('save.shareTitle')}</h3>
            {!link.ok ? <p className={warnCls}>{t('save.noCompress')}</p> : empty ? <p className="text-sm text-sub">{t('save.shareEmpty')}</p> : (
              <>
                <p className="text-sm text-sub">{t('save.shareDesc')}</p>
                {link.len > URL_WARN && <p className={warnCls}>{t('save.longLink', { n: link.len.toLocaleString('en-US') })}</p>}
                <ShareResult fileName="mandalart-card" card={card} text={t('share.text', { core: card.headline })} />
              </>
            )}
          </div>
        </section>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h3 className="font-medium text-body">{t('guide.sources.title')}</h3>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </section>
      </div>

      {/* 인쇄 전용: body 바로 아래 포털. 적은 글자만(흐린 예시·체크 없음) */}
      {hydrated && createPortal(
        <div id={PRINT_ID} className="hidden print:block">
          <style>{PRINT_CSS}</style>
          <table>
            <tbody>
              {Array.from({ length: 9 }, (_, r) => (
                <tr key={r}>
                  {Array.from({ length: 9 }, (_, c) => {
                    const { b, p } = toBlock(r, c)
                    const cell = cellOf(b, p)
                    const cls = [cell.kind !== 'act' && 'md-h', cell.kind === 'core' && 'md-k', c % 3 === 0 && 'md-l', r % 3 === 0 && 'md-t'].filter(Boolean).join(' ')
                    return <td key={c} className={cls || undefined}><div>{textOf(chart, cell)}</div></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body,
      )}
    </div>
  )
}
