'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, ClipboardList, Star, Search, X } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  STYLES, FRAMES, applyFrame, frameLabel, styleByKey, unchangedChars, visibleLength,
  type FancyCat, type FancyNote,
} from '@/utils/fancyText'

const CATS: ('all' | FancyCat)[] = ['all', 'bold', 'script', 'deco', 'korean', 'frame']
const LIMITS = [{ key: 'none', n: 0 }, { key: 'kakaoNick', n: 20 }, { key: 'instaBio', n: 150 }] as const
const FAV_KEY = 'fancyText:favorites'
const RECENT_KEY = 'fancyText:recent'
const RECENT_MAX = 8
const HANGUL = /[가-힣ㄱ-ㆎ]/

interface Item { id: string; cat: FancyCat; label: string; output: string; unchanged: string[]; note?: FancyNote }

const load = (key: string): string[] => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
const save = (key: string, v: string[]) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 불가: 무시 */ } }

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-999999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

export default function FancyText() {
  const t = useTranslations('fancyText')
  const sample = t('sample')
  const params = useSearchParams()
  const urlText = params.get('t')

  const [input, setInput] = useState(sample)
  const [cat, setCat] = useState<'all' | FancyCat>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState<number>(0)
  const [frameBase, setFrameBase] = useState('plain')
  const [favs, setFavs] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 공유 링크(?t=) 복원 + 저장된 즐겨찾기/최근 복사
  useEffect(() => { if (urlText !== null) setInput(urlText) }, [urlText])
  useEffect(() => { setFavs(load(FAV_KEY)); setRecent(load(RECENT_KEY)) }, [])

  // 입력 변경 시에만 URL 갱신 (마운트 때 쓰면 공유 링크 파라미터를 지워버림)
  const changeInput = useCallback((v: string) => {
    setInput(v)
    const url = new URL(window.location.href)
    if (v && v !== sample) url.searchParams.set('t', v)
    else url.searchParams.delete('t')
    window.history.replaceState(window.history.state, '', url)
  }, [sample])

  const text = input.trim() ? input : ''
  const hasHangul = HANGUL.test(text)

  const items = useMemo<Item[]>(() => {
    if (!text) return []
    const styled: Item[] = STYLES.map((s) => ({
      id: s.key, cat: s.cat, label: t(`styles.${s.key}`), output: s.convert(text),
      unchanged: unchangedChars(s, text), note: s.note,
    }))
    const base = styleByKey(frameBase)
    const inner = base ? base.convert(text.trim()) : text.trim()
    const framed: Item[] = FRAMES.map((f) => ({
      id: `frame:${f[0]}${f[1]}`, cat: 'frame', label: frameLabel(f), output: applyFrame(f, inner),
      unchanged: base ? unchangedChars(base, text) : [], note: base?.note,
    }))
    return [...styled, ...framed]
  }, [text, frameBase, t])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = items.filter((i) =>
      (cat === 'all' || i.cat === cat) &&
      (!q || i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)))
    // 즐겨찾기 먼저 (즐겨찾기 순서 유지)
    const favIdx = (id: string) => { const k = favs.indexOf(id); return k < 0 ? Infinity : k }
    return list.map((i, k) => ({ i, k })).sort((a, b) => favIdx(a.i.id) - favIdx(b.i.id) || a.k - b.k).map((x) => x.i)
  }, [items, cat, query, favs])

  const copy = useCallback(async (value: string, id: string) => {
    const ok = await writeClipboard(value)
    setCopied({ id, ok })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 2000)
    if (ok && id !== '__all__') {
      setRecent((prev) => { const next = [value, ...prev.filter((v) => v !== value)].slice(0, RECENT_MAX); save(RECENT_KEY, next); return next })
    }
  }, [])

  const toggleFav = useCallback((id: string) => {
    setFavs((prev) => { const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]; save(FAV_KEY, next); return next })
  }, [])

  const clearRecent = () => { setRecent([]); save(RECENT_KEY, []) }
  const inputLen = visibleLength(text)
  const headline = visible[0]?.output ?? text
  const copiedLabel = (id: string) => (copied?.id === id ? (copied.ok ? t('copied') : t('copyFailed')) : t('copy'))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 입력 */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="fancy-input" className="text-sm font-medium text-body">{t('inputLabel')}</label>
          {input && (
            <button onClick={() => changeInput('')} className="text-xs text-muted hover:text-fg flex items-center gap-1">
              <X className="w-3.5 h-3.5" />{t('clear')}
            </button>
          )}
        </div>
        <textarea
          id="fancy-input"
          value={input}
          onChange={(e) => changeInput(e.target.value)}
          placeholder={t('inputPlaceholder')}
          rows={2}
          className="ui-field w-full px-4 py-3 text-lg resize-none"
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-sub">{t('limitLabel')}</span>
          {LIMITS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLimit(l.n)}
              aria-pressed={limit === l.n}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${limit === l.n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
            >
              {t(`limits.${l.key}`)}
            </button>
          ))}
          <span className={`ml-auto tabular-nums ${limit && inputLen > limit ? 'text-red-600 font-semibold' : 'text-muted'}`}>
            {limit ? `${inputLen} / ${limit}` : t('charCount', { n: inputLen })}
          </span>
        </div>
        {hasHangul && cat !== 'korean' && cat !== 'frame' && (
          <div className="bg-subtle rounded-2xl p-4 text-sm text-sub flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex-1 min-w-[200px]">{t('hangulNote')}</span>
            <button onClick={() => setCat('korean')} className="ui-btn-soft px-3 py-1.5 text-xs">{t('showKorean')}</button>
            <button onClick={() => setCat('frame')} className="ui-btn-soft px-3 py-1.5 text-xs">{t('showFrame')}</button>
          </div>
        )}
      </div>

      {/* 최근 복사 */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-body">{t('recentTitle')}</h2>
            <button onClick={clearRecent} className="text-xs text-muted hover:text-fg">{t('recentClear')}</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => copy(r, `recent:${r}`)}
                title={t('copy')}
                className={`shrink-0 max-w-[240px] truncate px-3 py-2 rounded-xl text-sm border ${copied?.id === `recent:${r}` ? 'bg-primary-soft text-primary border-primary' : 'bg-surface text-body border-line hover:bg-soft'}`}
              >
                {copied?.id === `recent:${r}` ? copiedLabel(`recent:${r}`) : r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 탭 + 검색 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          {CATS.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium ${cat === c ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
            >
              {t(`cats.${c}`)}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="ui-field w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {(cat === 'frame' || cat === 'all') && text && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="frame-base" className="text-sub">{t('frameBase')}</label>
          <select id="frame-base" value={frameBase} onChange={(e) => setFrameBase(e.target.value)} className="ui-field px-3 py-2 text-sm">
            <option value="plain">{t('frameBasePlain')}</option>
            {STYLES.filter((s) => s.key !== 'jamo').map((s) => (
              <option key={s.key} value={s.key}>{t(`styles.${s.key}`)}</option>
            ))}
          </select>
        </div>
      )}

      {/* 결과 */}
      {!text ? (
        <div className="ui-card p-12 text-center text-faint">{t('noInput')}</div>
      ) : visible.length === 0 ? (
        <div className="ui-card p-12 text-center text-faint">{t('noResults')}</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{t('tapToCopy')}</p>
            <button
              onClick={() => copy(visible.map((r) => r.output).join('\n'), '__all__')}
              className="ui-btn-soft px-3 py-2 text-sm flex items-center gap-1.5"
            >
              {copied?.id === '__all__' ? <Check className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
              {copied?.id === '__all__' ? copiedLabel('__all__') : t('copyAll')}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((r) => {
              const isCopied = copied?.id === r.id
              const fav = favs.includes(r.id)
              const len = visibleLength(r.output)
              const over = limit > 0 && len > limit
              return (
                <div key={r.id} className={`ui-card p-4 flex flex-col gap-2 ${isCopied ? 'border-primary' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-sub truncate">{r.label}</span>
                    <span className={`ml-auto text-xs tabular-nums ${over ? 'text-red-600 font-semibold' : 'text-faint'}`}>
                      {over ? t('overLimit', { n: len - limit }) : t('charCount', { n: len })}
                    </span>
                    <button
                      onClick={() => toggleFav(r.id)}
                      aria-pressed={fav}
                      aria-label={fav ? t('unfavorite') : t('favorite')}
                      title={fav ? t('unfavorite') : t('favorite')}
                      className={`p-1 rounded-lg hover:bg-soft ${fav ? 'text-primary' : 'text-faint'}`}
                    >
                      <Star className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => copy(r.output, r.id)}
                    className="text-left flex items-start gap-3 rounded-xl -mx-1 px-1 py-1 hover:bg-soft"
                    aria-label={`${t('copy')} ${r.label}`}
                  >
                    <span className="flex-1 text-xl leading-relaxed text-fg break-all" lang="und">{r.output}</span>
                    <span className={`shrink-0 mt-1 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${isCopied ? (copied?.ok ? 'bg-primary text-white' : 'bg-red-50 text-red-700') : 'bg-soft text-sub'}`}>
                      {isCopied && copied?.ok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedLabel(r.id)}
                    </span>
                  </button>
                  {r.unchanged.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t('unchanged', { chars: r.unchanged.slice(0, 8).join(' ') + (r.unchanged.length > 8 ? ' …' : '') })}
                    </p>
                  )}
                  {r.note && <p className="text-xs text-muted">{t(`notes.${r.note}`)}</p>}
                </div>
              )
            })}
          </div>
          <p className="sr-only" aria-live="polite">{copied ? (copied.ok ? t('copied') : t('copyFailed')) : ''}</p>
          <ShareResult
            card={{ tool: t('title'), label: t('shareLabel'), headline }}
            text={`${headline}\n${t('shareText')}`}
            fileName="fancy-text"
          />
        </>
      )}

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['usage', 'how', 'tips'] as const).map((g) => (
            <div key={g}>
              <h3 className="font-medium text-body mb-2">{t(`guide.${g}Title`)}</h3>
              <ul className="space-y-1.5 list-disc pl-4 text-sm text-sub">
                {((t.raw(`guide.${g}Items`) as string[]) ?? []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        {Array.isArray(t.raw('guide.faq.items')) && (
          <div>
            <h3 className="font-medium text-body mb-2">{t('guide.faq.title')}</h3>
            <div className="space-y-2">
              {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
                <details key={i} className="bg-subtle rounded-2xl px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                  <p className="text-sm text-sub mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
