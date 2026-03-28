'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Play, Pause, SkipForward, RotateCcw, Copy, Check, ChevronDown, ChevronUp, Zap, BookOpen, Code } from 'lucide-react'

// ── Types ──

interface RegexToken {
  raw: string
  label: string
  type: 'anchor' | 'literal' | 'quantifier' | 'class' | 'group' | 'escape' | 'alternation' | 'special'
}

interface MatchAttempt {
  position: number
  success: boolean
  matchEnd: number
  matchText: string
  groups: string[]
}

interface MatchResult {
  text: string
  start: number
  end: number
  groups: string[]
}

// ── Token colors by type ──

const TOKEN_COLORS: Record<RegexToken['type'], { bg: string; border: string; text: string }> = {
  anchor:      { bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200' },
  literal:     { bg: 'bg-gray-100 dark:bg-gray-700', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-800 dark:text-gray-200' },
  quantifier:  { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-200' },
  class:       { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200' },
  group:       { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-300 dark:border-green-700', text: 'text-green-800 dark:text-green-200' },
  escape:      { bg: 'bg-teal-100 dark:bg-teal-900/40', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-800 dark:text-teal-200' },
  alternation: { bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-800 dark:text-rose-200' },
  special:     { bg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-800 dark:text-indigo-200' },
}

// ── Regex tokenizer ──

function tokenizeRegex(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = []
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    // Escape sequences
    if (ch === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1]
      const escapeMap: Record<string, string> = {
        d: '숫자 (0-9)', D: '숫자 아님', w: '영숫자/밑줄', W: '영숫자/밑줄 아님',
        s: '공백 문자', S: '공백 아님', b: '단어 경계', B: '단어 경계 아님',
        n: '줄바꿈', t: '탭', r: '캐리지 리턴',
      }
      if (escapeMap[next]) {
        tokens.push({ raw: `\\${next}`, label: escapeMap[next], type: 'escape' })
      } else {
        tokens.push({ raw: `\\${next}`, label: `"${next}" 리터럴`, type: 'escape' })
      }
      i += 2
      continue
    }

    // Character class [...]
    if (ch === '[') {
      let j = i + 1
      let negated = false
      if (j < pattern.length && pattern[j] === '^') { negated = true; j++ }
      // find closing ]
      while (j < pattern.length && pattern[j] !== ']') {
        if (pattern[j] === '\\' && j + 1 < pattern.length) j++
        j++
      }
      const raw = pattern.slice(i, j + 1)
      const inner = raw.slice(negated ? 2 : 1, -1)
      const label = negated ? `"${inner}" 제외 문자` : `"${inner}" 중 하나`
      tokens.push({ raw, label, type: 'class' })
      i = j + 1
      continue
    }

    // Groups (...)
    if (ch === '(') {
      let depth = 1
      let j = i + 1
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '\\') { j += 2; continue }
        if (pattern[j] === '(') depth++
        if (pattern[j] === ')') depth--
        j++
      }
      const raw = pattern.slice(i, j)
      let label = '캡처 그룹'
      const inner = raw.slice(1, -1)
      if (inner.startsWith('?:')) label = '비캡처 그룹'
      else if (inner.startsWith('?=')) label = '긍정 전방탐색'
      else if (inner.startsWith('?!')) label = '부정 전방탐색'
      else if (inner.startsWith('?<=')) label = '긍정 후방탐색'
      else if (inner.startsWith('?<!')) label = '부정 후방탐색'
      tokens.push({ raw, label, type: 'group' })
      i = j
      continue
    }

    // Quantifiers
    if (ch === '{') {
      let j = i + 1
      while (j < pattern.length && pattern[j] !== '}') j++
      const raw = pattern.slice(i, j + 1)
      const inner = raw.slice(1, -1)
      let label: string
      if (inner.includes(',')) {
        const [min, max] = inner.split(',')
        label = max?.trim() ? `${min}~${max.trim()}회` : `${min}회 이상`
      } else {
        label = `정확히 ${inner}회`
      }
      // check lazy ?
      if (j + 1 < pattern.length && pattern[j + 1] === '?') {
        label += ' (게으른)'
        tokens.push({ raw: raw + '?', label, type: 'quantifier' })
        i = j + 2
      } else {
        tokens.push({ raw, label, type: 'quantifier' })
        i = j + 1
      }
      continue
    }

    // Simple quantifiers
    if (ch === '*' || ch === '+' || ch === '?') {
      // Check if attached to previous token (quantifier modifier)
      const lazy = (i + 1 < pattern.length && pattern[i + 1] === '?')
      const qMap: Record<string, string> = { '*': '0회 이상', '+': '1회 이상', '?': '0 또는 1회' }
      let label = qMap[ch]
      let raw = ch
      if (lazy && ch !== '?') {
        label += ' (게으른)'
        raw += '?'
        i++
      } else if (lazy && ch === '?') {
        // ?? means lazy optional
        label += ' (게으른)'
        raw += '?'
        i++
      }
      tokens.push({ raw, label, type: 'quantifier' })
      i++
      continue
    }

    // Anchors
    if (ch === '^') {
      tokens.push({ raw: '^', label: '문자열/줄 시작', type: 'anchor' })
      i++
      continue
    }
    if (ch === '$') {
      tokens.push({ raw: '$', label: '문자열/줄 끝', type: 'anchor' })
      i++
      continue
    }

    // Alternation
    if (ch === '|') {
      tokens.push({ raw: '|', label: '또는 (OR)', type: 'alternation' })
      i++
      continue
    }

    // Dot
    if (ch === '.') {
      tokens.push({ raw: '.', label: '아무 문자 1개', type: 'special' })
      i++
      continue
    }

    // Literal character
    tokens.push({ raw: ch, label: `"${ch}" 문자`, type: 'literal' })
    i++
  }

  return tokens
}

// ── Perform matching with position tracking ──

function performMatching(pattern: string, flags: string, testStr: string): { attempts: MatchAttempt[]; results: MatchResult[] } {
  const attempts: MatchAttempt[] = []
  const results: MatchResult[] = []

  try {
    const re = new RegExp(pattern, flags)

    if (flags.includes('g')) {
      let match: RegExpExecArray | null
      const tried = new Set<number>()

      // Track every position the engine would try
      // We simulate by running exec() which gives us match positions
      while ((match = re.exec(testStr)) !== null) {
        const pos = match.index
        // Mark positions before this match as failed attempts
        for (let p = (tried.size === 0 ? 0 : Math.max(...tried) + 1); p < pos; p++) {
          if (!tried.has(p)) {
            attempts.push({ position: p, success: false, matchEnd: p, matchText: '', groups: [] })
            tried.add(p)
          }
        }
        const groups = match.slice(1).map(g => g ?? '')
        attempts.push({ position: pos, success: true, matchEnd: pos + match[0].length, matchText: match[0], groups })
        results.push({ text: match[0], start: pos, end: pos + match[0].length, groups })
        tried.add(pos)
        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) re.lastIndex++
      }
      // Remaining positions
      for (let p = (tried.size === 0 ? 0 : Math.max(...tried) + 1); p < testStr.length; p++) {
        if (!tried.has(p)) {
          attempts.push({ position: p, success: false, matchEnd: p, matchText: '', groups: [] })
        }
      }
    } else {
      const match = re.exec(testStr)
      if (match) {
        for (let p = 0; p < match.index; p++) {
          attempts.push({ position: p, success: false, matchEnd: p, matchText: '', groups: [] })
        }
        const groups = match.slice(1).map(g => g ?? '')
        attempts.push({ position: match.index, success: true, matchEnd: match.index + match[0].length, matchText: match[0], groups })
        results.push({ text: match[0], start: match.index, end: match.index + match[0].length, groups })
        for (let p = match.index + match[0].length; p < testStr.length; p++) {
          attempts.push({ position: p, success: false, matchEnd: p, matchText: '', groups: [] })
        }
      } else {
        for (let p = 0; p < testStr.length; p++) {
          attempts.push({ position: p, success: false, matchEnd: p, matchText: '', groups: [] })
        }
      }
    }
  } catch {
    // Invalid regex — no matches
  }

  return { attempts, results }
}

// ── Presets ──

interface Preset {
  name: string
  pattern: string
  testStr: string
  flags: string
}

const PRESETS: Preset[] = [
  { name: '이메일 검증', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', testStr: 'user@example.com', flags: 'g' },
  { name: '전화번호', pattern: '010-\\d{4}-\\d{4}', testStr: '연락처: 010-1234-5678 또는 010-9876-5432', flags: 'g' },
  { name: 'HTML 태그', pattern: '<(\\w+)[^>]*>.*?<\\/\\1>', testStr: '<div class="box">내용</div> <span>텍스트</span>', flags: 'g' },
  { name: 'IP 주소', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', testStr: '서버 192.168.1.1과 10.0.0.255에 접속', flags: 'g' },
  { name: '한글만', pattern: '[가-힣]+', testStr: 'Hello 안녕하세요 World 반갑습니다', flags: 'g' },
]

// ── Syntax reference ──

const SYNTAX_TABLE = [
  { syntax: '.', desc: '아무 문자 1개 (줄바꿈 제외)' },
  { syntax: '\\d', desc: '숫자 (0-9)' },
  { syntax: '\\w', desc: '영숫자, 밑줄 (a-z, A-Z, 0-9, _)' },
  { syntax: '\\s', desc: '공백 문자 (스페이스, 탭, 줄바꿈)' },
  { syntax: '[abc]', desc: 'a, b, c 중 하나' },
  { syntax: '[^abc]', desc: 'a, b, c 제외한 문자' },
  { syntax: '[a-z]', desc: 'a부터 z까지 범위' },
  { syntax: '^', desc: '문자열(줄) 시작' },
  { syntax: '$', desc: '문자열(줄) 끝' },
  { syntax: '*', desc: '0회 이상 반복 (탐욕적)' },
  { syntax: '+', desc: '1회 이상 반복 (탐욕적)' },
  { syntax: '?', desc: '0 또는 1회 (선택적)' },
  { syntax: '{n}', desc: '정확히 n회' },
  { syntax: '{n,m}', desc: 'n회 이상 m회 이하' },
  { syntax: '*?', desc: '0회 이상 (게으른)' },
  { syntax: '()', desc: '캡처 그룹' },
  { syntax: '|', desc: 'OR (택일)' },
  { syntax: '\\b', desc: '단어 경계' },
]

// ── Component ──

export default function RegexEngineVisualizer() {
  const [pattern, setPattern] = useState('010-\\d{4}-\\d{4}')
  const [testStr, setTestStr] = useState('연락처: 010-1234-5678 또는 010-9876-5432')
  const [flags, setFlags] = useState('g')
  const [isValid, setIsValid] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Stepping state
  const [currentStep, setCurrentStep] = useState(-1) // -1 = not started
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(500) // ms per step

  // Guide
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideTab, setGuideTab] = useState<'syntax' | 'greedy' | 'faq'>('syntax')

  // Copy
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Validate pattern ──
  useEffect(() => {
    try {
      new RegExp(pattern, flags)
      setIsValid(true)
      setErrorMsg('')
    } catch (e: unknown) {
      setIsValid(false)
      setErrorMsg(e instanceof Error ? e.message : '잘못된 정규표현식')
    }
  }, [pattern, flags])

  // ── Tokens ──
  const tokens = useMemo(() => {
    try { return tokenizeRegex(pattern) }
    catch { return [] }
  }, [pattern])

  // ── Matching ──
  const { attempts, results } = useMemo(() => {
    if (!isValid || !pattern) return { attempts: [], results: [] }
    return performMatching(pattern, flags, testStr)
  }, [pattern, flags, testStr, isValid])

  const totalSteps = attempts.length

  // ── Playback ──
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [isPlaying, speed, totalSteps])

  const handleStart = useCallback(() => {
    setCurrentStep(0)
    setIsPlaying(true)
  }, [])

  const handleNext = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(-1)
  }, [])

  const handleTogglePlay = useCallback(() => {
    if (currentStep === -1) {
      handleStart()
    } else if (currentStep >= totalSteps - 1) {
      setCurrentStep(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(prev => !prev)
    }
  }, [currentStep, totalSteps, handleStart])

  const loadPreset = useCallback((preset: Preset) => {
    setPattern(preset.pattern)
    setTestStr(preset.testStr)
    setFlags(preset.flags)
    setCurrentStep(-1)
    setIsPlaying(false)
  }, [])

  const toggleFlag = useCallback((flag: string) => {
    setFlags(prev => prev.includes(flag) ? prev.replace(flag, '') : prev + flag)
    setCurrentStep(-1)
    setIsPlaying(false)
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // ignore
    }
  }, [])

  // ── Build character-level highlight map for the string ──
  // After stepping through attempts up to currentStep
  const charStates = useMemo(() => {
    const states: ('idle' | 'matched' | 'failed' | 'current')[] = new Array(testStr.length).fill('idle')

    if (currentStep < 0) {
      // Show final results highlight when not stepping
      for (const r of results) {
        for (let i = r.start; i < r.end; i++) {
          states[i] = 'matched'
        }
      }
      return states
    }

    // Process attempts up to current step
    for (let s = 0; s <= currentStep && s < attempts.length; s++) {
      const a = attempts[s]
      if (s < currentStep) {
        if (a.success) {
          for (let i = a.position; i < a.matchEnd; i++) states[i] = 'matched'
        }
        // failed attempts: leave as idle (they were tried and failed)
      } else {
        // Current step
        if (a.success) {
          for (let i = a.position; i < a.matchEnd; i++) states[i] = 'current'
        } else {
          states[a.position] = 'failed'
        }
      }
    }
    return states
  }, [testStr, currentStep, attempts, results])

  const currentAttempt = currentStep >= 0 && currentStep < attempts.length ? attempts[currentStep] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          정규표현식 엔진 시각화
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          regex 패턴의 매칭 과정을 단계별로 시각화하고 토큰을 분석합니다
        </p>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => loadPreset(p)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        {/* Pattern input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            정규표현식 패턴
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-mono">/</span>
              <input
                type="text"
                value={pattern}
                onChange={(e) => { setPattern(e.target.value); setCurrentStep(-1); setIsPlaying(false) }}
                className={`w-full pl-6 pr-3 py-2.5 font-mono text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                  isValid ? 'border-gray-300 dark:border-gray-600' : 'border-red-500 dark:border-red-500'
                }`}
                placeholder="\\d+|[a-z]+"
                spellCheck={false}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-mono">/{flags}</span>
            </div>
            <button
              onClick={() => copyToClipboard(pattern, 'pattern')}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
              title="패턴 복사"
            >
              {copiedId === 'pattern' ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {!isValid && (
            <p className="mt-1 text-sm text-red-500">{errorMsg}</p>
          )}
        </div>

        {/* Flags */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">플래그:</span>
          {[
            { flag: 'g', label: 'global', desc: '전역 검색' },
            { flag: 'i', label: 'ignoreCase', desc: '대소문자 무시' },
            { flag: 'm', label: 'multiline', desc: '여러 줄 모드' },
            { flag: 's', label: 'dotAll', desc: '. = 줄바꿈 포함' },
          ].map(({ flag, label, desc }) => (
            <button
              key={flag}
              onClick={() => toggleFlag(flag)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
                flags.includes(flag)
                  ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
              title={`${label}: ${desc}`}
            >
              {flag}
            </button>
          ))}
        </div>

        {/* Test string */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            테스트 문자열
          </label>
          <textarea
            value={testStr}
            onChange={(e) => { setTestStr(e.target.value); setCurrentStep(-1); setIsPlaying(false) }}
            rows={3}
            className="w-full px-3 py-2.5 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none resize-y"
            placeholder="매칭할 텍스트를 입력하세요..."
            spellCheck={false}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleTogglePlay}
            disabled={!isValid || !pattern || !testStr}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {currentStep === -1 ? '매칭 시작' : isPlaying ? '일시정지' : '재생'}
          </button>
          <button
            onClick={handleNext}
            disabled={!isValid || !pattern || !testStr || currentStep >= totalSteps - 1}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward size={16} /> 다음 위치
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <RotateCcw size={16} /> 초기화
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400">속도:</span>
            <input
              type="range"
              min={100}
              max={1500}
              step={100}
              value={1600 - speed}
              onChange={(e) => setSpeed(1600 - Number(e.target.value))}
              className="w-24 accent-orange-500"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 w-14 text-right">{speed}ms</span>
          </div>
        </div>

        {/* Progress */}
        {totalSteps > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-200"
                style={{ width: `${currentStep < 0 ? 0 : ((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-16 text-right">
              {currentStep < 0 ? 0 : currentStep + 1} / {totalSteps}
            </span>
          </div>
        )}
      </div>

      {/* Main visualization grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Token breakdown + String visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pattern Token Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Code size={18} /> 패턴 토큰 분석
            </h2>
            {tokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tokens.map((tok, i) => {
                  const c = TOKEN_COLORS[tok.type]
                  return (
                    <div
                      key={i}
                      className={`inline-flex flex-col items-center px-3 py-2 rounded-lg border ${c.bg} ${c.border} transition-all`}
                    >
                      <span className={`font-mono text-sm font-bold ${c.text}`}>{tok.raw}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">{tok.label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">패턴을 입력하면 토큰이 표시됩니다</p>
            )}
            {/* Token type legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {([
                ['literal', '리터럴'],
                ['escape', '이스케이프'],
                ['class', '문자 클래스'],
                ['quantifier', '수량자'],
                ['anchor', '앵커'],
                ['group', '그룹'],
                ['alternation', '택일'],
                ['special', '특수'],
              ] as [RegexToken['type'], string][]).map(([type, label]) => {
                const c = TOKEN_COLORS[type]
                return (
                  <div key={type} className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-sm border ${c.bg} ${c.border}`} />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* String Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap size={18} /> 문자열 매칭 시각화
            </h2>
            {testStr ? (
              <div className="font-mono text-base leading-loose flex flex-wrap gap-0.5">
                {testStr.split('').map((ch, i) => {
                  const state = charStates[i]
                  let cls = 'px-0.5 py-0.5 rounded transition-all duration-200 '
                  if (state === 'matched') cls += 'bg-green-200 dark:bg-green-800/60 text-green-900 dark:text-green-100'
                  else if (state === 'current') cls += 'bg-blue-300 dark:bg-blue-700/70 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500 scale-110'
                  else if (state === 'failed') cls += 'bg-red-200 dark:bg-red-800/60 text-red-900 dark:text-red-100'
                  else cls += 'text-gray-700 dark:text-gray-300'

                  // Show spaces explicitly
                  const display = ch === ' ' ? '\u00B7' : ch === '\n' ? '\u21B5' : ch === '\t' ? '\u2192' : ch

                  return (
                    <span key={i} className={cls} title={`위치 ${i}: "${ch}"`}>
                      {display}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">테스트 문자열을 입력하세요</p>
            )}

            {/* Current step info */}
            {currentAttempt && (
              <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                currentAttempt.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                <span className="font-medium">위치 {currentAttempt.position}:</span>{' '}
                {currentAttempt.success
                  ? <>매칭 성공 &mdash; &quot;{currentAttempt.matchText}&quot; (위치 {currentAttempt.position}~{currentAttempt.matchEnd - 1})</>
                  : <>매칭 실패 &mdash; 이 위치에서 패턴이 일치하지 않음</>
                }
              </div>
            )}

            {/* Color legend */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-800/60" /> 매칭됨</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 dark:bg-blue-700/70 ring-1 ring-blue-500" /> 현재 위치</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800/60" /> 실패</span>
            </div>
          </div>
        </div>

        {/* Right: Match Results */}
        <div className="space-y-6">
          {/* Match results */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              매칭 결과
            </h2>
            {!isValid ? (
              <p className="text-sm text-red-500">패턴 오류</p>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  총 <span className="font-bold text-orange-600 dark:text-orange-400">{results.length}</span>개 매칭
                </p>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {results.map((r, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">매칭 #{i + 1}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">위치 {r.start}~{r.end - 1}</span>
                      </div>
                      <p className="font-mono text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded break-all">
                        &quot;{r.text}&quot;
                      </p>
                      {r.groups.length > 0 && r.groups.some(g => g !== '') && (
                        <div className="mt-2 space-y-1">
                          {r.groups.map((g, gi) => g !== '' && (
                            <div key={gi} className="flex items-center gap-2 text-xs">
                              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-mono">
                                ${gi + 1}
                              </span>
                              <span className="font-mono text-gray-700 dark:text-gray-300">&quot;{g}&quot;</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : pattern && testStr ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">매칭 결과 없음</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">패턴과 문자열을 입력하세요</p>
            )}
          </div>

          {/* Quick regex snippet */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">JavaScript 코드</h2>
            <div className="relative">
              <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`const regex = /${pattern}/${flags};
const str = ${JSON.stringify(testStr)};
const matches = str.match${flags.includes('g') ? '' : ''}All(regex);
// => ${JSON.stringify(results.map(r => r.text))}`}
              </pre>
              <button
                onClick={() => copyToClipboard(`const regex = /${pattern}/${flags};\nconst str = ${JSON.stringify(testStr)};\nconst matches = str.matchAll(regex);`, 'code')}
                className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                title="코드 복사"
              >
                {copiedId === 'code' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BookOpen size={18} /> 정규표현식 가이드
          </span>
          {guideOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {guideOpen && (
          <div className="px-6 pb-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
              {([
                { key: 'syntax', label: '기본 문법' },
                { key: 'greedy', label: '탐욕적 vs 게으른' },
                { key: 'faq', label: 'FAQ' },
              ] as { key: typeof guideTab; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGuideTab(key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    guideTab === key
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Syntax table */}
            {guideTab === 'syntax' && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  정규표현식(Regular Expression)은 문자열에서 특정 패턴을 찾기 위한 형식 언어입니다. 아래는 자주 사용하는 문법입니다.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300 w-28">문법</th>
                        <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SYNTAX_TABLE.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 pr-4 font-mono text-orange-600 dark:text-orange-400 font-bold">{row.syntax}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Greedy vs Lazy */}
            {guideTab === 'greedy' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  수량자(<code className="font-mono text-orange-600 dark:text-orange-400">*</code>, <code className="font-mono text-orange-600 dark:text-orange-400">+</code>, <code className="font-mono text-orange-600 dark:text-orange-400">?</code>)는 기본적으로 <strong>탐욕적(greedy)</strong>으로 동작합니다. 가능한 한 많은 문자를 매칭합니다.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">탐욕적 (Greedy)</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      패턴: <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">&quot;.*&quot;</code>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      입력: <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">&quot;a&quot; and &quot;b&quot;</code>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      결과: <span className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded text-green-800 dark:text-green-200">&quot;a&quot; and &quot;b&quot;</span> (전체 매칭)
                    </p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
                    <h4 className="font-semibold text-teal-800 dark:text-teal-200 mb-2">게으른 (Lazy)</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      패턴: <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">&quot;.*?&quot;</code>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      입력: <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">&quot;a&quot; and &quot;b&quot;</code>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      결과: <span className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded text-green-800 dark:text-green-200">&quot;a&quot;</span>, <span className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded text-green-800 dark:text-green-200">&quot;b&quot;</span> (최소 매칭)
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  수량자 뒤에 <code className="font-mono text-orange-600 dark:text-orange-400">?</code>를 붙이면 게으른 모드가 됩니다:
                  <code className="font-mono ml-1">*?</code>, <code className="font-mono ml-1">+?</code>, <code className="font-mono ml-1">??</code>, <code className="font-mono ml-1">{'{n,m}'}?</code>
                </p>
              </div>
            )}

            {/* FAQ */}
            {guideTab === 'faq' && (
              <div className="space-y-4">
                {[
                  { q: '정규표현식은 어디에 사용하나요?', a: '프로그래밍에서 문자열 검색/치환, 입력 유효성 검증(이메일, 전화번호 등), 로그 파일 분석, 텍스트 편집기의 찾기/바꾸기, 웹 스크래핑 등에 널리 사용됩니다. JavaScript, Python, Java, Go 등 거의 모든 프로그래밍 언어에서 지원합니다.' },
                  { q: '캡처 그룹이란 무엇인가요?', a: '소괄호 ()로 감싼 부분을 캡처 그룹이라 합니다. 매칭된 텍스트의 특정 부분을 추출하거나, 역참조(\\1, \\2)로 앞서 매칭된 텍스트를 재사용할 때 사용합니다. 예: (\\d{3})-(\\d{4})로 전화번호에서 앞 3자리와 뒤 4자리를 각각 추출할 수 있습니다.' },
                  { q: '정규표현식 성능이 느릴 때는?', a: '재앙적 역추적(catastrophic backtracking)이 원인일 수 있습니다. 중첩된 수량자(예: (a+)+)를 피하고, 구체적인 문자 클래스를 사용하세요. 가능하면 .*보다 [^\\n]*처럼 범위를 제한하는 것이 좋습니다.' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Q. {item.q}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
