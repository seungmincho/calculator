'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { Copy, Trash2 } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dailySchedule'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { copyShareResultLink, createShareResultDownloads } from '@/utils/shareResultActions'
import {
  chartModel, summarize, overlaps, templateOf, newBlock, duplicate, sortByStart, toQuery, fromQuery, hasPlanQuery, parseSaved,
  exportSvg, cleanLabel, cleanTitle, cleanGoal, dur, hhmm, snap,
  TEMPLATES, TEMPLATE_IDS, DEFAULT_PLAN, COLORS, INK, HOURS, VIEW, C, R, DAY, MAX_BLOCKS, LABEL_MAX, TITLE_MAX, GOAL_MAX, SAVE_KEY,
  type Block, type Plan, type TemplateId,
} from '@/utils/dailySchedule'

type Status = 'saved' | 'saveFailed' | 'copied' | 'copyFailed'

const chip = (on: boolean) =>
  `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-xs font-medium text-sub mb-1.5'
const iconBtn = 'inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-soft text-body hover:bg-subtle disabled:opacity-40'
const GUIDE = ['howTo', 'tips'] as const
const PRINT_ID = 'daily-schedule-print'

/** 내보내기 SVG → PNG(2배). 시스템 글꼴만 쓰는 SVG 라 캔버스에 그려도 글자가 빠지지 않는다 */
async function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = w * 2
    canvas.height = h * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function DailySchedule() {
  const t = useTranslations('dailySchedule')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // 첫 렌더 = 기본 예시(정적 HTML 과 같다). 하이드레이션 뒤 URL(p·t·g) → 없으면 이 브라우저에 저장된 계획 → 없으면 기본
  const [saved, setSaved] = useState<Plan | null | undefined>(undefined)
  if (hydrated && saved === undefined) {
    let restored: Plan | null = null
    try { restored = parseSaved(window.localStorage.getItem(SAVE_KEY)) } catch { /* 저장소를 못 쓰면 기본값 */ }
    setSaved(restored)
  }
  const fromUrl = useMemo<Plan>(() => {
    if (!hydrated) return DEFAULT_PLAN
    const get = (k: string) => sp.get(k)
    return hasPlanQuery(get) ? fromQuery(get) : saved ?? DEFAULT_PLAN
  }, [hydrated, sp, saved])
  const [edited, setEdited] = useState<Plan | null>(null)
  const plan = edited ?? fromUrl
  const { blocks } = plan

  const [active, setActive] = useState<number | null>(null)
  const [status, setStatus] = useState<{ kind: Status; url?: string } | null>(null)
  const downloads = useMemo(() => createShareResultDownloads(), [])
  useEffect(() => { downloads.activate(); return () => downloads.dispose() }, [downloads])

  /** 사용자 동작에서만: 상태·주소창(기본이면 쿼리 없음)·자동 저장 */
  const commit = (next: Plan) => {
    setEdited(next)
    setStatus(null)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    try { window.localStorage.setItem(SAVE_KEY, qs) } catch { /* 저장 실패해도 링크로 남길 수 있다 */ }
  }
  const setBlocks = (next: Block[]) => commit({ ...plan, blocks: next })
  const patch = (i: number, p: Partial<Block>) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...p } : b)))
  const focusRow = (i: number) => document.getElementById(`ds-label-${i}`)?.focus()

  const nameOf = (b: Block) => (b.key ? t(`labels.${b.key}`) : b.label.trim() || t('list.untitled'))
  const rangeOf = (b: Block) => t('fmt.range', { from: hhmm(b.start), to: hhmm(b.end) })
  const fmtMin = (m: number) => {
    const h = Math.floor(m / 60), mm = m % 60
    return h && mm ? t('fmt.hm', { h, m: mm }) : h ? t('fmt.h', { h }) : t('fmt.m', { m: mm })
  }

  const tplId = templateOf(blocks)
  const wedges = chartModel(blocks, nameOf, rangeOf)
  const sum = summarize(blocks, nameOf)
  const ovs = overlaps(blocks)
  const title = plan.title ?? t('fields.defaultTitle')
  const heading = title.trim() || t('chart.untitled')
  const colorNames = t.raw('colors') as string[]
  const act = active !== null ? blocks[active] : undefined
  const sorted = blocks.every((b, i) => i === 0 || blocks[i - 1].start <= b.start)
  const exported = exportSvg(wedges, title.trim(), plan.goal.trim(), t('chart.empty'))
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  const applyTemplate = (id: TemplateId) => {
    if (id === tplId) return
    if (!tplId && blocks.length && !window.confirm(t('templates.confirm'))) return
    setBlocks(TEMPLATES[id])
  }
  const add = () => {
    flushSync(() => setBlocks([...blocks, newBlock(blocks)]))
    focusRow(blocks.length)
  }
  const dup = (i: number) => {
    flushSync(() => setBlocks([...blocks.slice(0, i + 1), duplicate(blocks[i]), ...blocks.slice(i + 1)]))
    focusRow(i + 1)
  }
  const remove = (i: number) => {
    setActive(null)
    setBlocks(blocks.filter((_, j) => j !== i))
  }
  const savePng = async () => {
    try {
      const blob = await svgToPng(exported.svg, exported.width, exported.height)
      const file = `${(title.trim() || 'daily-schedule').replace(/[\\/:*?"<>|]/g, '')}.png`
      setStatus({ kind: downloads.download(blob, file, () => true) === 'started' ? 'saved' : 'saveFailed' })
    } catch { setStatus({ kind: 'saveFailed' }) }
  }
  const copyLink = async () => {
    const qs = toQuery(plan)
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`
    setStatus({ kind: (await copyShareResultLink(url, () => true)) === 'copied' ? 'copied' : 'copyFailed', url })
  }

  const setTime = (i: number, which: 'start' | 'end', m: number) => patch(i, which === 'start' ? { start: m } : { end: m })
  const timeField = (i: number, b: Block, which: 'start' | 'end') => (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`ds-${which}-${i}`} className={labelCls}>{t(`list.${which}`)}</label>
        {which === 'end' && <span className={`text-xs tabular-nums whitespace-nowrap ${dur(b) ? 'text-sub' : 'text-amber-800'}`}>{fmtMin(dur(b))}</span>}
      </div>
      {/* 10분 단위: 입력 중에는 그대로 두고 칸을 벗어날 때 맞춘다(키보드로 07:30 을 칠 때 07:03 에서 끊기지 않게) */}
      <input
        id={`ds-${which}-${i}`} type="time" step={600} required value={hhmm(b[which])}
        aria-label={t(`list.${which}Aria`, { name: nameOf(b) })}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map(Number)
          if (Number.isInteger(h) && Number.isInteger(m)) setTime(i, which, h * 60 + m)
        }}
        onBlur={() => { if (snap(b[which]) !== b[which]) setTime(i, which, snap(b[which])) }}
        className="ui-field w-full min-w-0 min-h-11 px-2 py-2 text-base tabular-nums"
      />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <section className="ui-card p-6" aria-labelledby="ds-tpl">
        <h2 id="ds-tpl" className="text-lg font-semibold text-fg">{t('templates.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('templates.desc')}</p>
        <div role="group" aria-labelledby="ds-tpl" className="flex flex-wrap gap-2 mt-4">
          {TEMPLATE_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={tplId === id} onClick={() => applyTemplate(id)} className={chip(tplId === id)}>
              {t(`templates.${id}`)}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 계획표: 넓은 화면에서는 목록을 고치는 동안 따라온다 */}
        <section id="daily-schedule-result" className="min-w-0 ui-card p-4 sm:p-6 space-y-4 scroll-mt-20 lg:sticky lg:top-20 lg:self-start" aria-labelledby="ds-heading">
          <h2 id="ds-heading" className="text-xl font-bold text-fg text-center [overflow-wrap:anywhere]">{heading}</h2>
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`} role="img"
            aria-label={t('chart.aria', { title: heading, items: blocks.map((b) => `${nameOf(b)} ${rangeOf(b)}`).join(', ') || t('chart.empty') })}
            className="block w-full max-w-[26rem] lg:max-w-[min(26rem,calc(100vh_-_19rem))] mx-auto"
          >
            <circle cx={C} cy={C} r={R} className="fill-track stroke-line" strokeWidth={1} />
            {wedges.map((w) => (
              <path
                key={w.i} d={w.d} fill={w.fill} strokeWidth={1.5} strokeLinejoin="round"
                className={`stroke-surface cursor-pointer transition-opacity ${active !== null && active !== w.i ? 'opacity-50' : ''}`}
                onMouseEnter={() => setActive(w.i)} onMouseLeave={() => setActive(null)} onClick={() => focusRow(w.i)}
              >
                <title>{`${nameOf(blocks[w.i])} ${rangeOf(blocks[w.i])}`}</title>
              </path>
            ))}
            {HOURS.map(({ h, x1, y1, x2, y2, tx, ty, size, major }) => (
              <g key={h}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-faint" strokeWidth={major ? 1.5 : 0.75} />
                <text x={tx} y={ty} textAnchor="middle" fontSize={size} fontWeight={major ? 700 : 400} className="fill-sub">{h}</text>
              </g>
            ))}
            {wedges.flatMap((w) => w.lines.map((l, k) => (
              <text key={`${w.i}-${k}`} x={l.x} y={l.y} textAnchor="middle" fontSize={l.size} fontWeight={l.bold ? 600 : 400} fill={INK} className="pointer-events-none">{l.text}</text>
            )))}
            {!wedges.length && <text x={C} y={C + 4} textAnchor="middle" fontSize={12} className="fill-muted">{t('chart.empty')}</text>}
          </svg>
          {plan.goal.trim() && <p className="text-center text-base font-semibold text-body [overflow-wrap:anywhere]">{plan.goal.trim()}</p>}
          <p className="text-center text-sm text-sub min-h-5 tabular-nums">
            {act ? t('chart.active', { name: nameOf(act), range: rangeOf(act), time: fmtMin(dur(act)) }) : t('chart.hint')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={savePng} className="ui-btn min-h-11 px-4 py-2.5 text-sm">{t('export.png')}</button>
            <button type="button" onClick={() => window.print()} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm">{t('export.print')}</button>
            <button type="button" onClick={copyLink} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm">{t('export.copy')}</button>
          </div>
          <div role="status" className="text-center text-sm text-body min-h-5">
            {status && t(`export.${status.kind}`)}
            {status?.kind === 'copyFailed' && <span className="mt-1 block select-all break-all text-xs text-sub">{status.url}</span>}
          </div>
          <p className="text-xs text-muted text-center">{t('export.note')}</p>
        </section>

        <div className="min-w-0 space-y-8">
          <section className="ui-card p-6 space-y-4" aria-labelledby="ds-fields">
            <h2 id="ds-fields" className="text-lg font-semibold text-fg">{t('fields.heading')}</h2>
            <div>
              <label htmlFor="ds-title" className={labelCls}>{t('fields.title')}</label>
              <input id="ds-title" type="text" value={title} maxLength={TITLE_MAX} placeholder={t('fields.defaultTitle')}
                onChange={(e) => commit({ ...plan, title: cleanTitle(e.target.value) })} className="ui-field w-full min-h-11 px-4 py-3 text-base" />
            </div>
            <div>
              <label htmlFor="ds-goal" className={labelCls}>{t('fields.goal')}</label>
              <input id="ds-goal" type="text" value={plan.goal} maxLength={GOAL_MAX} placeholder={t('fields.goalPlaceholder')}
                onChange={(e) => commit({ ...plan, goal: cleanGoal(e.target.value) })} className="ui-field w-full min-h-11 px-4 py-3 text-base" />
            </div>
          </section>

          <section className="ui-card p-4 sm:p-6 space-y-4" aria-labelledby="ds-list">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="ds-list" className="text-lg font-semibold text-fg">{t('list.title')}</h2>
              <span className="text-sm text-sub tabular-nums">{t('list.count', { n: blocks.length, max: MAX_BLOCKS })}</span>
            </div>
            <p className="text-sm text-muted -mt-2">{t('list.desc')}</p>

            {ovs.length > 0 && (
              <div className="bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-sm">
                <p className="font-medium">{t('overlap.title')}</p>
                <ul className="mt-1 space-y-0.5">
                  {ovs.map((o) => (
                    <li key={`${o.a}-${o.b}`}>
                      {t('overlap.item', {
                        a: `${nameOf(blocks[o.a])}(${rangeOf(blocks[o.a])})`, b: `${nameOf(blocks[o.b])}(${rangeOf(blocks[o.b])})`, time: fmtMin(o.min),
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blocks.length === 0 ? <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('list.empty')}</p> : (
              <ol className="divide-y divide-line border-y border-line">
                {blocks.map((b, i) => {
                  const name = nameOf(b)
                  return (
                    <li
                      key={i} className={`py-3 space-y-2 ${active === i ? 'bg-subtle -mx-2 px-2 rounded-xl' : ''}`}
                      onFocus={() => setActive(i)}
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null) }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button" onClick={() => patch(i, { color: (b.color + 1) % COLORS.length })}
                          aria-label={t('list.color', { name, color: colorNames[b.color] ?? '' })}
                          className="size-11 shrink-0 rounded-xl border border-line-strong" style={{ background: COLORS[b.color] }}
                        />
                        <input
                          id={`ds-label-${i}`} type="text" value={b.key ? name : b.label} maxLength={LABEL_MAX} placeholder={t('list.untitled')}
                          aria-label={t('list.labelAria', { n: i + 1 })}
                          onChange={(e) => patch(i, { key: null, label: cleanLabel(e.target.value) })}
                          className="ui-field min-w-0 flex-1 min-h-11 px-3 py-2 text-base"
                        />
                        <button type="button" onClick={() => dup(i)} disabled={blocks.length >= MAX_BLOCKS} aria-label={t('list.duplicate', { name })} className={iconBtn}>
                          <Copy className="size-4" aria-hidden />
                        </button>
                        <button type="button" onClick={() => remove(i)} aria-label={t('list.delete', { name })} className={iconBtn}>
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {timeField(i, b, 'start')}
                        {timeField(i, b, 'end')}
                      </div>
                      {!dur(b) && <p className="text-xs text-amber-800">{t('list.zero')}</p>}
                    </li>
                  )
                })}
              </ol>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={add} disabled={blocks.length >= MAX_BLOCKS} className="ui-btn min-h-11 px-4 py-2.5 text-sm disabled:opacity-50">{t('list.add')}</button>
              <button type="button" onClick={() => setBlocks(sortByStart(blocks))} disabled={sorted} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm disabled:opacity-50">{t('list.sort')}</button>
            </div>
            {blocks.length >= MAX_BLOCKS && <p className="text-sm text-sub">{t('list.max', { max: MAX_BLOCKS })}</p>}
            <p className="text-xs text-muted">{t('list.timeHint')}</p>
          </section>

          <section className="ui-card p-6 space-y-4" aria-labelledby="ds-sum">
            <h2 id="ds-sum" className="text-lg font-semibold text-fg">{t('summary.title')}</h2>
            <ul className="space-y-3">
              {sum.cats.map((c) => (
                <li key={c.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-3 shrink-0 rounded-sm" style={{ background: COLORS[c.color] }} aria-hidden />
                      <span className="truncate text-body">{c.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-fg tabular-nums">
                      {fmtMin(c.min)}<span className="ml-1.5 font-normal text-muted">{Math.round((c.min / DAY) * 1000) / 10}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-track overflow-hidden" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${(c.min / DAY) * 100}%`, background: COLORS[c.color] }} />
                  </div>
                </li>
              ))}
              {sum.gapMin > 0 && (
                <li className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-body">
                      <span className="size-3 shrink-0 rounded-sm bg-track border border-line-strong" aria-hidden />{t('summary.free')}
                    </span>
                    <span className="shrink-0 font-semibold text-fg tabular-nums">{fmtMin(sum.gapMin)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted tabular-nums">{sum.gaps.map(([s, e]) => t('fmt.range', { from: hhmm(s), to: hhmm(e) })).join(', ')}</p>
                </li>
              )}
            </ul>
            <div className="border-t border-line pt-3 text-sm">
              {sum.overMin > 0
                ? <p className="bg-amber-50 text-amber-800 rounded-xl px-3 py-2">{t('summary.over', { over: fmtMin(sum.overMin), planned: fmtMin(sum.planned) })}</p>
                : <p className="text-body tabular-nums">{t('summary.ok', { planned: fmtMin(sum.planned), free: fmtMin(sum.gapMin) })}</p>}
            </div>
          </section>
        </div>
      </div>

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
          <h3 className="font-semibold text-fg mb-2">{t('guide.sources.title')}</h3>
          <ul className="space-y-1 text-sm">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{s.label}</a></li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* 인쇄 전용: body 바로 아래 포털. 계획표(제목·다짐 포함)만 A4 한 장에 */}
      {hydrated && createPortal(
        <div id={PRINT_ID} className="hidden print:block">
          <style>{`@media print{body>*:not(#${PRINT_ID}){display:none!important}html,body{background:#fff!important}@page{size:A4 portrait;margin:12mm}#${PRINT_ID} svg{display:block;width:100%;height:auto;max-height:265mm}}`}</style>
          <div dangerouslySetInnerHTML={{ __html: exported.svg }} />
        </div>,
        document.body,
      )}
    </div>
  )
}
