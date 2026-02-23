'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check } from 'lucide-react'

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

// Map of regex tokens to Korean explanations
const TOKEN_MAP: [RegExp, string][] = [
  [/\\d/g, '숫자(0-9)'],
  [/\\D/g, '숫자가 아닌 문자'],
  [/\\w/g, '단어 문자(영숫자+_)'],
  [/\\W/g, '단어 문자가 아닌 문자'],
  [/\\s/g, '공백 문자'],
  [/\\S/g, '공백이 아닌 문자'],
  [/\\b/g, '단어 경계'],
  [/\\\./g, '마침표(.)'],
  [/\\\+/g, '플러스(+)'],
  [/\\\*/g, '별표(*)'],
  [/\\\?/g, '물음표(?)'],
  [/\[a-z\]/g, '소문자 알파벳'],
  [/\[A-Z\]/g, '대문자 알파벳'],
  [/\[0-9\]/g, '숫자 0~9'],
  [/\[가-힣\]/g, '한글 음절'],
  [/\^/g, '문자열/줄 시작'],
  [/\$/g, '문자열/줄 끝'],
  [/\{(\d+),(\d+)\}/g, '최소$1~최대$2회 반복'],
  [/\{(\d+)\}/g, '$1회 반복'],
  [/\+/g, '1회 이상 반복'],
  [/\*/g, '0회 이상 반복'],
  [/\?/g, '0 또는 1회'],
  [/\./g, '임의의 한 문자'],
  [/\|/g, '또는(OR)'],
  [/\(/g, '그룹 시작'],
  [/\)/g, '그룹 끝'],
]

function buildExplanation(pattern: string): string {
  if (!pattern) return ''
  const parts: string[] = []
  const tokenPatterns: [RegExp, string][] = [
    [/\\d/g, '숫자'],
    [/\\D/g, '비숫자'],
    [/\\w/g, '단어문자'],
    [/\\W/g, '비단어문자'],
    [/\\s/g, '공백'],
    [/\\S/g, '비공백'],
    [/\\b/g, '단어경계'],
    [/\\\./g, '마침표'],
    [/\[가-힣\]\+/g, '한글 1회 이상'],
    [/\[가-힣\]\*/g, '한글 0회 이상'],
    [/\[가-힣\]/g, '한글 한 글자'],
    [/\[a-zA-Z0-9\]/g, '영숫자 한 자'],
    [/\[a-z\]\+/g, '소문자 1회 이상'],
    [/\[a-z\]/g, '소문자 한 자'],
    [/\[A-Z\]\+/g, '대문자 1회 이상'],
    [/\[A-Z\]/g, '대문자 한 자'],
    [/\[0-9\]\+/g, '숫자 1회 이상'],
    [/\[0-9\]/g, '숫자 한 자'],
    [/\{(\d+),(\d+)\}/g, '최소$1~최대$2회'],
    [/\{(\d+)\}/g, '$1회 반복'],
    [/\+/g, '1회 이상'],
    [/\*/g, '0회 이상'],
    [/\?/g, '선택적(0~1)'],
    [/\^/g, '시작'],
    [/\$/g, '끝'],
    [/\|/g, '또는'],
  ]

  // Describe character classes with quantifiers
  const descMap: [string, string][] = []
  let work = pattern
  // extract tokens linearly
  let i = 0
  while (i < work.length) {
    if (work[i] === '\\' && i + 1 < work.length) {
      const ch = work[i + 1]
      const labels: Record<string, string> = { d: '숫자', D: '비숫자', w: '단어문자', W: '비단어문자', s: '공백', S: '비공백', b: '단어경계', n: '줄바꿈', t: '탭', '.': '마침표', '+': '+', '*': '*', '?': '?', '[': '[', ']': ']', '(': '(', ')': ')' }
      parts.push(labels[ch] ?? `\\${ch}`)
      i += 2
    } else if (work[i] === '[') {
      const end = work.indexOf(']', i)
      if (end === -1) { parts.push('문자 클래스'); i++; continue }
      const inner = work.slice(i, end + 1)
      let label = `문자 클래스 ${inner}`
      if (inner === '[가-힣]') label = '한글'
      else if (inner === '[a-z]') label = '소문자'
      else if (inner === '[A-Z]') label = '대문자'
      else if (inner === '[0-9]') label = '숫자'
      else if (inner === '[a-zA-Z0-9]') label = '영숫자'
      else if (inner === '[^>]') label = "> 제외 문자"
      // check quantifier
      const next = work[end + 1]
      if (next === '+') { parts.push(`${label} 1회 이상`); i = end + 2 }
      else if (next === '*') { parts.push(`${label} 0회 이상`); i = end + 2 }
      else if (next === '?') { parts.push(`${label} 0~1회`); i = end + 2 }
      else { parts.push(label); i = end + 1 }
    } else if (work[i] === '(') {
      parts.push('그룹 시작')
      i++
    } else if (work[i] === ')') {
      let q = ''
      if (work[i + 1] === '+') { q = '1회 이상'; i++ }
      else if (work[i + 1] === '*') { q = '0회 이상'; i++ }
      else if (work[i + 1] === '?') { q = '0~1회'; i++ }
      parts.push(q ? `그룹 끝(${q})` : '그룹 끝')
      i++
    } else if (work[i] === '{') {
      const end = work.indexOf('}', i)
      if (end === -1) { parts.push('{'); i++; continue }
      const inner = work.slice(i + 1, end)
      if (inner.includes(',')) {
        const [min, max] = inner.split(',')
        parts.push(`최소${min}~최대${max}회`)
      } else {
        parts.push(`${inner}회 반복`)
      }
      i = end + 1
    } else if (work[i] === '+') { parts.push('1회 이상'); i++ }
    else if (work[i] === '*') { parts.push('0회 이상'); i++ }
    else if (work[i] === '?') { parts.push('0~1회'); i++ }
    else if (work[i] === '.') { parts.push('임의의 한 문자'); i++ }
    else if (work[i] === '^') { parts.push('시작'); i++ }
    else if (work[i] === '$') { parts.push('끝'); i++ }
    else if (work[i] === '|') { parts.push('또는'); i++ }
    else { i++ }
  }

  void TOKEN_MAP; void tokenPatterns; void descMap
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
    { flag: 'g', label: 'g', title: '전체 매칭 (global)' },
    { flag: 'i', label: 'i', title: '대소문자 무시 (case-insensitive)' },
    { flag: 'm', label: 'm', title: '여러 줄 (multiline)' },
    { flag: 's', label: 's', title: '점이 줄바꿈 포함 (dotAll)' },
    { flag: 'u', label: 'u', title: '유니코드 (unicode)' },
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

  const explanation = useMemo(() => buildExplanation(pattern), [pattern])

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

  const inputBase = 'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('match')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'match' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          {t('matchMode')}
        </button>
        <button
          onClick={() => setMode('replace')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'replace' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          {t('replaceMode')}
        </button>
      </div>

      {/* Pattern input + flags */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pattern')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-base select-none">/</span>
              <input
                type="text"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder="\\d{3}-\\d{4}-\\d{4}"
                className={`${inputBase} pl-7 pr-7 ${regexError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600'}`}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('flags')}</label>
            <div className="flex gap-1">
              {flagList.map(({ flag, label, title }) => (
                <button
                  key={flag}
                  title={title}
                  onClick={() => toggleFlag(flag)}
                  className={`w-8 h-9 rounded text-sm font-mono font-bold transition-colors ${flags.has(flag) ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Copy regex */}
        {pattern && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-200">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('testText')}</h2>
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            rows={6}
            placeholder="테스트할 텍스트를 입력하세요..."
            className={`${inputBase} border-gray-300 dark:border-gray-600 resize-none`}
          />
          {/* Highlighted output */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('matches')} ({matches.length > 0 ? `${matches.length}${t('matchCount')}` : t('noMatch')})</div>
            {testText && (
              <div
                className="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-all p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[48px]"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            )}
          </div>

          {/* Replace mode */}
          {mode === 'replace' && (
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('replaceWith')}</label>
              <input
                type="text"
                value={replaceWith}
                onChange={e => setReplaceWith(e.target.value)}
                placeholder="$1, $2 로 그룹 참조 가능"
                className={`${inputBase} border-gray-300 dark:border-gray-600`}
              />
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('result')}</div>
              <div className="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-all p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 min-h-[48px]">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('matches')}</h2>
          {matches.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">{t('noMatch')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3">{t('index')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3">{t('value')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2">{t('groups')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {matches.map((m, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400 font-mono">{m.index}</td>
                      <td className="py-1.5 pr-3 font-mono text-gray-900 dark:text-white max-w-[140px] truncate">
                        <span className="bg-yellow-100 dark:bg-yellow-900 rounded px-1">{m.value}</span>
                      </td>
                      <td className="py-1.5 font-mono text-gray-600 dark:text-gray-300 text-xs">
                        {m.groups.length > 0 ? m.groups.map((g, gi) => (
                          <span key={gi} className="mr-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded px-1">{g || '(없음)'}</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('commonPatterns')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMON_PATTERNS.map(({ labelKey, pattern: p }) => (
            <button
              key={labelKey}
              onClick={() => loadPattern(p)}
              className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                {t(labelKey as Parameters<typeof t>[0])}
              </div>
              <div className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1 truncate">{p}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
