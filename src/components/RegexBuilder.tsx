'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/regexBuilder'
import { Copy, Check } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type Flag = 'g' | 'i' | 'm' | 's' | 'u'

interface MatchResult {
  index: number
  value: string
  groups: string[]
}

interface CommonPattern {
  labelKey: string
  pattern: string
}

const COMMON_PATTERNS: CommonPattern[] = [
  { labelKey: 'patternEmail', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { labelKey: 'patternPhone', pattern: '01[016789]-?\\d{3,4}-?\\d{4}' },
  { labelKey: 'patternUrl', pattern: 'https?://[\\w.-]+(?:/[\\w./?%&=-]*)?' },
  { labelKey: 'patternIp', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' },
  { labelKey: 'patternKorean', pattern: '[가-힣]+' },
  { labelKey: 'patternHtml', pattern: '<[^>]+>' },
  { labelKey: 'patternDate', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  { labelKey: 'patternRrn', pattern: '\\d{6}-[1-4]\\d{6}' },
]

type Translate = (key: string, vars?: Record<string, unknown>) => string

function buildExplanation(pattern: string, t: Translate): string {
  if (!pattern) return ''
  const x = (key: string, vars?: Record<string, unknown>) => t(`explain.${key}`, vars)
  const parts: string[] = []
  const work = pattern
  // extract tokens linearly
  let i = 0
  while (i < work.length) {
    if (work[i] === '\\' && i + 1 < work.length) {
      const ch = work[i + 1]
      const labels: Record<string, string> = { d: x('digit'), D: x('nonDigit'), w: x('word'), W: x('nonWord'), s: x('space'), S: x('nonSpace'), b: x('wordBoundary'), n: x('newline'), t: x('tab'), '.': x('period'), '+': '+', '*': '*', '?': '?', '[': '[', ']': ']', '(': '(', ')': ')' }
      parts.push(labels[ch] ?? `\\${ch}`)
      i += 2
    } else if (work[i] === '[') {
      const end = work.indexOf(']', i)
      if (end === -1) { parts.push(x('charClass')); i++; continue }
      const inner = work.slice(i, end + 1)
      let label = x('charClassOf', { inner })
      if (inner === '[가-힣]') label = x('hangul')
      else if (inner === '[a-z]') label = x('lower')
      else if (inner === '[A-Z]') label = x('upper')
      else if (inner === '[0-9]') label = x('digit')
      else if (inner === '[a-zA-Z0-9]') label = x('alnum')
      else if (inner === '[^>]') label = x('notGt')
      // check quantifier
      const next = work[end + 1]
      if (next === '+') { parts.push(x('quantified', { label, q: x('oneOrMore') })); i = end + 2 }
      else if (next === '*') { parts.push(x('quantified', { label, q: x('zeroOrMore') })); i = end + 2 }
      else if (next === '?') { parts.push(x('quantified', { label, q: x('optional') })); i = end + 2 }
      else { parts.push(label); i = end + 1 }
    } else if (work[i] === '(') {
      parts.push(x('groupStart'))
      i++
    } else if (work[i] === ')') {
      let q = ''
      if (work[i + 1] === '+') { q = x('oneOrMore'); i++ }
      else if (work[i + 1] === '*') { q = x('zeroOrMore'); i++ }
      else if (work[i + 1] === '?') { q = x('optional'); i++ }
      parts.push(q ? x('groupEndQuantified', { q }) : x('groupEnd'))
      i++
    } else if (work[i] === '{') {
      const end = work.indexOf('}', i)
      if (end === -1) { parts.push('{'); i++; continue }
      const inner = work.slice(i + 1, end)
      if (inner.includes(',')) {
        const [min, max] = inner.split(',')
        parts.push(x('range', { min, max }))
      } else {
        parts.push(x('repeat', { n: inner }))
      }
      i = end + 1
    } else if (work[i] === '+') { parts.push(x('oneOrMore')); i++ }
    else if (work[i] === '*') { parts.push(x('zeroOrMore')); i++ }
    else if (work[i] === '?') { parts.push(x('optional')); i++ }
    else if (work[i] === '.') { parts.push(x('anyChar')); i++ }
    else if (work[i] === '^') { parts.push(x('start')); i++ }
    else if (work[i] === '$') { parts.push(x('end')); i++ }
    else if (work[i] === '|') { parts.push(x('or')); i++ }
    else { i++ }
  }

  return parts.slice(0, 12).join(' · ')
}

function buildHighlightedHtml(text: string, pattern: string, flags: string): string {
  if (!pattern || !text) return escapeHtml(text)
  try {
    const effectiveFlags = flags.includes('g') ? flags : flags + 'g'
    const re = new RegExp(pattern, effectiveFlags)
    let result = ''
    let lastIndex = 0
    let m: RegExpExecArray | null
    re.lastIndex = 0
    while ((m = re.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, m.index))
      result += `<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">${escapeHtml(m[0])}</mark>`
      lastIndex = m.index + m[0].length
      if (m[0].length === 0) { re.lastIndex++; if (re.lastIndex > text.length) break }
    }
    result += escapeHtml(text.slice(lastIndex))
    return result
  } catch {
    return escapeHtml(text)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function RegexBuilder() {
  const t = useTranslations('regexBuilder')
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<Set<Flag>>(new Set(['g']))
  const [testText, setTestText] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [mode, setMode] = useState<'match' | 'replace'>('match')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const flagList: { flag: Flag; label: string; title: string }[] = [
    { flag: 'g', label: 'g', title: t('flagTitles.g') },
    { flag: 'i', label: 'i', title: t('flagTitles.i') },
    { flag: 'm', label: 'm', title: t('flagTitles.m') },
    { flag: 's', label: 's', title: t('flagTitles.s') },
    { flag: 'u', label: 'u', title: t('flagTitles.u') },
  ]

  const flagString = useMemo(() => Array.from(flags).join(''), [flags])

  const toggleFlag = useCallback((flag: Flag) => {
    setFlags(prev => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }, [])

  const regexError = useMemo(() => {
    if (!pattern) return null
    try { new RegExp(pattern, flagString); return null }
    catch (e) { return e instanceof Error ? e.message : 'Invalid regex' }
  }, [pattern, flagString])

  const matches = useMemo((): MatchResult[] => {
    if (!pattern || !testText || regexError) return []
    try {
      const effectiveFlags = flags.has('g') ? flagString : flagString + 'g'
      const re = new RegExp(pattern, effectiveFlags)
      const results: MatchResult[] = []
      let m: RegExpExecArray | null
      re.lastIndex = 0
      while ((m = re.exec(testText)) !== null) {
        results.push({
          index: m.index,
          value: m[0],
          groups: m.slice(1).map(g => g ?? ''),
        })
        if (m[0].length === 0) { re.lastIndex++; if (re.lastIndex > testText.length) break }
        if (results.length >= 200) break
      }
      return results
    } catch { return [] }
  }, [pattern, testText, flagString, flags, regexError])

  const highlightedHtml = useMemo(
    () => buildHighlightedHtml(testText, pattern, flagString),
    [testText, pattern, flagString]
  )

  const replaceResult = useMemo(() => {
    if (!pattern || !testText || regexError) return testText
    try {
      const effectiveFlags = flags.has('g') ? flagString : flagString + 'g'
      const re = new RegExp(pattern, effectiveFlags)
      return testText.replace(re, replaceWith)
    } catch { return testText }
  }, [pattern, testText, replaceWith, flagString, flags, regexError])

  const explanation = useMemo(() => buildExplanation(pattern, t), [pattern, t])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.left = '-999999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
    } catch { /* ignore */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const loadPattern = useCallback((p: string) => {
    setPattern(p)
    if (!flags.has('g')) setFlags(prev => new Set([...prev, 'g']))
  }, [flags])

  const inputBase = 'w-full px-3 py-2 border rounded-lg bg-field text-fg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('match')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'match' ? 'bg-blue-600 text-white' : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          {t('matchMode')}
        </button>
        <button
          onClick={() => setMode('replace')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'replace' ? 'bg-blue-600 text-white' : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          {t('replaceMode')}
        </button>
      </div>

      {/* Pattern input + flags */}
      <div className={`${glassCard} ${glassInset} p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-body mb-1">{t('pattern')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-base select-none">/</span>
              <input
                type="text"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder="\\d{3}-\\d{4}-\\d{4}"
                className={`${inputBase} pl-7 pr-7 ${regexError ? 'border-red-400 focus:ring-red-400' : 'border-line-strong'}`}
                spellCheck={false}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-base select-none">/</span>
            </div>
            {regexError && <p className="text-xs text-red-500 mt-1 truncate">{regexError}</p>}
            {explanation && !regexError && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">{t('explanation')}: {explanation}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-body mb-1">{t('flags')}</label>
            <div className="flex gap-1">
              {flagList.map(({ flag, label, title }) => (
                <button
                  key={flag}
                  title={title}
                  onClick={() => toggleFlag(flag)}
                  className={`w-8 h-9 rounded text-sm font-mono font-bold transition-colors ${flags.has(flag) ? 'bg-blue-600 text-white' : 'bg-soft text-sub hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Copy regex */}
        {pattern && (
          <div className="flex items-center gap-2 p-3 bg-subtle rounded-lg font-mono text-sm text-body">
            <span className="flex-1 break-all">/{pattern}/{flagString}</span>
            <button
              onClick={() => copyToClipboard(`/${pattern}/${flagString}`, 'regex')}
              className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={t('copy')}
            >
              {copiedId === 'regex' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500" />}
            </button>
          </div>
        )}
      </div>

      {/* Test area + results */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${glassCard} ${glassInset} p-6 space-y-4`}>
          <h2 className="font-semibold text-fg">{t('testText')}</h2>
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            rows={6}
            placeholder={t('testPlaceholder')}
            className={`${inputBase} border-line-strong resize-none`}
          />
          {/* Highlighted output */}
          <div>
            <div className="text-xs font-medium text-muted mb-1">{t('matches')} ({matches.length > 0 ? `${matches.length}${t('matchCount')}` : t('noMatch')})</div>
            {testText && (
              <div
                className="text-sm text-body font-mono whitespace-pre-wrap break-all p-3 bg-subtle rounded-lg border border-line min-h-[48px]"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            )}
          </div>

          {/* Replace mode */}
          {mode === 'replace' && (
            <div className="space-y-2 pt-2 border-t border-line">
              <label className="block text-sm font-medium text-body">{t('replaceWith')}</label>
              <input
                type="text"
                value={replaceWith}
                onChange={e => setReplaceWith(e.target.value)}
                placeholder={t('replacePlaceholder')}
                className={`${inputBase} border-line-strong`}
              />
              <div className="text-xs font-medium text-muted mb-1">{t('result')}</div>
              <div className="text-sm text-body font-mono whitespace-pre-wrap break-all p-3 bg-subtle rounded-lg border border-line min-h-[48px]">
                {replaceResult}
              </div>
              <button
                onClick={() => copyToClipboard(replaceResult, 'replace')}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedId === 'replace' ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === 'replace' ? t('copied') : t('copy')}
              </button>
            </div>
          )}
        </div>

        {/* Match results table */}
        <div className={`${glassCard} ${glassInset} p-6`}>
          <h2 className="font-semibold text-fg mb-4">{t('matches')}</h2>
          {matches.length === 0 ? (
            <div className="text-sm text-faint text-center py-12">{t('noMatch')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-xs font-medium text-muted pb-2 pr-3">{t('index')}</th>
                    <th className="text-left text-xs font-medium text-muted pb-2 pr-3">{t('value')}</th>
                    <th className="text-left text-xs font-medium text-muted pb-2">{t('groups')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {matches.map((m, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 text-muted font-mono">{m.index}</td>
                      <td className="py-1.5 pr-3 font-mono text-fg max-w-[140px] truncate">
                        <span className="bg-yellow-100 dark:bg-yellow-900 rounded px-1">{m.value}</span>
                      </td>
                      <td className="py-1.5 font-mono text-sub text-xs">
                        {m.groups.length > 0 ? m.groups.map((g, gi) => (
                          <span key={gi} className="mr-1 bg-subtle text-sub rounded px-1">{g || t('emptyGroup')}</span>
                        )) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Common patterns */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="font-semibold text-fg mb-4">{t('commonPatterns')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMON_PATTERNS.map(({ labelKey, pattern: p }) => (
            <button
              key={labelKey}
              onClick={() => loadPattern(p)}
              className="text-left p-3 rounded-lg border border-line hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
            >
              <div className="text-sm font-medium text-fg group-hover:text-blue-700 dark:group-hover:text-blue-300">
                {t(labelKey as Parameters<typeof t>[0])}
              </div>
              <div className="text-xs font-mono text-faint mt-1 truncate">{p}</div>
            </button>
          ))}
        </div>
      </div>

      <GuideSection namespace="regexBuilder" />
    </div>
  )
}
