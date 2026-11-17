'use client'

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/characterCounter'
import { Copy, Check, Trash2, Undo2, ExternalLink } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import WritingVersionsPanel from '@/components/WritingVersionsPanel'
import CharacterCopyRecovery from '@/components/CharacterCopyRecovery'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { parseWritingDraft, withWritingStorageLock, WRITING_DRAFT_KEY, type WritingDraft } from '@/utils/writingVersions'
import { createCharacterDraft, initializeCharacterDraft, patchCharacterDraft, selectCharacterTab, undoCharacterDraft, clearCharacterDraft, characterDraftRaw, emptyCharacterTabs, type CharacterDraftState } from '@/utils/characterCounterDraft'
import { createCharacterCopy, type CharacterCopyState } from '@/utils/characterCounterActions'
import {
  analyze, measure, PRESETS, tidy, collapseSpaces, joinLines, stripSpecial, topWords, splitHighlights, type Basis,
} from '@/utils/charCount'

type Tab = WritingDraft

const STORAGE_KEY = WRITING_DRAFT_KEY
const BASES: Basis[] = ['chars', 'charsNoSpace', 'bytesKr', 'x']
const SPELLER_URL = 'https://nara-speller.co.kr/speller/'

export default function CharacterCounter() {
  const t = useTranslations('characterCounter')
  const language = useOptionalLanguage()?.language ?? 'ko'
  const [model, setModel] = useState(createCharacterDraft)
  const { tabs, active, loaded, undo } = model
  const live = useRef(model), life = useRef({ alive: false, epoch: 0, operation: 0 })
  const clearOwner = useRef<object | null>(null)
  const copyOwner = useRef<ReturnType<typeof createCharacterCopy> | null>(null)
  const [copyState, setCopyState] = useState<CharacterCopyState | null>(null)
  const [actionNotice, setActionNotice] = useState<'clearCancelled' | 'spellerOpened' | 'spellerFailed' | null>(null)
  const [marks, setMarks] = useState('')
  const [clearing, setClearing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saving' | 'autosaved' | 'failed' | 'corrupt' | 'unavailable' | 'conflict'>('loading')
  const draftRaw = useRef<string | null>(null)
  const draftBaseline = useRef('')
  const draftBlocked = useRef(false)

  const commit = useCallback((next: CharacterDraftState) => {
    if (!life.current.alive || next === live.current) return
    life.current.operation++; live.current = next; setModel(next); copyOwner.current?.invalidate()
    if (clearOwner.current) { clearOwner.current = null; setClearing(false); setActionNotice('clearCancelled') }
    else setActionNotice(null)
    if (next.loaded && !draftBlocked.current) setSaveStatus(characterDraftRaw(next) === draftBaseline.current ? 'autosaved' : 'saving')
  }, [])
  useLayoutEffect(() => {
    const lifetime = life.current
    lifetime.alive = true; lifetime.epoch++
    const owner = createCharacterCopy({ after: (callback, ms) => { const timer = setTimeout(callback, ms); return () => clearTimeout(timer) } }, setCopyState)
    copyOwner.current = owner
    const epoch = lifetime.epoch
    queueMicrotask(() => { if (lifetime.alive && lifetime.epoch === epoch) { setClearing(false); setCopyState(null) } })
    return () => { lifetime.alive = false; lifetime.epoch++; lifetime.operation++; clearOwner.current = null; owner.dispose(); copyOwner.current = null }
  }, [])
  const copyLocale = language + ':' + t('copyRecovery.failed')
  useLayoutEffect(() => { copyOwner.current?.invalidate() }, [copyLocale])

  // Invalid or inaccessible drafts stay untouched; saving is confirmed only after setItem succeeds.
  useEffect(() => {
    let mounted = true
    queueMicrotask(function restoreInitialCharacterDraft() {
      if (!mounted || !life.current.alive || live.current.loaded) return
      let raw: string | null
      try { raw = localStorage.getItem(STORAGE_KEY) } catch {
        draftBlocked.current = true
        setSaveStatus('unavailable')
        commit(initializeCharacterDraft(live.current, null))
        return
      }
      draftRaw.current = raw
      try {
        const saved = parseWritingDraft(raw) ?? { tabs: emptyCharacterTabs(), active: 0 }
        draftBaseline.current = JSON.stringify(saved)
        commit(initializeCharacterDraft(live.current, saved))
      } catch {
        draftBlocked.current = true
        setSaveStatus('corrupt')
        commit(initializeCharacterDraft(live.current, null))
      }
    })
    return () => { mounted = false }
  }, [commit])

  const saveDraft = useCallback(async () => {
    const state = live.current, lifetime = life.current
    if (!lifetime.alive || !state.loaded || draftBlocked.current || clearOwner.current) return
    const next = characterDraftRaw(state)
    if (next === draftBaseline.current) return
    const expectedRaw = draftRaw.current, epoch = lifetime.epoch, request = ++lifetime.operation
    const current = () => lifetime.alive && lifetime.epoch === epoch && lifetime.operation === request && live.current.revision === state.revision && !draftBlocked.current
    setSaveStatus('saving')
    try {
      await withWritingStorageLock(STORAGE_KEY, () => {
        if (!current() || next === draftBaseline.current) return
        if (localStorage.getItem(STORAGE_KEY) !== expectedRaw) {
          draftBlocked.current = true
          setSaveStatus('conflict')
          return
        }
        localStorage.setItem(STORAGE_KEY, next)
        if (localStorage.getItem(STORAGE_KEY) !== next) {
          draftBlocked.current = true
          setSaveStatus('conflict')
          return
        }
        draftRaw.current = next
        draftBaseline.current = next
        setSaveStatus('autosaved')
      })
    } catch { if (current()) setSaveStatus('failed') }
  }, [])
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) void saveDraft() })
    return () => { cancelled = true }
  }, [saveDraft, model])

  const tab = tabs[active]
  const stats = useMemo(() => analyze(tab.text), [tab.text])
  const tabStats = useMemo(() => tabs.map(tb => measure(analyze(tb.text), tb.basis)), [tabs])
  const words = useMemo(() => topWords(tab.text), [tab.text])
  const markList = useMemo(() => marks.split(',').map(s => s.trim()).filter(Boolean), [marks])
  const pieces = useMemo(() => splitHighlights(tab.text, markList), [tab.text, markList])

  const patch = useCallback((p: Partial<Tab>) => {
    if (live.current.active === active) commit(patchCharacterDraft(live.current, active, p))
  }, [active, commit])

  const transform = (fn: (s: string) => string) => {
    const current = live.current
    if (!current.loaded || current.active !== active) return
    commit(patchCharacterDraft(current, active, { text: fn(current.tabs[active].text) }, true))
  }

  const handleCopy = (kind: 'copy' | 'speller' = 'copy') => {
    const current = live.current
    if (!life.current.alive || !current.loaded || current.active !== active) return
    const text = current.tabs[active].text
    if (!text) { copyOwner.current?.invalidate(); return }
    return copyOwner.current?.request({ text, tab: active, revision: current.revision, kind })
  }

  const handleClear = () => {
    const current = live.current
    if (!life.current.alive || !current.loaded || current.active !== active || !current.tabs[active].text || !window.confirm(t('save.confirmClear'))) return
    if (live.current === current) commit(patchCharacterDraft(current, active, { text: '' }, true))
  }

  const handleClearAll = async () => {
    const state = live.current, lifetime = life.current
    if (!lifetime.alive || !state.loaded || clearOwner.current || !window.confirm(t('save.confirmClearAll')) || live.current !== state) return
    const owner = {}, epoch = lifetime.epoch, request = ++lifetime.operation, expectedRaw = draftRaw.current
    clearOwner.current = owner; copyOwner.current?.invalidate(); setClearing(true); setActionNotice(null)
    const current = () => lifetime.alive && lifetime.epoch === epoch && lifetime.operation === request && live.current.revision === state.revision && clearOwner.current === owner
    // This explicit confirmation also allows replacing a damaged automatic draft.
    try {
      await withWritingStorageLock(STORAGE_KEY, () => {
        if (!current()) return
        if (localStorage.getItem(STORAGE_KEY) !== expectedRaw) {
          draftBlocked.current = true
          setSaveStatus('conflict')
          return
        }
        localStorage.removeItem(STORAGE_KEY)
        if (localStorage.getItem(STORAGE_KEY) !== null) {
          draftBlocked.current = true
          setSaveStatus('conflict')
          return
        }
        draftRaw.current = null
        const empty = clearCharacterDraft(live.current)
        draftBaseline.current = characterDraftRaw(empty)
        draftBlocked.current = false
        clearOwner.current = null; setClearing(false); commit(empty)
        setSaveStatus('autosaved')
      })
    } catch {
      if (current()) setSaveStatus('failed')
    }
    if (current()) { clearOwner.current = null; setClearing(false) }
  }

  const openSpeller = () => {
    if (!life.current.alive || !live.current.loaded || live.current.active !== active) return
    void handleCopy('speller')
    try { window.open(SPELLER_URL, '_blank', 'noopener,noreferrer'); setActionNotice('spellerOpened') }
    catch { setActionNotice('spellerFailed') }
  }
  const copied = copyState?.status === 'copied', copying = copyState?.status === 'copying'

  const toggleMark = (w: string) =>
    setMarks(markList.includes(w) ? markList.filter(x => x !== w).join(', ') : [...markList, w].join(', '))

  const current = measure(stats, tab.basis)
  const pct = tab.target > 0 ? Math.min(100, (current / tab.target) * 100) : 0
  const over = tab.target > 0 && current > tab.target
  const unit = t(`target.unit.${tab.basis}`)
  const dur = (sec: number) => t('stats.duration', { m: Math.floor(sec / 60), s: sec % 60 })
  const n = (v: number) => v.toLocaleString()

  const statItems: { label: string; value: string; hint?: string }[] = [
    { label: t('stats.chars'), value: n(stats.chars) },
    { label: t('stats.charsNoSpace'), value: n(stats.charsNoSpace) },
    { label: t('stats.bytesKr'), value: n(stats.bytesKr), hint: t('stats.bytesKrHint', { n: n(stats.bytesKrNoSpace) }) },
    { label: t('stats.bytesUtf8'), value: n(stats.bytesUtf8) },
    { label: t('stats.words'), value: n(stats.words) },
    { label: t('stats.sentences'), value: n(stats.sentences) },
    { label: t('stats.paragraphs'), value: n(stats.paragraphs) },
    { label: t('stats.lines'), value: n(stats.lines) },
    { label: t('stats.manuscript'), value: t('stats.manuscriptValue', { sheets: stats.manuscript.sheets.toFixed(1) }), hint: t('stats.manuscriptHint', { rows: stats.manuscript.rows, pages: stats.manuscript.pages }) },
    { label: t('stats.read'), value: dur(stats.readSec) },
    { label: t('stats.speak'), value: dur(stats.speakSec) },
    { label: t('stats.x'), value: `${n(stats.x)} / 280` },
  ]

  const btnSoft = 'min-h-11 px-3 py-2 rounded-xl text-sm font-medium bg-soft hover:bg-subtle text-body disabled:opacity-45 disabled:pointer-events-none'

  return (
    <div data-character-root="" data-character-ready={loaded} data-character-active={active} data-character-revision={model.revision} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 문항 탭 */}
      <div role="tablist" aria-label={t('tabs.aria')} className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tb, i) => (
          <button
            key={i}
            role="tab"
            data-character-tab={i}
            aria-selected={i === active}
            onClick={() => commit(selectCharacterTab(live.current, i))}
            className={`min-h-11 shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-left ${i === active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            <span className="block">{tb.title.trim() || t('tabs.label', { n: i + 1 })}</span>
            <span className={`block text-xs tabular-nums ${i === active ? 'text-white/70' : 'text-muted'}`}>
              {n(tabStats[i])}/{n(tb.target)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="lg:col-span-2 ui-card overflow-hidden">
          <input
            data-character-title=""
            value={tab.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder={t('tabs.titlePlaceholder', { n: active + 1 })}
            aria-label={t('tabs.titleAria')}
            maxLength={40}
            className="w-full min-h-11 px-4 pt-4 pb-2 bg-transparent text-base text-fg font-semibold focus:outline-none placeholder:text-faint"
          />
          <textarea
            data-character-content=""
            value={tab.text}
            onChange={e => patch({ text: e.target.value })}
            placeholder={t('input.placeholder')}
            aria-label={t('input.aria')}
            className="w-full h-72 px-4 pb-4 text-fg bg-transparent resize-y focus:outline-none text-base leading-relaxed placeholder:text-faint"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-subtle border-t border-line">
            <div className="space-y-1">
              <p data-character-save-status={saveStatus} role={saveStatus === 'autosaved' || saveStatus === 'loading' || saveStatus === 'saving' ? 'status' : 'alert'} className={`text-xs ${saveStatus === 'autosaved' || saveStatus === 'loading' || saveStatus === 'saving' ? 'text-muted' : 'text-amber-800'}`}>{t(`save.${saveStatus}`)}</p>
              {saveStatus === 'failed' && <button data-character-save-retry="" onClick={saveDraft} className={btnSoft}>{t('save.retry')}</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button data-character-copy="" onClick={() => void handleCopy()} disabled={!loaded || !tab.text || copying} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('actions.copied') : copying ? t('copyRecovery.copying') : t('actions.copy')}
              </button>
              <button data-character-clear="" onClick={handleClear} disabled={!loaded || !tab.text} className={`${btnSoft} inline-flex items-center gap-1.5`}>
                <Trash2 className="w-4 h-4" />{t('actions.clear')}
              </button>
            </div>
          </div>
          {copyState?.status === 'failed' && <div className="p-4"><CharacterCopyRecovery text={copyState.text} tab={copyState.tab}
            onRetry={() => { void copyOwner.current?.retry(copyState.token) }} onClose={() => copyOwner.current?.close(copyState.token)} /></div>}
          {actionNotice && <p data-character-action-notice={actionNotice} role={actionNotice === 'spellerFailed' ? 'alert' : 'status'} className="px-4 pb-4 text-sm text-sub">{t(`editing.${actionNotice}`)}</p>}
        </div>

        {/* 목표 */}
        <div className="space-y-4">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t(`target.basis.${tab.basis}`)}</div>
            <div className="mt-1 text-4xl font-bold tabular-nums">
              {n(current)}<span className="text-lg font-medium text-white/70"> / {n(tab.target)}{unit}</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/25 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full ${over ? 'bg-amber-300' : 'bg-white'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-sm font-medium tabular-nums">
              {tab.target > 0 && (over
                ? t('target.over', { n: n(current - tab.target), unit })
                : t('target.remaining', { n: n(tab.target - current), unit }))}
            </div>
          </div>
          {over && (
            <div role="alert" className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('target.overWarn')}</div>
          )}

          <div className="ui-card p-5 space-y-4">
            <div>
              <div className="text-sm font-medium text-body mb-2">{t('target.basisLabel')}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {BASES.map(b => (
                  <button
                    key={b}
                    data-character-basis={b}
                    onClick={() => patch({ basis: b })}
                    aria-pressed={tab.basis === b}
                    className={`min-h-11 px-3 py-2 rounded-xl text-sm font-medium ${tab.basis === b ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t(`target.basis.${b}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-body">{t('target.limit')}</span>
              <input
                data-character-target=""
                type="number"
                inputMode="numeric"
                min={0}
                value={tab.target || ''}
                onChange={e => { const value = Number(e.target.value); patch({ target: Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0 }) }}
                className="ui-field min-h-11 text-base px-4 py-2.5 mt-1.5 tabular-nums"
              />
            </label>
            <div>
              <div className="text-sm font-medium text-body mb-2">{t('target.presets')}</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => {
                  // 같은 한도·기준의 프리셋이 여럿이면 첫 번째만 선택 표시
                  const on = PRESETS.find(q => q.limit === tab.target && q.basis === tab.basis)?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => patch({ target: p.limit, basis: p.basis })}
                      aria-pressed={on}
                      className={`min-h-11 px-2.5 py-1.5 rounded-lg text-xs font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {t(`target.presetNames.${p.id}`)}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted mt-2">{t('target.presetNote')}</p>
            </div>
          </div>
        </div>
      </div>

      <fieldset disabled={!loaded} className="min-w-0"><WritingVersionsPanel current={tab} activeTab={active} onRestore={draft => {
        const current = live.current
        if (!current.loaded || current.active !== active || current.tabRevisions[active] !== model.tabRevisions[active]) return
        commit(patchCharacterDraft(current, active, draft, true))
      }} /></fieldset>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {statItems.map(s => (
          <div key={s.label} className="ui-card p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="text-xl font-bold text-fg tabular-nums mt-1">{s.value}</div>
            {s.hint && <div className="text-xs text-faint mt-0.5">{s.hint}</div>}
          </div>
        ))}
      </div>
      {(stats.siteChars !== stats.chars) && (
        <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">
          {t('stats.siteNote', { n: n(stats.siteChars), m: n(stats.siteCharsNoSpace) })}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 정리 도구 */}
        <div className="ui-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">{t('tools.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <button data-character-transform="tidy" className={btnSoft} disabled={!loaded || !tab.text} onClick={() => transform(tidy)}>{t('tools.tidy')}</button>
            <button data-character-transform="collapse" className={btnSoft} disabled={!loaded || !tab.text} onClick={() => transform(collapseSpaces)}>{t('tools.collapse')}</button>
            <button data-character-transform="joinLines" className={btnSoft} disabled={!loaded || !tab.text} onClick={() => transform(joinLines)}>{t('tools.joinLines')}</button>
            <button data-character-transform="stripSpecial" className={btnSoft} disabled={!loaded || !tab.text} onClick={() => transform(stripSpecial)}>{t('tools.stripSpecial')}</button>
            <button data-character-transform="upper" className={btnSoft} disabled={!loaded || !tab.text} onClick={() => transform(s => s.toUpperCase())}>{t('tools.upper')}</button>
            <button data-character-transform="lower" className={btnSoft} disabled={!loaded || !tab.text} onClick={() => transform(s => s.toLowerCase())}>{t('tools.lower')}</button>
            <button
              className={`${btnSoft} inline-flex items-center gap-1.5`}
              data-character-undo=""
              disabled={!loaded || !undo || undo.tab !== active || undo.afterRevision !== model.tabRevisions[active]}
              onClick={() => { if (undo) commit(undoCharacterDraft(live.current, undo.token)) }}
            >
              <Undo2 className="w-4 h-4" />{t('tools.undo')}
            </button>
          </div>
          <div className="bg-subtle rounded-2xl p-4 space-y-2">
            <button data-character-speller="" onClick={openSpeller} disabled={!loaded} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45">
              {t('tools.spell')}<ExternalLink className="w-4 h-4" />
            </button>
            <p className="text-xs text-sub">{t('tools.spellHint')}</p>
          </div>
          <button data-character-clear-all="" onClick={handleClearAll} disabled={!loaded || clearing} className="min-h-11 text-xs text-muted underline hover:text-body disabled:opacity-45">{t('save.clearAll')}</button>
        </div>

        {/* 반복어 */}
        <div className="ui-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('words.title')}</h2>
            <p className="text-xs text-muted mt-1">{t('words.hint')}</p>
          </div>
          {words.length ? (
            <div className="flex flex-wrap gap-1.5">
              {words.map(w => {
                const on = markList.includes(w.word)
                return (
                  <button
                    key={w.word}
                    onClick={() => toggleMark(w.word)}
                    aria-pressed={on}
                    className={`min-h-11 px-2.5 py-1.5 rounded-lg text-sm ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {w.word} <span className={on ? 'text-white/70' : 'text-muted'}>{t('words.times', { n: w.count })}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">{t('words.empty')}</p>
          )}
          <label className="block">
            <span className="text-sm font-medium text-body">{t('words.marks')}</span>
            <input
              value={marks}
              onChange={e => setMarks(e.target.value)}
              placeholder={t('words.marksPlaceholder')}
              className="ui-field min-h-11 text-base px-4 py-2.5 mt-1.5"
            />
          </label>
          {markList.length > 0 && tab.text && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-body">{t('words.preview', { n: pieces.filter(p => p.hit).length })}</span>
                <button onClick={() => setMarks('')} className="min-h-11 text-xs text-muted underline hover:text-body">{t('words.clearMarks')}</button>
              </div>
              <div className="bg-subtle rounded-2xl p-4 text-sm text-body whitespace-pre-wrap break-words max-h-64 overflow-y-auto leading-relaxed">
                {pieces.map((p, i) => p.hit
                  ? <mark key={i} className="bg-amber-200 text-fg rounded px-0.5">{p.text}</mark>
                  : <span key={i}>{p.text}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 계산 기준 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-3">{t('rules.title')}</h2>
        <ul className="space-y-2 text-sm text-sub list-disc pl-5">
          {(t.raw('rules.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>

      <GuideSection namespace="characterCounter" />
    </div>
  )
}
