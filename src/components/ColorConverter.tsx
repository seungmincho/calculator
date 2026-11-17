'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/colorConverter'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import MobileResultLink from '@/components/MobileResultLink'
import ShareResult from '@/components/ShareResult'
import { colorQueryUrl, convertOpaqueColor, hslColorHex, parseOpaqueHex, readColorQuery, rgbColorHex } from '@/utils/colorConversion'
import { copyShareResultLink, createShareResultRequests, type ShareResultToken } from '@/utils/shareResultActions'

const DEFAULT_COLOR = '#3B82F6'
const PRESETS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C', '#64748B', '#000000']
type Model = { draft: string; lastValid: string; ready: boolean; revision: number; shareUrl: string | null; queryError: 'invalid' | 'writeFailed' | null }
type Format = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk'
type CopyView = { owner: ReturnType<typeof createShareResultRequests>; token: ShareResultToken; format: Format; text: string; status: 'copying' | 'copied' | 'failed'; selectionFailed?: boolean }
const colorSignature = () => JSON.stringify(new URLSearchParams(window.location.search).getAll('color'))

export default function ColorConverter() {
  const t = useTranslations('colorConverter'), language = useOptionalLanguage()?.language ?? 'ko'
  const [model, setModel] = useState<Model>({ draft: DEFAULT_COLOR, lastValid: DEFAULT_COLOR, ready: false, revision: 0, shareUrl: null, queryError: null })
  const live = useRef(model), earlyIntent = useRef(false), observedColor = useRef(''), mounted = useRef(false)
  const [copyView, setCopyView] = useState<CopyView | null>(null), [shareRevision, setShareRevision] = useState(0)
  const manual = useRef<HTMLTextAreaElement>(null)
  const scope = JSON.stringify([model.draft, model.lastValid, model.revision, model.ready, model.shareUrl, language, t('title'), t('copy.failed'), t('share.notice', { hex: model.lastValid })])
  const owner = useMemo(() => createShareResultRequests(scope), [scope]), ownerRef = useRef(owner)
  useLayoutEffect(() => { mounted.current = true; ownerRef.current = owner; owner.activate(); return () => { mounted.current = false; owner.dispose() } }, [owner])
  const visible = copyView?.owner === owner && owner.current(copyView.token) ? copyView : null
  const values = useMemo(() => convertOpaqueColor(model.lastValid)!, [model.lastValid])
  const invalid = parseOpaqueHex(model.draft) === null
  const formats: { key: Format; text: string }[] = [
    { key: 'hex', text: values.hex },
    { key: 'rgb', text: `rgb(${values.rgb.r}, ${values.rgb.g}, ${values.rgb.b})` },
    { key: 'hsl', text: `hsl(${values.hsl.h}, ${values.hsl.s}%, ${values.hsl.l}%)` },
    { key: 'hsv', text: `hsv(${values.hsv.h}, ${values.hsv.s}%, ${values.hsv.v}%)` },
    { key: 'cmyk', text: `cmyk(${values.cmyk.c}%, ${values.cmyk.m}%, ${values.cmyk.y}%, ${values.cmyk.k}%)` },
  ]

  function invalidateOutputs() { ownerRef.current.invalidate(); setCopyView(null); setShareRevision(previous => previous + 1) }
  function commit(next: Model, write: boolean) {
    let value = next
    if (next.ready) {
      const shareUrl = colorQueryUrl(window.location.href, next.lastValid)
      value = { ...next, shareUrl }
      if (shareUrl === null) value.queryError = 'writeFailed'
      else if (write && shareUrl !== window.location.href) {
        try { window.history.replaceState(window.history.state, '', shareUrl) }
        catch { value.queryError = 'writeFailed' }
      }
      observedColor.current = colorSignature()
    }
    live.current = value; setModel(value)
  }
  function changeDraft(draft: string) {
    if (!mounted.current) return
    if (!live.current.ready) earlyIntent.current = true
    invalidateOutputs()
    const valid = parseOpaqueHex(draft)
    commit({ ...live.current, draft, lastValid: valid ?? live.current.lastValid, revision: live.current.revision + 1, queryError: null }, valid !== null)
  }
  function commitColor(input: string | null) {
    const hex = parseOpaqueHex(input)
    if (hex) changeDraft(hex)
  }
  function rgbChange(channel: 'r' | 'g' | 'b', value: number) {
    const rgb = { ...convertOpaqueColor(live.current.lastValid)!.rgb, [channel]: value }
    commitColor(rgbColorHex(rgb.r, rgb.g, rgb.b))
  }
  function hslChange(channel: 'h' | 's' | 'l', value: number) {
    const hsl = { ...convertOpaqueColor(live.current.lastValid)!.hsl, [channel]: value }
    commitColor(hslColorHex(hsl.h, hsl.s, hsl.l))
  }
  useEffect(() => {
    let active = true
    function restoreColor(initial: boolean) {
      if (!active) return
      const previous = live.current, query = readColorQuery(new URLSearchParams(window.location.search))
      invalidateOutputs()
      if (initial && earlyIntent.current) { commit({ ...previous, ready: true, revision: previous.revision + 1 }, parseOpaqueHex(previous.draft) !== null); return }
      if (query.status === 'invalid') { commit({ ...previous, ready: true, revision: previous.revision + 1, queryError: 'invalid' }, false); return }
      const hex = query.status === 'valid' ? query.hex : DEFAULT_COLOR
      commit({ draft: hex, lastValid: hex, ready: true, revision: previous.revision + 1, shareUrl: null, queryError: null }, query.status === 'valid')
    }
    const timer = window.setTimeout(function restoreInitialColor() { if (!live.current.ready) restoreColor(true) }, 0)
    const pop = () => {
      if (!active) return
      if (colorSignature() !== observedColor.current) restoreColor(!live.current.ready)
      else {
        invalidateOutputs()
        commit({ ...live.current, revision: live.current.revision + 1 }, false)
      }
    }
    window.addEventListener('popstate', pop)
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener('popstate', pop) }
    // Refs preserve current drafts when locale/catalog changes; restoration is lifecycle-owned.
  }, [])

  async function copy(format: Format, text: string) {
    if (!mounted.current || !model.ready || live.current !== model || ownerRef.current !== owner) return
    const token = owner.begin()
    if (!token) return
    setShareRevision(previous => previous + 1)
    const view: CopyView = { owner, token, format, text, status: 'copying' }
    setCopyView(view)
    const outcome = await copyShareResultLink(text, () => owner.current(token))
    if (!owner.current(token) || outcome === 'stale') return
    setCopyView({ ...view, status: outcome === 'copied' ? 'copied' : 'failed' })
    if (outcome === 'copied') owner.later(token, () => setCopyView(previous => previous?.token === token ? null : previous), 2000)
  }
  function selectManual(view: CopyView) {
    const current = () => view.owner === ownerRef.current && view.owner.current(view.token)
    if (!current()) return
    try {
      if (!manual.current) throw new Error('missingField')
      manual.current.focus(); if (!current()) return
      manual.current.select(); if (!current()) return
      manual.current.setSelectionRange(0, view.text.length)
      if (current()) setCopyView({ ...view, selectionFailed: false })
    } catch { if (current()) setCopyView({ ...view, selectionFailed: true }) }
  }
  function shareStarted() {
    if (!mounted.current || ownerRef.current !== owner || live.current !== model) return
    owner.invalidate(); setCopyView(null)
  }

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6" data-color-workspace data-color-last-valid={model.lastValid}>
    <header><h1 className="text-2xl font-bold text-fg">{t('title')}</h1><p className="mt-2 text-sm text-sub">{t('description')}</p></header>
    {model.queryError && <p data-color-query-error={model.queryError} role="status" className="rounded-xl bg-subtle p-4 text-sm text-body">{t(`query.${model.queryError}`)}</p>}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="ui-card min-w-0 p-4 sm:p-5 space-y-4" aria-labelledby="color-input-title">
        <MobileResultLink href="#color-converter-result" label={t('values.title')} value={model.lastValid} />
        <h2 id="color-input-title" className="text-lg font-semibold text-fg">{t('preview.title')}</h2>
        <div data-color-preview className="h-32 rounded-xl border border-line" role="img" aria-label={`${t('preview.title')}: ${model.lastValid}`} style={{ backgroundColor: model.lastValid }} />
        <div><label htmlFor="color-hex" className="mb-2 block text-sm font-medium text-body">{t('input.label')}</label>
          <input id="color-hex" data-color-draft type="text" value={model.draft} onChange={event => changeDraft(event.target.value)} aria-invalid={invalid} aria-describedby={invalid ? 'color-input-hint color-input-error color-last-valid-notice' : 'color-input-hint'} spellCheck={false} autoComplete="off" className="ui-field min-w-0 w-full px-3 py-3 text-base font-mono" />
          <p id="color-input-hint" className="mt-2 text-xs leading-relaxed text-muted">{t('input.hint')}</p>
          {invalid && <div className="mt-3 space-y-2"><p id="color-input-error" role="alert" className="text-sm text-body">{t('input.invalid')}</p><p id="color-last-valid-notice" className="text-sm text-sub">{t('input.lastValid', { hex: model.lastValid })}</p><button type="button" data-color-restore onClick={() => commitColor(live.current.lastValid)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('input.restore')}</button></div>}
        </div>
        <div className="flex flex-wrap items-end gap-3"><div><label htmlFor="color-picker" className="mb-2 block text-sm text-body">{t('input.picker')}</label><input id="color-picker" data-color-picker type="color" value={model.lastValid} onChange={event => commitColor(event.target.value)} className="h-11 w-16 cursor-pointer rounded-lg border border-line bg-field p-1" /></div><button type="button" data-color-random onClick={() => commitColor('#' + Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0'))} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('actions.random')}</button></div>
        <fieldset><legend className="mb-2 text-sm font-medium text-body">{t('presets.label')}</legend><div className="grid grid-cols-5 gap-1.5 xl:grid-cols-10 xl:gap-1">{PRESETS.map(hex => <button key={hex} type="button" data-color-preset={hex} aria-label={t('presets.choose', { hex })} aria-pressed={model.lastValid === hex} title={hex} onClick={() => commitColor(hex)} className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border-2 ${model.lastValid === hex ? 'border-primary' : 'border-line'}`} style={{ backgroundColor: hex }}>{model.lastValid === hex && <span className="rounded-full bg-surface p-1 text-primary"><Check size={16} aria-hidden="true" /></span>}</button>)}</div></fieldset>
      </section>
      <section id="color-converter-result" className="ui-card min-w-0 scroll-mt-20 p-4 sm:p-5 space-y-4" aria-labelledby="color-values-title">
        <h2 id="color-values-title" className="text-lg font-semibold text-fg">{t('values.title')}</h2>
        {invalid && <p className="text-sm text-sub">{t('input.lastValid', { hex: model.lastValid })}</p>}
        <dl className="space-y-3">{formats.map(item => <div key={item.key} data-color-value={item.key} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle p-3"><div className="min-w-0"><dt className="text-xs font-medium text-sub">{t(`formats.${item.key}`)}</dt><dd className="mt-1 break-words font-mono text-base text-fg [overflow-wrap:anywhere]">{item.text}</dd></div><button type="button" data-color-copy={item.key} aria-label={t('copy.format', { format: t(`formats.${item.key}`) })} disabled={!model.ready || visible?.status === 'copying' && visible.format === item.key} onClick={() => void copy(item.key, item.text)} className="ui-btn-soft min-h-11 shrink-0 px-3 py-2 text-sm disabled:opacity-50">{t(visible?.format === item.key && visible.status === 'copying' ? 'copy.copying' : visible?.format === item.key && visible.status === 'copied' ? 'copy.copied' : 'copy.action')}</button></div>)}</dl>
        <p className="text-xs leading-relaxed text-muted">{t('share.cmykNote')}</p>
        {visible && <div data-color-output={visible.status} role="status" aria-live="polite" className="text-sm text-body">{t(visible.status === 'copying' ? 'copy.copying' : visible.status === 'copied' ? 'copy.copied' : 'copy.failed')}</div>}
        {visible?.status === 'failed' && <section data-color-recovery className="rounded-xl bg-subtle p-4 space-y-3" aria-labelledby="color-recovery-title">
          <h3 id="color-recovery-title" className="font-semibold text-fg">{t('copy.recoveryTitle')}</h3><label htmlFor="color-copy-manual" className="block text-sm text-body">{t('copy.field')}</label><textarea ref={manual} id="color-copy-manual" readOnly value={visible.text} rows={3} className="ui-field w-full min-w-0 px-3 py-3 text-base font-mono" />
          <div className="flex flex-wrap gap-2"><button type="button" data-color-recovery-action="select" onClick={() => selectManual(visible)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copy.select')}</button><button type="button" data-color-recovery-action="retry" onClick={() => { if (owner.current(visible.token)) void copy(visible.format, visible.text) }} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('copy.retry')}</button><button type="button" data-color-recovery-action="close" onClick={() => { if (owner.current(visible.token)) { owner.invalidate(); setCopyView(null) } }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copy.close')}</button></div>
          {visible.selectionFailed && <p role="status" className="text-sm text-body">{t('copy.selectionFailed')}</p>}
        </section>}
        {model.ready && model.shareUrl && <div className="space-y-3" data-color-share-boundary onClickCapture={shareStarted}><p className="text-xs leading-relaxed text-sub">{t('share.notice', { hex: model.lastValid })}</p><ShareResult url={model.shareUrl} resultKey={`${scope}:${shareRevision}`} fileName={`color-${model.lastValid.slice(1)}`} card={{ tool: t('title'), label: t('share.label'), headline: model.lastValid, rows: formats.slice(1).map(item => ({ label: t(`formats.${item.key}`), value: item.text })) }} /></div>}
      </section>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="ui-card min-w-0 p-4 sm:p-5 space-y-4" aria-labelledby="color-rgb-title"><h2 id="color-rgb-title" className="font-semibold text-fg">{t('formats.rgb')}</h2>{(['r', 'g', 'b'] as const).map((channel, index) => <div key={channel}><label htmlFor={`color-${channel}`} className="flex justify-between gap-3 text-sm text-body"><span>{t(`channels.${['red', 'green', 'blue'][index]}`)}</span><span className="font-mono tabular-nums">{values.rgb[channel]}</span></label><input id={`color-${channel}`} data-color-channel={channel} type="range" min={0} max={255} value={values.rgb[channel]} onChange={event => rgbChange(channel, Number(event.target.value))} className={`min-h-11 w-full cursor-pointer ${channel === 'r' ? 'accent-red-500' : channel === 'g' ? 'accent-green-500' : 'accent-blue-500'}`} /></div>)}<p className="text-xs text-muted">{t('input.sliderHint')}</p></section>
      <section className="ui-card min-w-0 p-4 sm:p-5 space-y-4" aria-labelledby="color-hsl-title"><h2 id="color-hsl-title" className="font-semibold text-fg">{t('formats.hsl')}</h2>{(['h', 's', 'l'] as const).map((channel, index) => <div key={channel}><label htmlFor={`color-${channel}`} className="flex justify-between gap-3 text-sm text-body"><span>{t(`channels.${['hue', 'saturation', 'lightness'][index]}`)}</span><span className="font-mono tabular-nums">{values.hsl[channel]}{channel === 'h' ? '°' : '%'}</span></label><input id={`color-${channel}`} data-color-channel={channel} type="range" min={0} max={channel === 'h' ? 360 : 100} value={values.hsl[channel]} onChange={event => hslChange(channel, Number(event.target.value))} className="min-h-11 w-full cursor-pointer accent-primary" style={channel === 'h' ? { background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' } : undefined} /></div>)}<p className="text-xs text-muted">{t('input.sliderHint')}</p></section>
    </div>
    <section className="ui-card p-4 sm:p-5 space-y-4"><h2 className="text-lg font-semibold text-fg">{t('guide.title')}</h2><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold text-fg">{t('guide.formats.title')}</h3><dl className="space-y-2 text-sm text-sub">{(['hex', 'rgb', 'hsl', 'cmyk'] as const).map(format => <div key={format}><dt className="font-medium text-body">{t(`formats.${format}`)}</dt><dd>{t(`guide.formats.${format}`)}</dd></div>)}</dl></div><div><h3 className="mb-2 text-sm font-semibold text-fg">{t('guide.useCases.title')}</h3><ul className="list-disc space-y-2 pl-5 text-sm text-sub">{(t.raw('guide.useCases.items') as string[]).map(item => <li key={item}>{item}</li>)}</ul></div></div></section>
  </div>
}
