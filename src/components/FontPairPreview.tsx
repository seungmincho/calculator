'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/fontPreview'
import { FONTS, fontStack } from '@/utils/fontPreview'
import FontPairProfiles from '@/components/FontPairProfiles'
import { applyFontPairStyles, fontPairStyles, type FontPairStyles } from '@/utils/fontPairProfiles'
import {
  appliedPairWeight, createFontPair, fontPairCss, fontPairCssRequests, fontPairShareUrl, getPairFont,
  limitPairText, PAIR_BODY_LIMIT, PAIR_LINK_LIMIT, PAIR_SIZE_LIMITS, PAIR_TITLE_LIMIT, PAIR_WEIGHTS,
  readFontPair, swapFontPair, type FontPairPart, type FontPairRole, type FontPairState,
} from '@/utils/fontPairing'

async function copyPairText(value: string, isCurrent: () => boolean) {
  if (!isCurrent()) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return isCurrent()
    }
  } catch { /* Try the browser's selection-based fallback. */ }
  if (!isCurrent()) return false
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.left = '-999999px'
  document.body.appendChild(textarea)
  textarea.select()
  try { if (!document.execCommand('copy')) throw new Error('Copy failed'); return isCurrent() }
  finally { textarea.remove() }
}

export default function FontPairPreview({ savedState, onStateChange }: { savedState: FontPairState | null; onStateChange: (state: FontPairState) => void }) {
  const t = useTranslations('fontPreview')
  const instance = useId()
  const [pair, setPair] = useState(() => savedState ?? createFontPair(t('pairing.sampleTitle'), t('pairing.sampleBody')))
  const initialState = useRef(pair)
  const restored = useRef(savedState !== null)
  const [pairReady, setPairReady] = useState(savedState !== null)
  const copyGeneration = useRef(0)
  const [subset, setSubset] = useState({ title: pair.title.text, body: pair.body.text })
  const [fontStatus, setFontStatus] = useState<'loading' | 'ready' | 'failed' | 'unverified' | 'timeout'>('loading')
  const [copyStatus, setCopyStatus] = useState<'css' | 'link' | 'failed' | 'length' | null>(null)
  const [copying, setCopying] = useState(false)
  const [showCss, setShowCss] = useState(false)

  // Read only once after hydration. Edits never put the manuscript into the address bar.
  useEffect(() => {
    if (restored.current) return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      restored.current = true
      const next = readFontPair(new URLSearchParams(window.location.search), initialState.current)
      setPair(next)
      onStateChange(next)
      setPairReady(true)
    })
    return () => { active = false }
  }, [onStateChange])

  useEffect(() => () => { copyGeneration.current++ }, [])

  useEffect(() => {
    const timer = setTimeout(() => setSubset({ title: pair.title.text, body: pair.body.text }), 400)
    return () => clearTimeout(timer)
  }, [pair.title.text, pair.body.text])

  const requests = useMemo(() => fontPairCssRequests({
    title: { fontId: pair.title.fontId, weight: pair.title.weight, size: pair.title.size, text: subset.title },
    body: { fontId: pair.body.fontId, weight: pair.body.weight, size: pair.body.size, text: subset.body },
  }), [pair.title.fontId, pair.title.weight, pair.title.size, pair.body.fontId, pair.body.weight, pair.body.size, subset])
  const requestKey = requests.join('\n')
  const faceCheckKey = JSON.stringify([
    { font: `${appliedPairWeight(pair.title)} 16px "${getPairFont(pair.title.fontId).family}"`, text: subset.title || t('pairing.emptyTitle') },
    { font: `${appliedPairWeight(pair.body)} 16px "${getPairFont(pair.body.fontId).family}"`, text: subset.body || t('pairing.emptyBody') },
  ])

  useEffect(() => {
    let active = true
    let remaining = 0
    let settled = false
    const finish = (status: 'ready' | 'failed' | 'unverified' | 'timeout') => {
      if (!active || settled) return
      settled = true
      clearTimeout(timeout)
      setFontStatus(status)
    }
    // Cover both stalled CSS and stalled binary downloads; late events cannot overwrite the outcome.
    const timeout = setTimeout(() => finish('timeout'), 15_000)
    const verifyFaces = async () => {
      if (!active || settled) return
      if (!document.fonts || typeof document.fonts.load !== 'function') { finish('unverified'); return }
      try {
        const checks = JSON.parse(faceCheckKey) as { font: string; text: string }[]
        const faces = await Promise.all(checks.map(check => document.fonts.load(check.font, check.text)))
        // A loaded stylesheet can still contain missing or failed font files. An empty face list
        // means the requested family was not found, not that its fallback loaded successfully.
        finish(faces.every(group => group.length > 0 && group.every(face => face.status === 'loaded')) ? 'ready' : 'failed')
      } catch { finish('failed') }
    }
    queueMicrotask(() => { if (active) setFontStatus('loading') })
    // Own each link independently of catalog data-fp links, including equal URLs.
    const links = requestKey.split('\n').filter(Boolean).map(url => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      link.dataset.fpPair = instance
      remaining++
      link.onload = () => {
        remaining--
        if (active && remaining === 0 && !settled) void verifyFaces()
      }
      link.onerror = () => finish('failed')
      return link
    })
    links.forEach(link => document.head.appendChild(link))
    return () => {
      active = false
      clearTimeout(timeout)
      links.forEach(link => { link.onload = null; link.onerror = null; link.remove() })
    }
  }, [requestKey, faceCheckKey, instance])

  const applyPair = (next: FontPairState) => {
    copyGeneration.current++
    setPair(next)
    onStateChange(next)
    setCopyStatus(null)
    setCopying(false)
  }
  const update = (role: FontPairRole, value: Partial<FontPairPart>) => {
    applyPair({ ...pair, [role]: { ...pair[role], ...value } })
  }
  const loadStyles = (styles: FontPairStyles) => {
    if (!pairReady) return false
    const next = applyFontPairStyles(pair, styles)
    if (!next) return false
    applyPair(next)
    return true
  }
  const css = useMemo(() => fontPairCss(pair), [pair])

  const copy = async (kind: 'css' | 'link') => {
    if (copying || !pairReady) return
    const generation = ++copyGeneration.current
    const isCurrent = () => copyGeneration.current === generation
    setCopyStatus(null)
    let value = css
    if (kind === 'link') {
      const result = fontPairShareUrl(window.location.href, pair)
      if (!result.ok) { setCopyStatus(result.error === 'length' ? 'length' : 'failed'); return }
      value = result.url
    }
    setCopying(true)
    try { if (await copyPairText(value, isCurrent) && isCurrent()) setCopyStatus(kind) }
    catch { if (isCurrent()) setCopyStatus('failed') }
    finally { if (isCurrent()) setCopying(false) }
  }

  return (
    <section aria-labelledby="font-pair-title" className="ui-card min-w-0 p-4 sm:p-6 space-y-5">
      <div>
        <h2 id="font-pair-title" className="text-lg font-semibold text-fg">{t('pairing.title')}</h2>
        <p className="mt-1 text-sm text-sub">{t('pairing.description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="min-w-0 space-y-5">
          {(['title', 'body'] as const).map(role => {
            const part = pair[role]
            const font = getPairFont(part.fontId)
            const applied = appliedPairWeight(part)
            const limit = role === 'title' ? PAIR_TITLE_LIMIT : PAIR_BODY_LIMIT
            const id = `${instance}-${role}`
            return (
              <fieldset key={role} disabled={!pairReady} className="min-w-0 space-y-3 border border-line rounded-2xl p-4">
                <legend className="px-1 text-sm font-semibold text-fg">{t(`pairing.roles.${role}`)}</legend>
                <label className="block">
                  <span className="text-sm font-medium text-body">{t(`pairing.fontLabels.${role}`)}</span>
                  <select value={part.fontId} onChange={event => update(role, { fontId: event.target.value })}
                    className="ui-field mt-1.5 min-h-11 px-3 py-2 text-base">
                    {FONTS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.ko}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${id}-size`} className="text-sm font-medium text-body">{t(`pairing.sizeLabels.${role}`, { size: part.size })}</label>
                    <input id={`${id}-size`} type="range" min={PAIR_SIZE_LIMITS[role].min} max={PAIR_SIZE_LIMITS[role].max} step={1} value={part.size}
                      onChange={event => update(role, { size: Number(event.target.value) })} className="block w-full min-h-11 accent-primary" />
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-body">{t(`pairing.weightLabels.${role}`)}</span>
                    <select value={part.weight} onChange={event => update(role, { weight: Number(event.target.value) })}
                      className="ui-field mt-1.5 min-h-11 px-3 py-2 text-base">
                      {PAIR_WEIGHTS.map(weight => <option key={weight} value={weight}>{weight}</option>)}
                    </select>
                  </label>
                </div>
                <p className="text-xs text-muted">{t('pairing.applied', { font: font.name, weight: applied })}</p>
                {applied !== part.weight && <p className="text-xs text-sub">{t('pairing.adjusted', { requested: part.weight, applied })}</p>}
                <label className="block">
                  <span className="text-sm font-medium text-body">{t(`pairing.textLabels.${role}`)}</span>
                  <textarea value={part.text} onChange={event => update(role, { text: limitPairText(event.target.value, limit) })}
                    maxLength={limit} rows={role === 'title' ? 2 : 4} className="ui-field mt-1.5 min-h-11 px-3 py-2 text-base resize-y" />
                </label>
                <p className="text-xs text-muted tabular-nums">{t('pairing.textLimit', { count: part.text.length, max: limit.toLocaleString() })}</p>
              </fieldset>
            )
          })}
        </div>

        <div className="order-first lg:order-last min-w-0 space-y-3">
          <h3 className="text-sm font-semibold text-body">{t('pairing.preview')}</h3>
          <article aria-label={t('pairing.preview')} className="bg-subtle rounded-2xl p-5 sm:p-7 min-w-0 min-h-64 space-y-6">
            <h4 className="text-fg whitespace-pre-wrap [overflow-wrap:anywhere]" style={{
              fontFamily: fontStack(getPairFont(pair.title.fontId)), fontSize: pair.title.size,
              fontWeight: appliedPairWeight(pair.title), lineHeight: 1.25,
            }}>{pair.title.text || t('pairing.emptyTitle')}</h4>
            <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere]" style={{
              fontFamily: fontStack(getPairFont(pair.body.fontId)), fontSize: pair.body.size,
              fontWeight: appliedPairWeight(pair.body), lineHeight: 1.75,
            }}>{pair.body.text || t('pairing.emptyBody')}</p>
          </article>
          {fontStatus !== 'ready' && <p role="status" className="text-xs text-muted">{t(`pairing.fontStatus.${fontStatus}`)}</p>}
          <p className="text-xs text-muted">{t('pairing.remoteFonts')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!pairReady} onClick={() => applyPair(swapFontPair(pair))} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('pairing.swap')}</button>
        <button type="button" disabled={copying || !pairReady} onClick={() => void copy('css')} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('pairing.copyCss')}</button>
        <button type="button" disabled={copying || !pairReady} onClick={() => void copy('link')} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('pairing.share')}</button>
        <button type="button" onClick={() => setShowCss(previous => !previous)} aria-expanded={showCss} aria-controls="font-pair-css" className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t(showCss ? 'pairing.hideCss' : 'pairing.showCss')}</button>
      </div>
      <p className="text-xs text-muted">{t('pairing.swapHint')}</p>
      <p className="text-xs text-muted">{t('pairing.shareHint', { max: PAIR_LINK_LIMIT.toLocaleString() })}</p>
      {copyStatus && <p role={copyStatus === 'failed' || copyStatus === 'length' ? 'alert' : 'status'} className="text-sm text-sub">{t(`pairing.copyStatus.${copyStatus}`)}</p>}
      {showCss && <pre id="font-pair-css" className="bg-subtle rounded-2xl p-4 text-sm text-body overflow-x-auto whitespace-pre-wrap [overflow-wrap:anywhere]"><code>{css}</code></pre>}
      <FontPairProfiles styles={fontPairStyles(pair)} ready={pairReady} onLoad={loadStyles} />
    </section>
  )
}
