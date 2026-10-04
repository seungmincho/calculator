'use client'

import { useState, useMemo, useEffect, useRef, type KeyboardEvent, type ChangeEvent } from 'react'
import QRCode from 'qrcode'
import { Download, Copy, Printer, X, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/qrGenerator'
import { useSearchParams } from '@/hooks/useSearchParams'
import GuideSection from '@/components/GuideSection'
import {
  QR_TYPES, EMPTY_FIELDS, PRINT_LAYOUTS, MIN_CONTRAST,
  buildPayload, normalizeUrl, parseHex, contrastRatio, luminance, density, logoRect, qrSvg, printQrMm,
  type QrType, type QrFields, type Ecc, type WifiSecurity,
} from '@/utils/qrPayload'

const DEFAULT_URL = 'https://toolhub.ai.kr'
const ECCS: { lv: Ecc; name: string; pct: number }[] = [
  { lv: 'L', name: 'low', pct: 7 }, { lv: 'M', name: 'medium', pct: 15 },
  { lv: 'Q', name: 'high', pct: 25 }, { lv: 'H', name: 'highest', pct: 30 },
]
const PNG_SIZES = [512, 1024, 2048] as const
const MAX_LOGO_BYTES = 5 * 1024 * 1024

interface Logo { src: string; aspect: number; img: HTMLImageElement }

const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const label = 'block text-sm font-medium text-body mb-2'
const seg = (on: boolean) =>
  `min-h-11 px-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

function ColorField({ id, name, pickLabel, value, onChange }: { id: string; name: string; pickLabel: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (parseHex(draft) !== value) setDraft(value) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <label htmlFor={id} className={label}>{name}</label>
      <div className="flex gap-2">
        <input
          type="color" aria-label={pickLabel} value={value} onChange={(e) => onChange(e.target.value)}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-line-strong bg-surface p-1"
        />
        <input
          id={id} type="text" value={draft} maxLength={7} spellCheck={false} autoComplete="off"
          onChange={(e) => { setDraft(e.target.value); const h = parseHex(e.target.value); if (h) onChange(h) }}
          onBlur={() => setDraft(value)}
          className="ui-field min-h-11 px-3 font-mono text-sm uppercase"
        />
      </div>
    </div>
  )
}

export default function QrGenerator() {
  const t = useTranslations('qrGenerator')
  const sp = useSearchParams()

  const [type, setType] = useState<QrType>(() => pick(sp.get('type'), QR_TYPES, 'url'))
  const [f, setF] = useState<QrFields>(() => {
    const tx = sp.get('text') ?? ''
    return { ...EMPTY_FIELDS, url: type === 'url' && tx ? tx : DEFAULT_URL, text: type === 'text' ? tx : '' }
  })
  const set = <K extends keyof QrFields>(k: K, v: QrFields[K]) => setF((p) => ({ ...p, [k]: v }))

  const [fg, setFg] = useState('#000000')
  const [bg, setBg] = useState('#ffffff')
  const [ecc, setEcc] = useState<Ecc>('M')
  const [margin, setMargin] = useState(4)
  const [logo, setLogo] = useState<Logo | null>(null)
  const [logoPct, setLogoPct] = useState(20)
  const [logoOpacity, setLogoOpacity] = useState(100)
  const [pngSize, setPngSize] = useState<number>(1024)
  const [layout, setLayout] = useState(1)
  const [caption, setCaption] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [status, setStatus] = useState('')
  const [canCopy, setCanCopy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => setCanCopy(typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write), [])

  // URL에는 유형과 URL/텍스트만 (Wi-Fi 비밀번호·연락처는 넣지 않음)
  useEffect(() => {
    const q = new URLSearchParams()
    if (type !== 'url') q.set('type', type)
    const tx = type === 'url' ? f.url : type === 'text' ? f.text : ''
    if (tx && !(type === 'url' && tx === DEFAULT_URL)) q.set('text', tx)
    const s = q.toString()
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
  }, [type, f.url, f.text])

  const payload = buildPayload(type, f)
  const qr = useMemo(() => {
    if (!payload) return null
    try { return QRCode.create(payload, { errorCorrectionLevel: ecc }) } catch { return 'tooLong' as const }
  }, [payload, ecc])
  const code = qr && qr !== 'tooLong' ? qr : null
  const bytes = useMemo(() => new TextEncoder().encode(payload).length, [payload])

  const logoOpt = logo ? { href: logo.src, pct: logoPct, aspect: logo.aspect, opacity: logoOpacity / 100 } : undefined
  const svg = useMemo(
    () => (code ? qrSvg(code.modules, { margin, fg, bg, px: 1024, logo: logoOpt }) : ''),
    [code, margin, fg, bg, logo, logoPct, logoOpacity], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const ratio = contrastRatio(fg, bg)
  const inverted = luminance(fg) > luminance(bg)

  const flash = (msg: string) => {
    setStatus(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus(''), 4000)
  }

  const renderPng = (px: number) => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = px
    const ctx = cv.getContext('2d')!
    if (!code) return cv
    const m = code.modules, n = m.size, cell = px / (n + margin * 2)
    const e = (i: number) => Math.round(i * cell)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, px, px)
    ctx.fillStyle = fg
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (m.data[r * n + c]) {
          const x = e(c + margin), y = e(r + margin)
          ctx.fillRect(x, y, e(c + margin + 1) - x, e(r + margin + 1) - y)
        }
    if (logo) {
      const L = logoRect(n, margin, logoPct, logo.aspect)
      ctx.fillStyle = bg
      ctx.beginPath()
      const [bx, by, bw, bh] = [(L.x - L.pad) * cell, (L.y - L.pad) * cell, (L.w + L.pad * 2) * cell, (L.h + L.pad * 2) * cell]
      if ('roundRect' in ctx) ctx.roundRect(bx, by, bw, bh, L.pad * cell)
      else (ctx as CanvasRenderingContext2D).rect(bx, by, bw, bh)
      ctx.fill()
      ctx.globalAlpha = logoOpacity / 100
      ctx.drawImage(logo.img, L.x * cell, L.y * cell, L.w * cell, L.h * cell)
      ctx.globalAlpha = 1
    }
    return cv
  }

  const save = (blob: Blob, name: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const downloadPng = () =>
    renderPng(pngSize).toBlob((b) => {
      if (!b) return flash(t('result.copyFailed'))
      save(b, `qr-${type}-${pngSize}.png`)
      flash(t('result.savedPng', { size: pngSize }))
    }, 'image/png')

  const downloadSvg = () => {
    save(new Blob([svg], { type: 'image/svg+xml' }), `qr-${type}.svg`)
    flash(t('result.savedSvg'))
  }

  const copyImage = async () => {
    try {
      // Safari는 사용자 동작 안에서 Promise를 넘겨야 함
      const blob = new Promise<Blob>((res, rej) => renderPng(1024).toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      flash(t('result.copiedImage'))
    } catch {
      flash(t('result.copyFailed'))
    }
  }

  const [cols, rows] = PRINT_LAYOUTS[layout]
  const printSheet = () => {
    const cap = esc(caption.trim())
    const mm = printQrMm(cols, rows, !!cap)
    const src = renderPng(1024).toDataURL('image/png')
    const cell = `<figure><img src="${src}" alt=""/>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(t('print.docTitle'))}</title><style>
@page{size:A4 portrait;margin:10mm}html,body{margin:0}body{font-family:Pretendard,system-ui,sans-serif;color:#000}
main{display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:${(276 / rows).toFixed(2)}mm}
figure{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;break-inside:avoid;outline:0.2mm dashed #ccc}
img{width:${mm}mm;height:${mm}mm}figcaption{font-size:11pt;text-align:center;max-width:${mm}mm}
</style></head><body><main>${cell.repeat(cols * rows)}</main></body></html>`
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
    const w = frame.contentWindow!, doc = w.document
    doc.open(); doc.write(html); doc.close()
    w.addEventListener('afterprint', () => frame.remove())
    Promise.all(Array.from(doc.images).map((i) => i.decode().catch(() => undefined))).then(() => { w.focus(); w.print() })
  }

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > MAX_LOGO_BYTES) return flash(t('logo.invalid'))
    const r = new FileReader()
    r.onload = () => {
      const src = r.result as string
      const img = new Image()
      img.onload = () => {
        setLogo({ src, img, aspect: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1 })
        if (ecc !== 'H') { setEcc('H'); flash(t('logo.autoH')) }
      }
      img.onerror = () => flash(t('logo.invalid'))
      img.src = src
    }
    r.readAsDataURL(file)
  }

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = QR_TYPES.indexOf(type), n = QR_TYPES.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault()
    setType(QR_TYPES[next])
    tabRefs.current[next]?.focus()
  }

  const field = (
    k: 'url' | 'text' | 'ssid' | 'name' | 'tel' | 'email' | 'org' | 'site' | 'smsTo' | 'smsBody' | 'mailTo' | 'subject' | 'body' | 'phone' | 'place',
    text: string,
    o: { type?: string; ph?: string; optional?: boolean; area?: boolean; auto?: string; hint?: string } = {},
  ) => {
    const id = `qr-${k}`
    const cls = 'ui-field px-4 py-3'
    return (
      <div>
        <label htmlFor={id} className={label}>
          {text}{o.optional && <span className="font-normal text-muted"> ({t('input.optional')})</span>}
        </label>
        {o.area ? (
          <textarea id={id} rows={3} value={f[k]} placeholder={o.ph} onChange={(e) => set(k, e.target.value)} className={`${cls} resize-y`} aria-describedby={o.hint ? `${id}-hint` : undefined} />
        ) : (
          <input id={id} type={o.type ?? 'text'} value={f[k]} placeholder={o.ph} autoComplete={o.auto ?? 'off'} onChange={(e) => set(k, e.target.value)} className={cls} aria-describedby={o.hint ? `${id}-hint` : undefined} />
        )}
        {o.hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{o.hint}</p>}
      </div>
    )
  }

  const altValue: Record<QrType, string> = {
    url: normalizeUrl(f.url), text: f.text.slice(0, 40), wifi: f.ssid, vcard: f.name.trim(),
    sms: f.smsTo, email: f.mailTo, phone: f.phone, geo: f.place,
  }
  const warn = 'rounded-2xl bg-amber-50 p-4 text-sm text-amber-800'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        {/* 입력 */}
        <section className="ui-card space-y-5 p-6" aria-labelledby="qr-input-title">
          <h2 id="qr-input-title" className="text-lg font-semibold text-fg">{t('input.title')}</h2>
          <div role="tablist" aria-label={t('input.dataType')} onKeyDown={onTabKey} className="grid grid-cols-4 gap-2">
            {QR_TYPES.map((ty, i) => (
              <button
                key={ty} ref={(el) => { tabRefs.current[i] = el }} id={`qr-tab-${ty}`} type="button"
                role="tab" aria-selected={type === ty} aria-controls="qr-panel" tabIndex={type === ty ? 0 : -1}
                onClick={() => setType(ty)} className={seg(type === ty)}
              >
                {t(`types.${ty}`)}
              </button>
            ))}
          </div>

          <div id="qr-panel" role="tabpanel" aria-labelledby={`qr-tab-${type}`} className="space-y-4">
            {type === 'url' && field('url', t('input.url'), { type: 'url', ph: t('input.urlPlaceholder'), auto: 'url', hint: t('input.urlHint') })}
            {type === 'text' && field('text', t('input.text'), { area: true, ph: t('input.textPlaceholder') })}
            {type === 'wifi' && (
              <>
                {field('ssid', t('input.wifiSsid'), { ph: t('input.wifiSsidPlaceholder') })}
                <div>
                  <label htmlFor="qr-security" className={label}>{t('input.wifiSecurity')}</label>
                  <select id="qr-security" value={f.security} onChange={(e) => set('security', e.target.value as WifiSecurity)} className="ui-field min-h-11 px-4 py-3">
                    <option value="WPA">{t('input.wifiWpa')}</option>
                    <option value="WEP">{t('input.wifiWep')}</option>
                    <option value="nopass">{t('input.wifiNoPassword')}</option>
                  </select>
                </div>
                {f.security !== 'nopass' && (
                  <div>
                    <label htmlFor="qr-password" className={label}>{t('input.wifiPassword')}</label>
                    <div className="flex gap-2">
                      <input
                        id="qr-password" type={showPw ? 'text' : 'password'} value={f.password} autoComplete="off"
                        placeholder={t('input.wifiPasswordPlaceholder')} onChange={(e) => set('password', e.target.value)}
                        className="ui-field px-4 py-3" aria-describedby="qr-password-hint"
                      />
                      <button
                        type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
                        aria-label={showPw ? t('input.hidePassword') : t('input.showPassword')}
                        className="ui-btn-soft min-h-11 min-w-11 shrink-0 px-3"
                      >
                        {showPw ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                      </button>
                    </div>
                    <p id="qr-password-hint" className="mt-1.5 text-xs text-muted">{t('input.wifiPrivacy')}</p>
                  </div>
                )}
                <label htmlFor="qr-hidden" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-body">
                  <input id="qr-hidden" type="checkbox" checked={f.hidden} onChange={(e) => set('hidden', e.target.checked)} className="h-5 w-5 accent-primary" />
                  {t('input.wifiHidden')}
                </label>
              </>
            )}
            {type === 'vcard' && (
              <>
                {field('name', t('input.vcardName'), { ph: t('input.vcardNamePlaceholder'), auto: 'name' })}
                {field('tel', t('input.vcardPhone'), { type: 'tel', ph: t('input.vcardPhonePlaceholder'), optional: true, auto: 'tel' })}
                {field('email', t('input.vcardEmail'), { type: 'email', ph: t('input.vcardEmailPlaceholder'), optional: true, auto: 'email' })}
                {field('org', t('input.vcardOrganization'), { ph: t('input.vcardOrganizationPlaceholder'), optional: true, auto: 'organization' })}
                {field('site', t('input.vcardUrl'), { type: 'url', ph: t('input.vcardUrlPlaceholder'), optional: true, auto: 'url' })}
                <p className="text-xs text-muted">{t('input.vcardPrivacy')}</p>
              </>
            )}
            {type === 'sms' && (
              <>
                {field('smsTo', t('input.smsPhone'), { type: 'tel', ph: t('input.smsPhonePlaceholder') })}
                {field('smsBody', t('input.smsMessage'), { area: true, ph: t('input.smsMessagePlaceholder'), optional: true })}
              </>
            )}
            {type === 'email' && (
              <>
                {field('mailTo', t('input.email'), { type: 'email', ph: t('input.emailPlaceholder') })}
                {field('subject', t('input.mailSubject'), { ph: t('input.mailSubjectPlaceholder'), optional: true })}
                {field('body', t('input.mailBody'), { area: true, ph: t('input.mailBodyPlaceholder'), optional: true })}
              </>
            )}
            {type === 'phone' && field('phone', t('input.phone'), { type: 'tel', ph: t('input.phonePlaceholder') })}
            {type === 'geo' && (
              <>
                {field('place', t('input.place'), { ph: t('input.placePlaceholder') })}
                <div role="group" aria-labelledby="qr-geo-label">
                  <p id="qr-geo-label" className={label}>{t('input.geoFormat')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['map', 'geo'] as const).map((g) => (
                      <button key={g} type="button" aria-pressed={f.geoFormat === g} onClick={() => set('geoFormat', g)} className={seg(f.geoFormat === g)}>
                        {t(g === 'map' ? 'input.geoMap' : 'input.geoGeo')}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{t(f.geoFormat === 'map' ? 'input.geoMapHint' : 'input.geoGeoHint')}</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 결과 (모바일: 입력 바로 아래) */}
        <div className="space-y-6 lg:col-span-2 lg:row-span-2">
          <section className="ui-card p-6" aria-labelledby="qr-result-title">
            <h2 id="qr-result-title" className="mb-5 text-lg font-semibold text-fg">{t('result.title')}</h2>
            <div className="grid gap-6 sm:grid-cols-[minmax(0,280px)_1fr]">
              <div>
                {code ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                    alt={t(`alt.${type}`, { v: altValue[type] })}
                    className="mx-auto aspect-square w-full max-w-[280px] rounded-xl border border-line"
                  />
                ) : (
                  <div className="mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center rounded-xl border border-dashed border-line-strong bg-subtle p-6 text-center text-sm text-muted">
                    {qr === 'tooLong' ? t('result.tooLong') : t('placeholder')}
                  </div>
                )}
                {code && (
                  <p className="mt-3 text-center text-xs text-sub tabular-nums">
                    {t('result.info', { v: code.version, n: code.modules.size, bytes })}
                    <span className="block text-muted">{t(`result.density.${density(code.version)}`)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {ratio < MIN_CONTRAST && (
                  <p className={warn}>{t('style.lowContrast', { ratio: ratio.toFixed(1), min: MIN_CONTRAST })}</p>
                )}
                {inverted && ratio >= MIN_CONTRAST && (
                  <div className={warn}>
                    <p>{t('style.inverted')}</p>
                    <button type="button" onClick={() => { setFg(bg); setBg(fg) }} className="mt-2 min-h-11 font-semibold underline underline-offset-2">
                      {t('style.swap')}
                    </button>
                  </div>
                )}
                {logo && ecc !== 'H' && (
                  <div className={warn}>
                    <p>{t('logo.needsH')}</p>
                    <button type="button" onClick={() => setEcc('H')} className="mt-2 min-h-11 font-semibold underline underline-offset-2">{t('logo.useH')}</button>
                  </div>
                )}
                {margin < 2 && <p className={warn}>{t('style.marginLow')}</p>}

                <div>
                  <label htmlFor="qr-png-size" className={label}>{t('result.pngSize')}</label>
                  <select id="qr-png-size" value={pngSize} onChange={(e) => setPngSize(+e.target.value)} className="ui-field min-h-11 px-4 py-3">
                    {PNG_SIZES.map((s) => <option key={s} value={s}>{t(`result.png${s}`)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={downloadPng} disabled={!code} className="ui-btn min-h-11 px-4 py-3 sm:col-span-2">
                    <Download className="h-4 w-4" aria-hidden />{t('result.downloadPng')}
                  </button>
                  <button type="button" onClick={downloadSvg} disabled={!code} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-45">
                    <Download className="h-4 w-4" aria-hidden />{t('result.downloadSvg')}
                  </button>
                  {canCopy && (
                    <button type="button" onClick={copyImage} disabled={!code} className="ui-btn-soft min-h-11 px-4 py-2 disabled:opacity-45">
                      <Copy className="h-4 w-4" aria-hidden />{t('result.copyImage')}
                    </button>
                  )}
                </div>
                <p role="status" aria-live="polite" className="min-h-5 text-sm font-medium text-primary">{status}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-subtle p-5 text-sm text-sub">
                <h3 className="mb-2 font-semibold text-fg">{t('scan.title')}</h3>
                <ol className="list-decimal space-y-1 pl-5">
                  {(t.raw('scan.items') as string[]).map((s) => <li key={s}>{s}</li>)}
                </ol>
              </div>
              <div className="rounded-2xl bg-subtle p-5 text-sm text-sub">
                <h3 className="mb-2 font-semibold text-fg">{t('trust.title')}</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {(t.raw('trust.items') as string[]).map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          </section>

          {/* 인쇄용 */}
          <section className="ui-card space-y-4 p-6" aria-labelledby="qr-print-title">
            <div>
              <h2 id="qr-print-title" className="text-lg font-semibold text-fg">{t('print.title')}</h2>
              <p className="mt-1 text-sm text-muted">{t('print.hint')}</p>
            </div>
            <div role="group" aria-labelledby="qr-print-layout">
              <p id="qr-print-layout" className={label}>{t('print.layout')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PRINT_LAYOUTS.map(([c, r], i) => (
                  <button key={i} type="button" aria-pressed={layout === i} onClick={() => setLayout(i)} className={seg(layout === i)}>
                    {t('print.option', { cols: c, rows: r, count: c * r, cm: (printQrMm(c, r, !!caption.trim()) / 10).toFixed(1) })}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="qr-caption" className={label}>
                {t('print.caption')}<span className="font-normal text-muted"> ({t('input.optional')})</span>
              </label>
              <input id="qr-caption" type="text" value={caption} maxLength={40} placeholder={t('print.captionPlaceholder')} onChange={(e) => setCaption(e.target.value)} className="ui-field px-4 py-3" />
            </div>
            <button type="button" onClick={printSheet} disabled={!code} className="ui-btn min-h-11 w-full px-4 py-3 sm:w-auto">
              <Printer className="h-4 w-4" aria-hidden />{t('print.button', { count: cols * rows })}
            </button>
          </section>
        </div>

        {/* 디자인 */}
        <section className="ui-card space-y-5 p-6" aria-labelledby="qr-style-title">
          <h2 id="qr-style-title" className="text-lg font-semibold text-fg">{t('style.title')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <ColorField id="qr-fg" name={t('style.foregroundColor')} pickLabel={t('style.pick', { name: t('style.foregroundColor') })} value={fg} onChange={setFg} />
            <ColorField id="qr-bg" name={t('style.backgroundColor')} pickLabel={t('style.pick', { name: t('style.backgroundColor') })} value={bg} onChange={setBg} />
          </div>
          <p className="text-xs text-muted tabular-nums">{t('style.contrast', { ratio: ratio.toFixed(1) })}</p>

          <div role="group" aria-labelledby="qr-ecc-label">
            <p id="qr-ecc-label" className={label}>{t('style.errorCorrection')}</p>
            <div className="grid grid-cols-4 gap-2">
              {ECCS.map(({ lv, name, pct }) => (
                <button key={lv} type="button" aria-pressed={ecc === lv} onClick={() => setEcc(lv)} className={`${seg(ecc === lv)} flex flex-col items-center justify-center py-1.5 leading-tight`}>
                  <span>{lv}</span>
                  <span className="text-[11px] font-normal opacity-80">{t(`style.errorLevels.${name}`)} {pct}%</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('style.errorCorrectionHint')}</p>
          </div>

          <div>
            <label htmlFor="qr-margin" className={label}>{t('style.margin', { n: margin })}</label>
            <input id="qr-margin" type="range" min={0} max={8} value={margin} onChange={(e) => setMargin(+e.target.value)} className="h-11 w-full accent-primary" aria-describedby="qr-margin-hint" />
            <p id="qr-margin-hint" className="text-xs text-muted">{t('style.marginHint')}</p>
          </div>

          {/* 로고 */}
          <div className="space-y-4 border-t border-line pt-5">
            <h3 className="font-semibold text-fg">{t('logo.title')}</h3>
            {logo ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.src} alt={t('logo.previewAlt')} className="h-14 w-14 rounded-xl border border-line bg-surface object-contain" />
                <button type="button" onClick={() => setLogo(null)} className="ui-btn-soft min-h-11 px-4 py-2">
                  <X className="h-4 w-4" aria-hidden />{t('logo.remove')}
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="qr-logo" className="ui-btn-soft min-h-11 w-full cursor-pointer px-4 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary">
                  {t('logo.upload')}
                  <input id="qr-logo" type="file" accept="image/*" onChange={onLogo} className="sr-only" aria-describedby="qr-logo-hint" />
                </label>
                <p id="qr-logo-hint" className="mt-1.5 text-xs text-muted">{t('logo.supportedFormats')}</p>
              </div>
            )}
            {logo && (
              <>
                <div>
                  <label htmlFor="qr-logo-size" className={label}>{t('logo.size')}: {logoPct}%</label>
                  <input id="qr-logo-size" type="range" min={10} max={30} value={logoPct} onChange={(e) => setLogoPct(+e.target.value)} className="h-11 w-full accent-primary" aria-describedby="qr-logo-size-hint" />
                  <p id="qr-logo-size-hint" className="text-xs text-muted">{t('logo.sizeHint')}</p>
                </div>
                <div>
                  <label htmlFor="qr-logo-opacity" className={label}>{t('logo.opacity')}: {logoOpacity}%</label>
                  <input id="qr-logo-opacity" type="range" min={50} max={100} value={logoOpacity} onChange={(e) => setLogoOpacity(+e.target.value)} className="h-11 w-full accent-primary" />
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <GuideSection namespace="qrGenerator" />
    </div>
  )
}
