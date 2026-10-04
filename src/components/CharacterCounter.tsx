'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/characterCounter'
import { Copy, Check, Trash2, Undo2, ExternalLink } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import {
  analyze, measure, PRESETS, tidy, collapseSpaces, joinLines, stripSpecial, topWords, splitHighlights, type Basis,
} from '@/utils/charCount'

interface Tab { title: string; text: string; target: number; basis: Basis }

const TAB_COUNT = 5
const STORAGE_KEY = 'characterCounter.v2'
const BASES: Basis[] = ['chars', 'charsNoSpace', 'bytesKr', 'x']
const SPELLER_URL = 'https://nara-speller.co.kr/speller/'
const newTabs = (): Tab[] => Array.from({ length: TAB_COUNT }, () => ({ title: '', text: '', target: 500, basis: 'chars' }))

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return }
  } catch { /* fallback below */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-999999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export default function CharacterCounter() {
  const t = useTranslations('characterCounter')
  const [tabs, setTabs] = useState<Tab[]>(newTabs)
  const [active, setActive] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [undo, setUndo] = useState<{ tab: number; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [marks, setMarks] = useState('')

  // 자동 저장: 마운트 후 복원(SSR 불일치 방지) → 이후 변경마다 저장
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (Array.isArray(saved?.tabs)) {
        setTabs(newTabs().map((d, i) => ({ ...d, ...saved.tabs[i], basis: BASES.includes(saved.tabs[i]?.basis) ? saved.tabs[i].basis : d.basis })))
        if (Number.isInteger(saved.active) && saved.active >= 0 && saved.active < TAB_COUNT) setActive(saved.active)
      }
    } catch { /* 저장소 차단·손상 → 빈 상태 */ }
    setLoaded(true)
  }, [])
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, active })) } catch { /* 용량 초과·차단 */ }
  }, [tabs, active, loaded])

  const tab = tabs[active]
  const stats = useMemo(() => analyze(tab.text), [tab.text])
  const tabStats = useMemo(() => tabs.map(tb => measure(analyze(tb.text), tb.basis)), [tabs])
  const words = useMemo(() => topWords(tab.text), [tab.text])
  const markList = useMemo(() => marks.split(',').map(s => s.trim()).filter(Boolean), [marks])
  const pieces = useMemo(() => splitHighlights(tab.text, markList), [tab.text, markList])

  const patch = useCallback((p: Partial<Tab>) => setTabs(ts => ts.map((x, i) => (i === active ? { ...x, ...p } : x))), [active])

  const transform = (fn: (s: string) => string) => {
    const next = fn(tab.text)
    if (next === tab.text) return
    setUndo({ tab: active, text: tab.text })
    patch({ text: next })
  }

  const handleCopy = async () => {
    if (!tab.text) return
    await copyText(tab.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClear = () => {
    if (tab.text && !window.confirm(t('save.confirmClear'))) return
    setUndo({ tab: active, text: tab.text })
    patch({ text: '' })
  }

  const handleClearAll = () => {
    if (!window.confirm(t('save.confirmClearAll'))) return
    setTabs(newTabs())
    setActive(0)
    setUndo(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  const openSpeller = async () => {
    if (tab.text) await copyText(tab.text)
    window.open(SPELLER_URL, '_blank', 'noopener,noreferrer')
  }

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

  const btnSoft = 'px-3 py-2 rounded-xl text-sm font-medium bg-soft hover:bg-subtle text-body disabled:opacity-45 disabled:pointer-events-none'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-left ${i === active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            <span className="block">{tb.title.trim() || t('tabs.label', { n: i + 1 })}</span>
            <span className={`block text-xs tabular-nums ${i === active ? 'text-white/70' : 'text-muted'}`}>
              {n(tabStats[i])}/{n(tb.target)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="lg:col-span-2 ui-card overflow-hidden">
          <input
            value={tab.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder={t('tabs.titlePlaceholder', { n: active + 1 })}
            aria-label={t('tabs.titleAria')}
            maxLength={40}
            className="w-full px-4 pt-4 pb-2 bg-transparent text-fg font-semibold focus:outline-none placeholder:text-faint"
          />
          <textarea
            value={tab.text}
            onChange={e => patch({ text: e.target.value })}
            placeholder={t('input.placeholder')}
            aria-label={t('input.aria')}
            className="w-full h-72 px-4 pb-4 text-fg bg-transparent resize-y focus:outline-none text-base leading-relaxed placeholder:text-faint"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-subtle border-t border-line">
            <span className="text-xs text-muted">{t('save.autosaved')}</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleCopy} disabled={!tab.text} className="ui-btn px-4 py-2 text-sm">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('actions.copied') : t('actions.copy')}
              </button>
              <button onClick={handleClear} disabled={!tab.text} className={`${btnSoft} inline-flex items-center gap-1.5`}>
                <Trash2 className="w-4 h-4" />{t('actions.clear')}
              </button>
            </div>
          </div>
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
                    onClick={() => patch({ basis: b })}
                    aria-pressed={tab.basis === b}
                    className={`px-3 py-2 rounded-xl text-sm font-medium ${tab.basis === b ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t(`target.basis.${b}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-body">{t('target.limit')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={tab.target || ''}
                onChange={e => patch({ target: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                className="ui-field px-4 py-2.5 mt-1.5 tabular-nums"
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
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 정리 도구 */}
        <div className="ui-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">{t('tools.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <button className={btnSoft} disabled={!tab.text} onClick={() => transform(tidy)}>{t('tools.tidy')}</button>
            <button className={btnSoft} disabled={!tab.text} onClick={() => transform(collapseSpaces)}>{t('tools.collapse')}</button>
            <button className={btnSoft} disabled={!tab.text} onClick={() => transform(joinLines)}>{t('tools.joinLines')}</button>
            <button className={btnSoft} disabled={!tab.text} onClick={() => transform(stripSpecial)}>{t('tools.stripSpecial')}</button>
            <button className={btnSoft} disabled={!tab.text} onClick={() => transform(s => s.toUpperCase())}>{t('tools.upper')}</button>
            <button className={btnSoft} disabled={!tab.text} onClick={() => transform(s => s.toLowerCase())}>{t('tools.lower')}</button>
            <button
              className={`${btnSoft} inline-flex items-center gap-1.5`}
              disabled={!undo || undo.tab !== active}
              onClick={() => { if (undo) { patch({ text: undo.text }); setUndo(null) } }}
            >
              <Undo2 className="w-4 h-4" />{t('tools.undo')}
            </button>
          </div>
          <div className="bg-subtle rounded-2xl p-4 space-y-2">
            <button onClick={openSpeller} className="ui-btn-soft px-4 py-2 text-sm">
              {t('tools.spell')}<ExternalLink className="w-4 h-4" />
            </button>
            <p className="text-xs text-sub">{t('tools.spellHint')}</p>
          </div>
          <button onClick={handleClearAll} className="text-xs text-muted underline hover:text-body">{t('save.clearAll')}</button>
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
                    className={`px-2.5 py-1.5 rounded-lg text-sm ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
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
              className="ui-field px-4 py-2.5 mt-1.5"
            />
          </label>
          {markList.length > 0 && tab.text && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-body">{t('words.preview', { n: pieces.filter(p => p.hit).length })}</span>
                <button onClick={() => setMarks('')} className="text-xs text-muted underline hover:text-body">{t('words.clearMarks')}</button>
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
