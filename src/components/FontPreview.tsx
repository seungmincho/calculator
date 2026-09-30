'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Search, Star, Pin, X, ExternalLink, Upload, Link2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import {
  FONTS, CATS, MAX_PIN, LOCAL_EXT, LOCAL_MAX_BYTES, type FontCat, type FontInfo,
  fontStack, nearestWeight, previewCssUrl, cssSnippet, filterFonts, parseIds, togglePin, clampNum,
} from '@/utils/fontPreview'

const FAV_KEY = 'fontPreview.favs'
const PRESETS = ['ganada', 'greeting', 'mixed', 'paragraph'] as const
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const DEF = { size: 40, weight: 400, lh: 1.5, ls: 0 }
type Align = 'left' | 'center' | 'right'
// 번역 배열이 없을 때 크래시 대신 빈 목록
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : [])

interface Look { size: number; weight: number; lh: number; ls: number; align: Align; dark: boolean }

/** 같은 href가 이미 있으면 건너뛰고, 새 CSS가 로드되면 같은 폰트의 이전 CSS 제거 (깜빡임 방지) */
function ensureCss(key: string, url: string) {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.getAttribute('href') === url)) return
  const old = document.querySelectorAll(`link[data-fp="${key}"]`)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.dataset.fp = key
  link.onload = () => old.forEach(l => l.remove())
  document.head.appendChild(link)
}

function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setInView(true); return }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView] as const
}

const previewStyle = (family: string, weight: number, look: Look): React.CSSProperties => ({
  fontFamily: family,
  fontSize: `${look.size}px`,
  fontWeight: weight,
  lineHeight: look.lh,
  letterSpacing: `${look.ls / 100}em`,
  textAlign: look.align,
  background: look.dark ? '#191f28' : '#ffffff',
  color: look.dark ? '#f2f4f6' : '#191f28',
  whiteSpace: 'pre-wrap',
  wordBreak: 'keep-all',
  overflowWrap: 'anywhere',
})

function FontCard({ font, text, subset, look, pinned, pinFull, fav, copied, onPin, onFav, onCopy }: {
  font: FontInfo; text: string; subset: string; look: Look; pinned: boolean; pinFull: boolean; fav: boolean
  copied: boolean; onPin: () => void; onFav: () => void; onCopy: () => void
}) {
  const t = useTranslations('fontPreview')
  const [ref, inView] = useInView<HTMLDivElement>()
  const applied = nearestWeight(font.weights, look.weight)
  useEffect(() => {
    if (inView) ensureCss(font.id, previewCssUrl(font, look.weight, subset))
  }, [inView, font, look.weight, subset])

  const iconBtn = 'p-2 rounded-lg transition-colors'
  return (
    <div ref={ref} className="ui-card p-5 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-fg">{font.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-soft text-sub">{t(`cat.${font.cat}`)}</span>
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">{font.ko} · {font.designer}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onFav} aria-pressed={fav} aria-label={fav ? t('unfavorite') : t('favorite')} title={fav ? t('unfavorite') : t('favorite')}
            className={`${iconBtn} ${fav ? 'text-primary bg-primary-soft' : 'text-faint hover:bg-soft'}`}>
            <Star className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} />
          </button>
          <button onClick={onPin} disabled={!pinned && pinFull} aria-pressed={pinned}
            aria-label={pinned ? t('unpin') : t('pin')} title={!pinned && pinFull ? t('pinFull') : pinned ? t('unpin') : t('pin')}
            className={`${iconBtn} disabled:opacity-40 ${pinned ? 'bg-primary text-white' : 'text-sub hover:bg-soft'}`}>
            <Pin className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 rounded-xl border border-line min-h-[5rem]" style={previewStyle(fontStack(font), applied, look)}>
        {text}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {t('weightsAvail')} {font.weights.join('·')}
          {applied !== look.weight && <> ({t('weightApplied', { w: applied })})</>} · {font.license}
        </span>
        <div className="flex gap-1.5">
          <button onClick={onCopy} className="bg-soft hover:bg-subtle text-body rounded-lg px-2.5 py-1.5 font-medium inline-flex items-center gap-1">
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('copiedCSS') : t('copyCSS')}
          </button>
          <a href={font.link} target="_blank" rel="noopener noreferrer"
            className="bg-soft hover:bg-subtle text-body rounded-lg px-2.5 py-1.5 font-medium inline-flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> {t('official')}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function FontPreview() {
  const t = useTranslations('fontPreview')
  const searchParams = useSearchParams()
  const presetText = useCallback((p: typeof PRESETS[number]) => t(`presets.${p}.text`), [t])
  const defaultText = presetText('ganada')

  const [text, setText] = useState(defaultText)
  const [subset, setSubset] = useState(defaultText)
  const [look, setLook] = useState<Look>({ ...DEF, align: 'left', dark: false })
  const [cat, setCat] = useState<FontCat | 'all'>('all')
  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [favs, setFavs] = useState<string[]>([])
  const [pins, setPins] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [local, setLocal] = useState<{ name: string; family: string } | null>(null)
  const [localErr, setLocalErr] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const localFace = useRef<FontFace | null>(null)

  const set = <K extends keyof Look>(k: K, v: Look[K]) => setLook(l => ({ ...l, [k]: v }))

  // 초기화: URL > 기본값, 즐겨찾기는 localStorage. 한 번만.
  useEffect(() => {
    if (ready) return
    const p = searchParams
    const tx = p.get('t')
    if (tx) { setText(tx); setSubset(tx) }
    setLook(l => ({
      ...l,
      size: clampNum(p.get('s'), 12, 120, DEF.size),
      weight: nearestWeight(WEIGHTS, clampNum(p.get('w'), 100, 900, DEF.weight)),
      lh: clampNum(p.get('lh'), 0.8, 3, DEF.lh),
      ls: clampNum(p.get('ls'), -10, 20, DEF.ls),
      dark: p.get('bg') === 'dark',
    }))
    setPins(parseIds(p.get('f')))
    try {
      const saved = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
      if (Array.isArray(saved)) setFavs(saved.filter((x): x is string => typeof x === 'string'))
    } catch { /* 저장소 차단 */ }
    setReady(true)
  }, [searchParams, ready])

  // URL 동기화 (기본값은 생략)
  useEffect(() => {
    if (!ready) return
    const url = new URL(window.location.href)
    const put = (k: string, v: string | null) => (v == null ? url.searchParams.delete(k) : url.searchParams.set(k, v))
    put('t', text === defaultText ? null : text.slice(0, 1000))
    put('s', look.size === DEF.size ? null : String(look.size))
    put('w', look.weight === DEF.weight ? null : String(look.weight))
    put('lh', look.lh === DEF.lh ? null : String(look.lh))
    put('ls', look.ls === DEF.ls ? null : String(look.ls))
    put('bg', look.dark ? 'dark' : null)
    put('f', pins.length ? pins.join(',') : null)
    window.history.replaceState(window.history.state, '', url)
  }, [ready, text, defaultText, look, pins])

  // 서브셋 CSS는 입력이 멈춘 뒤 갱신
  useEffect(() => {
    const id = setTimeout(() => setSubset(text), 400)
    return () => clearTimeout(id)
  }, [text])

  const toggleFav = (id: string) => setFavs(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* 저장소 차단 */ }
    return next
  })

  const copyToClipboard = useCallback(async (value: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
    } catch { /* 무시 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const loadLocal = async (file?: File) => {
    if (!file) return
    setLocalErr('')
    if (!LOCAL_EXT.test(file.name)) { setLocalErr(t('local.badType')); return }
    if (file.size > LOCAL_MAX_BYTES) { setLocalErr(t('local.tooLarge')); return }
    try {
      const family = `fp-local-${Date.now()}`
      const face = new FontFace(family, await file.arrayBuffer())
      await face.load()
      if (localFace.current) document.fonts.delete(localFace.current)
      document.fonts.add(face)
      localFace.current = face
      setLocal({ name: file.name, family })
    } catch {
      setLocalErr(t('local.error'))
    }
  }
  const closeLocal = () => {
    if (localFace.current) document.fonts.delete(localFace.current)
    localFace.current = null
    setLocal(null)
  }

  const list = useMemo(() => filterFonts(FONTS, { cat, q, favOnly, favs }), [cat, q, favOnly, favs])
  const pinned = useMemo(() => pins.map(id => FONTS.find(f => f.id === id)!).filter(Boolean), [pins])

  const card = (font: FontInfo, key: string) => (
    <FontCard key={key} font={font} text={text} subset={subset} look={look}
      pinned={pins.includes(font.id)} pinFull={pins.length >= MAX_PIN} fav={favs.includes(font.id)}
      copied={copiedId === `css-${font.id}`}
      onPin={() => setPins(p => togglePin(p, font.id))} onFav={() => toggleFav(font.id)}
      onCopy={() => copyToClipboard(cssSnippet(font, look.weight), `css-${font.id}`)} />
  )

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const label = 'block text-sm font-medium text-body mb-2'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 텍스트 + 스타일 */}
      <div className="ui-card p-6 space-y-5">
        <div>
          <label htmlFor="fp-text" className={label}>{t('sampleText')}</label>
          <textarea id="fp-text" value={text} onChange={e => setText(e.target.value)} rows={2}
            className="ui-field px-4 py-3 resize-y" />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-muted">{t('presetLabel')}</span>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setText(presetText(p))} className={chip(text === presetText(p))}>
                {t(`presets.${p}.name`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="fp-size" className={label}>{t('fontSize')}: {look.size}px</label>
            <input id="fp-size" type="range" min={12} max={120} value={look.size}
              onChange={e => set('size', Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label htmlFor="fp-weight" className={label}>{t('fontWeight')}</label>
            <select id="fp-weight" value={look.weight} onChange={e => set('weight', Number(e.target.value))} className="ui-field px-3 py-2">
              {WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fp-lh" className={label}>{t('lineHeight')}: {look.lh.toFixed(1)}</label>
            <input id="fp-lh" type="range" min={0.8} max={3} step={0.1} value={look.lh}
              onChange={e => set('lh', Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label htmlFor="fp-ls" className={label}>{t('letterSpacing')}: {look.ls}%</label>
            <input id="fp-ls" type="range" min={-10} max={20} step={1} value={look.ls}
              onChange={e => set('ls', Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <span className={label}>{t('textAlign')}</span>
            <div className="flex gap-2">
              {([['left', AlignLeft, 'alignLeft'], ['center', AlignCenter, 'alignCenter'], ['right', AlignRight, 'alignRight']] as const).map(([a, Icon, k]) => (
                <button key={a} onClick={() => set('align', a)} aria-label={t(k)} aria-pressed={look.align === a}
                  className={`flex-1 p-2 rounded-lg ${look.align === a ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  <Icon className="w-5 h-5 mx-auto" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className={label}>{t('previewBg')}</span>
            <div className="flex gap-2">
              <button onClick={() => set('dark', false)} aria-pressed={!look.dark} className={`flex-1 ${chip(!look.dark)}`}>{t('light')}</button>
              <button onClick={() => set('dark', true)} aria-pressed={look.dark} className={`flex-1 ${chip(look.dark)}`}>{t('dark')}</button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => copyToClipboard(window.location.href, 'link')} className="ui-btn-soft px-4 py-2 text-sm">
            {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {copiedId === 'link' ? t('linkCopied') : t('shareLink')}
          </button>
        </div>
      </div>

      {/* 나란히 비교 */}
      {pinned.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">{t('compareTitle', { n: pinned.length, max: MAX_PIN })}</h2>
            <button onClick={() => setPins([])} className="text-sm text-sub hover:text-fg">{t('clearCompare')}</button>
          </div>
          <div className={`grid gap-4 ${pinned.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {pinned.map(f => card(f, `pin-${f.id}`))}
          </div>
          {pinned.length === 1 && <p className="text-sm text-muted">{t('compareHint')}</p>}
        </section>
      )}

      {/* 필터 */}
      <div className="ui-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat('all')} className={chip(cat === 'all')}>{t('all')}</button>
          {CATS.map(c => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{t(`cat.${c}`)}</button>)}
          <button onClick={() => setFavOnly(v => !v)} aria-pressed={favOnly} className={`${chip(favOnly)} inline-flex items-center gap-1`}>
            <Star className="w-3.5 h-3.5" fill={favOnly ? 'currentColor' : 'none'} /> {t('favOnly')} {favs.length > 0 && `(${favs.length})`}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')}
            className="ui-field pl-10 pr-3 py-2.5" />
        </div>
      </div>

      {/* 내 폰트 파일 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); loadLocal(e.dataTransfer.files[0]) }}
        className={`ui-card p-5 border-dashed ${dragOver ? 'border-primary bg-primary-soft' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-fg">{t('local.title')}</h2>
            <p className="text-xs text-muted mt-0.5">{t('local.hint')}</p>
          </div>
          <label className="ui-btn-soft px-4 py-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" /> {t('local.choose')}
            <input type="file" accept=".ttf,.otf,.woff,.woff2" className="sr-only"
              onChange={e => { loadLocal(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
        {localErr && <p className="text-sm text-red-600 mt-3" role="alert">{localErr}</p>}
        {local && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-fg truncate">{local.name}</span>
              <button onClick={closeLocal} aria-label={t('local.remove')} className="p-1.5 rounded-lg text-sub hover:bg-soft"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 rounded-xl border border-line" style={previewStyle(`'${local.family}'`, look.weight, look)}>{text}</div>
          </div>
        )}
      </div>

      {/* 폰트 목록 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-fg">{t('fonts')} <span className="text-sm font-normal text-muted">{t('count', { n: list.length })}</span></h2>
        {list.length === 0
          ? <p className="ui-card p-8 text-center text-sm text-muted">{t('noResults')}</p>
          : <div className="grid md:grid-cols-2 gap-4">{list.map(f => card(f, f.id))}</div>}
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sub leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {(['usage', 'tips', 'license'] as const).map(s => (
          <div key={s}>
            <h3 className="text-lg font-semibold text-fg mb-2">{t(`guide.${s}.title`)}</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sub">
              {arr<string>(t.raw(`guide.${s}.items`)).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {arr<{ q: string; a: string }>(t.raw('guide.faq.items')).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4">
                <p className="font-medium text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
