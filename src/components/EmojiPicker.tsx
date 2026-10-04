'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/emojiPicker'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Search, X, Copy, Check } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import {
  EMOJIS, EMOJI_CATEGORIES, CHAR_GROUPS, KAOMOJI_GROUPS, SKIN_TONES, groupChars, searchAll,
  applySkinTone, findEmoji, toCodepoints, toHtmlEntity, toJsEscape, type EmojiCategory,
} from '@/utils/emoji'

type Tab = 'emoji' | 'chars' | 'kaomoji'
type Mode = 'copy' | 'collect'

const RECENT_KEY = 'toolhub-recent-emojis'
const TONE_KEY = 'toolhub-emoji-skin-tone'
const MAX_RECENT = 30

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-999999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

const chip = (on: boolean) =>
  `h-10 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const emojiCell = 'h-12 sm:h-14 flex items-center justify-center text-3xl rounded-xl hover:bg-soft transition-colors'
const charCell = 'h-11 flex items-center justify-center text-xl text-fg rounded-xl hover:bg-soft transition-colors'
const kaoCell = 'min-h-11 px-4 py-2 text-left text-body rounded-xl border border-line hover:bg-soft transition-colors break-all'
const emojiGrid = 'grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-8 xl:grid-cols-10 gap-1'
const charGrid = 'grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-10 xl:grid-cols-12 gap-1'

export default function EmojiPicker() {
  const t = useTranslations('emojiPicker')
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('emoji')
  const [category, setCategory] = useState<EmojiCategory | 'all'>('all')
  const [charGroup, setCharGroup] = useState(CHAR_GROUPS[0].id)
  const [kaoGroup, setKaoGroup] = useState(KAOMOJI_GROUPS[0].id)
  const [tone, setTone] = useState(0)
  const [mode, setMode] = useState<Mode>('copy')
  const [tray, setTray] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [selected, setSelected] = useState('😀')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [urlReady, setUrlReady] = useState(false)

  // URL(?q=하트&tab=chars) → 상태 (마운트 후 1회)
  useEffect(() => {
    if (urlReady) return
    const q = searchParams.get('q')
    const tb = searchParams.get('tab')
    if (q) setQuery(q)
    if (tb === 'chars' || tb === 'kaomoji') setTab(tb)
    setUrlReady(true)
  }, [searchParams, urlReady])

  // 상태 → URL (공유 링크). 위에서 URL을 읽기 전엔 쓰지 않음 (공유 링크 덮어쓰기 방지)
  useEffect(() => {
    if (!urlReady) return
    const url = new URL(window.location.href)
    if (query.trim()) url.searchParams.set('q', query)
    else url.searchParams.delete('q')
    if (tab !== 'emoji') url.searchParams.set('tab', tab)
    else url.searchParams.delete('tab')
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [query, tab, urlReady])

  // localStorage (마운트 후)
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      if (Array.isArray(r)) setRecent(r.filter((x) => typeof x === 'string').slice(0, MAX_RECENT))
      const tn = Number(localStorage.getItem(TONE_KEY))
      if (tn > 0 && tn < SKIN_TONES.length) setTone(tn)
    } catch { /* 저장소 차단 */ }
  }, [])

  const toneMod = SKIN_TONES[tone]
  const changeTone = (i: number) => {
    setTone(i)
    try { localStorage.setItem(TONE_KEY, String(i)) } catch { /* noop */ }
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1600)
  }, [])

  const pushRecent = useCallback((text: string) => {
    setRecent((prev) => {
      const next = [text, ...prev.filter((x) => x !== text)].slice(0, MAX_RECENT)
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })
  }, [])

  const copyWithToast = useCallback(async (text: string, msg = `${text}  ${t('copied')}`) => {
    try { await copyText(text) } catch { /* 권한 거부 시에도 안내는 표시 */ }
    showToast(msg)
  }, [showToast, t])

  /** 그리드 항목 탭: 바로 복사 or 담기 */
  const pick = useCallback((text: string) => {
    setSelected(text)
    pushRecent(text)
    if (mode === 'collect') {
      setTray((s) => s + text)
      showToast(`${text}  ${t('added')}`)
    } else {
      copyWithToast(text)
    }
  }, [mode, pushRecent, showToast, copyWithToast, t])

  const results = useMemo(() => searchAll(query), [query])
  const searching = !!query.trim()
  const emojiList = useMemo(
    () => (category === 'all' ? EMOJIS : EMOJIS.filter((x) => x.cat === category)),
    [category]
  )
  const currentChars = useMemo(() => Array.from(groupChars(CHAR_GROUPS.find((g) => g.id === charGroup)!)), [charGroup])
  const currentCharGroup = CHAR_GROUPS.find((g) => g.id === charGroup)!
  const currentKao = KAOMOJI_GROUPS.find((g) => g.id === kaoGroup)!

  const renderEmojis = (list: typeof EMOJIS) => (
    <div className={emojiGrid}>
      {list.map((x) => {
        const shown = applySkinTone(x.e, toneMod)
        return (
          <button key={x.e} type="button" onClick={() => pick(shown)} title={x.ko.split(' ')[0]} aria-label={x.ko.split(' ')[0]}
            className={`${emojiCell} ${selected === shown ? 'bg-primary-soft' : ''}`}>
            {shown}
          </button>
        )
      })}
    </div>
  )
  const renderChars = (list: string[]) => (
    <div className={charGrid}>
      {list.map((c) => (
        <button key={c} type="button" onClick={() => pick(c)} className={`${charCell} ${selected === c ? 'bg-primary-soft' : ''}`}>
          {c}
        </button>
      ))}
    </div>
  )
  const renderKaomoji = (list: string[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {list.map((k) => (
        <button key={k} type="button" onClick={() => pick(k)} className={`${kaoCell} ${selected === k ? 'bg-primary-soft border-primary' : ''}`}>
          {k}
        </button>
      ))}
    </div>
  )
  const sectionTitle = (label: string, n: number) => (
    <h3 className="text-sm font-semibold text-body mb-2">
      {label} <span className="text-muted font-normal">{t('count', { n })}</span>
    </h3>
  )

  // 선택 항목 상세
  const info = findEmoji(selected)
  const cpCount = Array.from(selected).length
  const detailRows: [string, string][] = cpCount <= 12
    ? [[t('detail.unicode'), toCodepoints(selected)], [t('detail.html'), toHtmlEntity(selected)], [t('detail.js'), toJsEscape(selected)]]
    : []
  const skinTones = t.raw('skinTones') as string[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 검색 */}
      <div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint pointer-events-none" />
          <input
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="ui-field w-full pl-12 pr-12 py-3 text-base"
          />
          {searching && (
            <button type="button" onClick={() => setQuery('')} aria-label={t('clearSearch')}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-faint hover:text-body">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {results.fixedQuery && (
          <p className="text-sm text-muted mt-2">{t('typoFixed', { from: query.trim(), to: results.fixedQuery })}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 목록 */}
        <div className="lg:col-span-2 ui-card p-4 sm:p-6 space-y-4 min-w-0">
          {/* 탭 동작 + 피부색 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="inline-flex bg-soft rounded-xl p-1" role="group" aria-label={t('mode.label')}>
              {(['copy', 'collect'] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                  className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'text-body'}`}>
                  {t(`mode.${m}`)}
                </button>
              ))}
            </div>
            {(tab === 'emoji' || searching) && (
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('skinTone')}>
                <span className="text-sm text-muted mr-1">{t('skinTone')}</span>
                {SKIN_TONES.map((mod, i) => (
                  <button key={i} type="button" onClick={() => changeTone(i)} aria-pressed={tone === i} aria-label={skinTones[i]} title={skinTones[i]}
                    className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl border-2 transition-colors ${tone === i ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-soft'}`}>
                    {'✋' + mod}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 담기 바구니 */}
          {mode === 'collect' && (
            <div className="bg-subtle rounded-2xl p-3 space-y-2">
              <input value={tray} onChange={(e) => setTray(e.target.value)} placeholder={t('tray.placeholder')} aria-label={t('tray.label')}
                className="ui-field w-full px-4 py-3 text-xl" />
              <div className="flex gap-2">
                <button type="button" disabled={!tray} onClick={() => copyWithToast(tray, t('tray.copiedAll', { n: Array.from(tray).length }))}
                  className="ui-btn flex-1 h-11 px-4 inline-flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" />{t('tray.copyAll')}
                </button>
                <button type="button" disabled={!tray} onClick={() => setTray('')} className="ui-btn-soft h-11 px-4 disabled:opacity-50">
                  {t('tray.clear')}
                </button>
              </div>
            </div>
          )}

          {searching ? (
            /* 통합 검색 결과 */
            results.emojis.length + results.chars.length + results.kaomoji.length === 0 ? (
              <p className="text-center py-12 text-muted">{t('noResults')}</p>
            ) : (
              <div className="space-y-6">
                {!!results.emojis.length && <section>{sectionTitle(t('tabs.emoji'), results.emojis.length)}{renderEmojis(results.emojis)}</section>}
                {!!results.chars.length && <section>{sectionTitle(t('tabs.chars'), results.chars.length)}{renderChars(results.chars)}</section>}
                {!!results.kaomoji.length && <section>{sectionTitle(t('tabs.kaomoji'), results.kaomoji.length)}{renderKaomoji(results.kaomoji)}</section>}
              </div>
            )
          ) : (
            <>
              {/* 최근 사용 */}
              {!!recent.length && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-body">{t('recentlyUsed')}</h3>
                    <button type="button" onClick={() => { setRecent([]); try { localStorage.removeItem(RECENT_KEY) } catch { /* noop */ } }}
                      className="h-10 px-3 text-sm text-muted hover:text-body">
                      {t('clearRecent')}
                    </button>
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {recent.map((r) => (
                      <button key={r} type="button" onClick={() => pick(r)}
                        className={`shrink-0 h-12 min-w-12 px-2 flex items-center justify-center rounded-xl hover:bg-soft whitespace-nowrap ${Array.from(r).length > 3 ? 'text-sm text-body' : 'text-2xl text-fg'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* 탭 */}
              <div className="grid grid-cols-3 gap-1 bg-soft rounded-xl p-1" role="tablist">
                {(['emoji', 'chars', 'kaomoji'] as Tab[]).map((id) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={`h-10 rounded-lg text-sm font-semibold transition-colors ${tab === id ? 'bg-primary text-white' : 'text-body'}`}>
                    {t(`tabs.${id}`)}
                  </button>
                ))}
              </div>

              {/* 분류 칩 */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tab === 'emoji' && (['all', ...EMOJI_CATEGORIES] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)} className={chip(category === c)}>{t(`categories.${c}`)}</button>
                ))}
                {tab === 'chars' && CHAR_GROUPS.map((g) => (
                  <button key={g.id} type="button" onClick={() => setCharGroup(g.id)} className={chip(charGroup === g.id)}>{t(`charGroups.${g.id}`)}</button>
                ))}
                {tab === 'kaomoji' && KAOMOJI_GROUPS.map((g) => (
                  <button key={g.id} type="button" onClick={() => setKaoGroup(g.id)} className={chip(kaoGroup === g.id)}>{t(`kaomojiGroups.${g.id}`)}</button>
                ))}
              </div>

              {tab === 'emoji' && renderEmojis(emojiList)}
              {tab === 'chars' && (
                <>
                  {currentCharGroup.ime && <p className="text-xs text-muted">{t('imeHint', { key: currentCharGroup.ime })}</p>}
                  {renderChars(currentChars)}
                </>
              )}
              {tab === 'kaomoji' && renderKaomoji(currentKao.items)}
            </>
          )}
        </div>

        {/* 선택한 문자 상세 */}
        <aside className="ui-card p-5 space-y-4 lg:sticky lg:top-20 self-start min-w-0">
          <h2 className="text-sm font-semibold text-muted">{t('detail.title')}</h2>
          <div className="bg-subtle rounded-2xl p-5 text-center">
            <div className={`text-fg break-all ${cpCount > 3 ? 'text-2xl' : 'text-6xl'} leading-tight`}>{selected}</div>
            {info && <p className="text-sm text-body mt-3">{info.ko.split(' ')[0]} <span className="text-muted">· {info.en.split(',')[0]}</span></p>}
          </div>
          <button type="button" onClick={() => copyWithToast(selected)} className="ui-btn w-full h-11 px-4 inline-flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" />{t('detail.copy')}
          </button>
          {!!detailRows.length && (
            <dl className="space-y-2">
              {detailRows.map(([label, value]) => (
                <div key={label} className="flex items-center gap-2">
                  <dt className="w-16 shrink-0 text-xs text-muted">{label}</dt>
                  <dd className="flex-1 min-w-0 font-mono text-sm text-body break-all">{value}</dd>
                  <button type="button" onClick={() => copyWithToast(value, `${label}  ${t('copied')}`)} aria-label={`${label} ${t('detail.copy')}`}
                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-sub hover:bg-soft">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </dl>
          )}
          <p className="text-xs text-muted">{t('clickToCopy')}</p>
        </aside>
      </div>

      <GuideSection namespace="emojiPicker" defaultOpen />

      {toast && (
        <div role="status" aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] bg-fg text-canvas text-sm px-4 py-2.5 rounded-full shadow-lg inline-flex items-center gap-2 whitespace-nowrap overflow-hidden">
          <Check className="w-4 h-4 shrink-0" /><span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  )
}
