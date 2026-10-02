'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, RefreshCw, Eye, EyeOff, X, ExternalLink } from 'lucide-react'
import { WORD_LIST } from '@/utils/wordlist'
import {
  DEFAULT_SYMBOLS, cleanSymbols, validate, generatePassword, passwordEntropy, generatePassphrase,
  passphraseEntropy, gradeOf, crackTime, analyzePassword, GRADE_ORDER, type PwOptions, type Grade,
} from '@/utils/password'

// ── 설정 (URL에는 설정값만, 생성 결과·검사 입력은 절대 넣지 않음) ──
type Tab = 'random' | 'passphrase' | 'pin' | 'check'
const TABS: Tab[] = ['random', 'passphrase', 'pin', 'check']
type Sep = 'hyphen' | 'space' | 'period' | 'underscore'
const SEPS: Record<Sep, string> = { hyphen: '-', space: ' ', period: '.', underscore: '_' }
const COUNTS = [1, 5, 10, 20]

interface Settings {
  length: number; upper: boolean; lower: boolean; digits: boolean; symbols: boolean; symbolSet: string
  excludeAmbiguous: boolean; noRepeat: boolean; count: number
  words: number; sep: Sep; cap: boolean; addNum: boolean; pinLength: number
}
const DEFAULTS: Settings = {
  length: 16, upper: true, lower: true, digits: true, symbols: true, symbolSet: DEFAULT_SYMBOLS,
  excludeAmbiguous: false, noRepeat: false, count: 5, words: 6, sep: 'hyphen', cap: true, addNum: true, pinLength: 6,
}
const LEN = { min: 4, max: 128 }, WORDS = { min: 3, max: 10 }, PIN = { min: 4, max: 12 }

// 한국 사이트에서 흔한 규칙 (특정 사이트를 지칭하지 않음)
const PRESETS: Record<'koStandard' | 'koLimited' | 'koNoSymbol' | 'max', Partial<Settings>> = {
  koStandard: { length: 16, upper: true, lower: true, digits: true, symbols: true, symbolSet: '!@#$%^&*' },
  koLimited: { length: 16, upper: true, lower: true, digits: true, symbols: true, symbolSet: '!@#$' },
  koNoSymbol: { length: 16, upper: true, lower: true, digits: true, symbols: false },
  max: { length: 32, upper: true, lower: true, digits: true, symbols: true, symbolSet: DEFAULT_SYMBOLS },
}

// URL 키 ↔ 설정
const BOOL_KEYS = { u: 'upper', l: 'lower', d: 'digits', s: 'symbols', amb: 'excludeAmbiguous', nr: 'noRepeat', cap: 'cap', num: 'addNum' } as const
const NUM_KEYS = { len: ['length', LEN], w: ['words', WORDS], pin: ['pinLength', PIN] } as const
const clamp = (n: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, n))

function fromParams(p: URLSearchParams): { tab: Tab; s: Settings } {
  const s = { ...DEFAULTS }
  for (const [k, f] of Object.entries(BOOL_KEYS)) if (p.has(k)) s[f] = p.get(k) === '1'
  for (const [k, [f, r]] of Object.entries(NUM_KEYS)) { const n = parseInt(p.get(k) ?? ''); if (n) s[f] = clamp(n, r) }
  const n = parseInt(p.get('n') ?? ''); if (COUNTS.includes(n)) s.count = n
  const sym = p.get('sym'); if (sym != null && cleanSymbols(sym)) s.symbolSet = cleanSymbols(sym)
  const sep = p.get('sep') as Sep; if (sep in SEPS) s.sep = sep
  const tab = p.get('mode') as Tab
  return { tab: TABS.includes(tab) ? tab : 'random', s }
}
function toSearch(tab: Tab, s: Settings): string {
  const p = new URLSearchParams()
  if (tab !== 'random') p.set('mode', tab)
  if (tab === 'check') return p.toString()
  for (const [k, f] of Object.entries(BOOL_KEYS)) if (s[f] !== DEFAULTS[f]) p.set(k, s[f] ? '1' : '0')
  for (const [k, [f]] of Object.entries(NUM_KEYS)) if (s[f] !== DEFAULTS[f]) p.set(k, String(s[f]))
  if (s.count !== DEFAULTS.count) p.set('n', String(s.count))
  if (s.symbolSet !== DEFAULTS.symbolSet) p.set('sym', s.symbolSet)
  if (s.sep !== DEFAULTS.sep) p.set('sep', s.sep)
  return p.toString()
}

const GRADE_TEXT: Record<Grade, string> = { veryWeak: 'text-red-600', weak: 'text-red-600', medium: 'text-amber-600', strong: 'text-primary', veryStrong: 'text-primary' }
const GRADE_BAR: Record<Grade, string> = { veryWeak: 'bg-red-600', weak: 'bg-red-600', medium: 'bg-amber-500', strong: 'bg-primary', veryStrong: 'bg-primary' }

/** 문자 종류 구분 표시: 숫자 = 파랑+굵게, 특수문자 = 밑줄 (색 외 단서 병행) */
function Colored({ value }: { value: string }) {
  return (
    <>
      {[...value].map((c, i) =>
        /\d/.test(c) ? <span key={i} className="text-primary font-bold">{c}</span>
          : /[A-Za-z]/.test(c) ? <span key={i}>{c}</span>
            : <span key={i} className="underline decoration-2 underline-offset-4">{c}</span>,
      )}
    </>
  )
}

export default function PasswordGenerator() {
  const t = useTranslations('passwordGenerator')
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('random')
  const [s, setS] = useState<Settings>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [copied, setCopied] = useState<number | 'all' | null>(null)
  const [announce, setAnnounce] = useState('')
  const [lenText, setLenText] = useState<string | null>(null)
  const [checkPw, setCheckPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v })), [])

  // 마운트 후 URL 설정 1회 반영 → 이후 생성 (서버 HTML엔 비밀번호 없음 → hydration 불일치 없음)
  const parsed = useRef(false)
  useEffect(() => {
    if (parsed.current) return
    parsed.current = true
    const r = fromParams(searchParams)
    setTab(r.tab); setS(r.s); setReady(true)
  }, [searchParams])

  useEffect(() => {
    if (!ready) return
    const q = toSearch(tab, s)
    const url = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, '', url)
  }, [ready, tab, s])

  const pwOpts: PwOptions = useMemo(() => tab === 'pin'
    ? { length: s.pinLength, upper: false, lower: false, digits: true, symbols: false, symbolSet: '', excludeAmbiguous: false, noRepeat: s.noRepeat }
    : { length: s.length, upper: s.upper, lower: s.lower, digits: s.digits, symbols: s.symbols, symbolSet: s.symbolSet, excludeAmbiguous: s.excludeAmbiguous, noRepeat: s.noRepeat },
  [tab, s])
  const phraseOpts = useMemo(() => ({ words: s.words, separator: SEPS[s.sep], capitalize: s.cap, addNumber: s.addNum }), [s])
  const error = tab === 'random' || tab === 'pin' ? validate(pwOpts) : null
  const bits = tab === 'passphrase' ? passphraseEntropy(phraseOpts, WORD_LIST.length) : passwordEntropy(pwOpts)

  const generate = useCallback(() => {
    if (tab === 'check') return
    if (error) { setResults([]); return }
    setResults(Array.from({ length: s.count }, () => tab === 'passphrase' ? generatePassphrase(phraseOpts, WORD_LIST) : generatePassword(pwOpts)))
    setCopied(null)
  }, [tab, error, s.count, phraseOpts, pwOpts])

  useEffect(() => { if (ready) generate() }, [ready, generate])

  const regenerate = () => { generate(); setAnnounce(t('announce.generated', { n: s.count })) }

  const copy = useCallback(async (text: string, id: number | 'all') => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setAnnounce(id === 'all' ? t('announce.copiedAll', { n: results.length }) : t('announce.copied', { n: id + 1 }))
    } catch {
      setAnnounce(t('announce.copyFailed'))
    }
    setCopied(id)
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000)
  }, [results.length, t])

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const next = ({ ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 } as Record<string, number>)[e.key]
    if (next === undefined) return
    e.preventDefault()
    const j = (next + TABS.length) % TABS.length
    setTab(TABS[j]); tabRefs.current[j]?.focus()
  }

  const applyPreset = (p: Partial<Settings>) => { setS((prev) => ({ ...prev, ...p })); setLenText(null) }
  const presetActive = (p: Partial<Settings>) => (Object.keys(p) as (keyof Settings)[]).every((k) => s[k] === p[k])

  const analysis = useMemo(() => (checkPw ? analyzePassword(checkPw) : null), [checkPw])

  // ── 공용 UI 조각 ──
  const checkbox = (k: 'upper' | 'lower' | 'digits' | 'symbols' | 'excludeAmbiguous' | 'noRepeat' | 'cap' | 'addNum', label: string, desc?: string) => (
    <label className="flex items-start gap-3 min-h-11 py-2 cursor-pointer">
      <input type="checkbox" checked={s[k]} onChange={(e) => set(k, e.target.checked)} aria-describedby={desc ? `pg-${k}-d` : undefined}
        className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--primary)]" />
      <span>
        <span className="block text-sm text-body">{label}</span>
        {desc && <span id={`pg-${k}-d`} className="block text-xs text-muted mt-0.5">{desc}</span>}
      </span>
    </label>
  )
  const slider = (id: string, label: string, value: number, r: { min: number; max: number }, onChange: (n: number) => void, valueText: string) => (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor={id} className="text-sm font-medium text-body">{label}</label>
        <span className="text-sm font-bold text-fg tabular-nums" aria-hidden="true">{valueText}</span>
      </div>
      <input id={id} type="range" min={r.min} max={r.max} value={value} aria-valuetext={valueText}
        onChange={(e) => onChange(+e.target.value)} className="w-full h-11 cursor-pointer accent-[var(--primary)]" />
      <div className="flex justify-between text-xs text-muted tabular-nums" aria-hidden="true"><span>{r.min}</span><span>{r.max}</span></div>
    </div>
  )
  const seg = (on: boolean) => `min-h-11 px-3 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'text-body hover:bg-subtle'}`

  const grade = gradeOf(bits)
  const strengthBlock = (b: number, estimated: boolean) => {
    const g = gradeOf(b), ct = crackTime(b), level = GRADE_ORDER.indexOf(g)
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live={estimated ? 'polite' : undefined} aria-atomic="true">
          <p className="text-sm text-muted">{t('strength.title')}{estimated && ` (${t('strength.estimated')})`}</p>
          <p className={`text-2xl font-bold ${GRADE_TEXT[g]}`}>{t(`strength.${g}`)}</p>
          <p className="text-sm text-body tabular-nums">{t('strength.entropy')} {b.toFixed(1)} {t('strength.bits')}</p>
          <p className="text-sm text-body">{t('strength.crack')}: <span className="font-semibold text-fg">{t(`time.${ct.unit}`, { n: ct.value.toLocaleString() })}</span></p>
        </div>
        <div className="grid grid-cols-5 gap-1" aria-hidden="true">
          {GRADE_ORDER.map((_, i) => <div key={i} className={`h-1.5 rounded-full ${i <= level ? GRADE_BAR[g] : 'bg-track'}`} />)}
        </div>
        <p className="text-xs text-muted">{t('strength.assumption')}</p>
      </div>
    )
  }

  const symbolsShown = cleanSymbols(s.symbolSet)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>

      {/* 모드 탭 */}
      <div role="tablist" aria-label={t('modesLabel')} className="grid grid-cols-4 gap-1 p-1 bg-soft rounded-2xl">
        {TABS.map((k, i) => (
          <button key={k} ref={(el) => { tabRefs.current[i] = el }} role="tab" id={`pg-tab-${k}`} aria-controls="pg-panel"
            aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)} onKeyDown={(e) => onTabKey(e, i)}
            className={`min-h-11 px-2 rounded-xl text-sm font-semibold transition-colors ${tab === k ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
            {t(`modes.${k}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="pg-panel" aria-labelledby={`pg-tab-${tab}`}>
        {tab === 'check' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 ui-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-fg">{t('check.title')}</h2>
              <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('check.privacy')}</p>
              <div>
                <label htmlFor="pg-check" className="block text-sm font-medium text-body mb-2">{t('check.label')}</label>
                <div className="flex gap-2">
                  <input id="pg-check" type={showPw ? 'text' : 'password'} value={checkPw} onChange={(e) => setCheckPw(e.target.value)}
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-lpignore="true" data-1p-ignore=""
                    placeholder={t('check.placeholder')} className="ui-field px-4 py-3 font-mono min-w-0" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={t('check.showLabel')}
                    className="ui-btn-soft shrink-0 w-11 h-12">
                    {showPw ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 ui-card p-6 space-y-6">
              {!analysis ? <p className="text-muted py-8 text-center">{t('check.empty')}</p> : (
                <>
                  {strengthBlock(analysis.bits, true)}
                  <p className="text-xs text-muted">{t('check.estimateNote')}</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-subtle rounded-2xl p-4">
                      <dt className="text-muted">{t('check.length')}</dt>
                      <dd className="text-lg font-bold text-fg tabular-nums">{t('check.lengthValue', { n: analysis.length })}</dd>
                    </div>
                    <div className="bg-subtle rounded-2xl p-4">
                      <dt className="text-muted mb-1">{t('check.types')}</dt>
                      <dd>
                        <ul className="flex flex-wrap gap-x-3 gap-y-1">
                          {(['upper', 'lower', 'digit', 'symbol', 'other'] as const).map((k) => (
                            <li key={k} className={`inline-flex items-center gap-1 ${analysis.classes[k] ? 'text-fg font-medium' : 'text-faint'}`}>
                              {analysis.classes[k] ? <Check className="w-4 h-4 text-primary" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
                              {t(`check.type.${k}`)}<span className="sr-only"> {analysis.classes[k] ? t('check.has') : t('check.none')}</span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <h3 className="text-sm font-semibold text-fg mb-2">{t('check.patterns')}</h3>
                    {analysis.patterns.length === 0 ? <p className="text-sm text-sub">{t('check.noPatterns')}</p> : (
                      <ul className="space-y-1.5">
                        {analysis.patterns.map((p, i) => (
                          <li key={i} className="text-sm text-body">
                            <span className="font-semibold text-red-600">{t(`check.pattern.${p.type}`)}</span>
                            {showPw && <span className="ml-2 font-mono text-sub">{p.token}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-fg mb-2">{t('check.suggestions')}</h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-body">
                      {analysis.suggestions.map((k) => <li key={k}>{t(`check.suggest.${k}`)}</li>)}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 결과 (DOM·모바일에선 먼저, 데스크톱에선 오른쪽) */}
            <div className="lg:col-span-2 lg:order-2 ui-card p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-fg">{t('result.title')}</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={regenerate} disabled={!!error} className="ui-btn px-4 min-h-11">
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />{t('generate')}
                  </button>
                  {results.length > 1 && (
                    <button type="button" onClick={() => copy(results.join('\n'), 'all')} className="ui-btn-soft px-4 min-h-11">
                      {copied === 'all' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                      {copied === 'all' ? t('copied') : t('copyAll')}
                    </button>
                  )}
                </div>
              </div>

              {error ? (
                <p role="alert" className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t(`errors.${error}`)}</p>
              ) : (
                <>
                  {strengthBlock(bits, false)}
                  <p className="text-xs text-muted">{t('strength.basis')}</p>
                  <ol className="space-y-2">
                    {results.map((v, i) => (
                      <li key={`${i}-${v}`} className="flex items-center gap-3 bg-subtle rounded-2xl pl-4 pr-1.5 py-1.5">
                        <span className="text-xs text-muted tabular-nums w-5 shrink-0" aria-hidden="true">{i + 1}</span>
                        <span className={`flex-1 min-w-0 font-mono text-fg break-all whitespace-pre-wrap py-2 ${i === 0 ? 'text-lg' : 'text-base'}`}><Colored value={v} /></span>
                        <button type="button" onClick={() => copy(v, i)} aria-label={t('copyNth', { n: i + 1 })}
                          className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-xl text-sub hover:bg-soft hover:text-fg">
                          {copied === i ? <Check className="w-5 h-5 text-primary" aria-hidden="true" /> : <Copy className="w-5 h-5" aria-hidden="true" />}
                        </button>
                      </li>
                    ))}
                  </ol>
                  {tab !== 'pin' && <p className="text-xs text-muted">{t('result.legend')}</p>}
                </>
              )}
              <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('result.notStored')}</p>
              {tab === 'pin' ? <p className="text-sm text-body">{t('result.pinNote')}</p>
                : grade !== 'veryStrong' && grade !== 'strong' && !error && <p className="text-sm text-body">{t('result.weakHint')}</p>}
            </div>
            {/* 설정 */}
            <div className="lg:col-span-1 lg:order-1 ui-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-fg">{t('settings.title')}</h2>

              {tab === 'random' && (
                <>
                  <div>
                    <p id="pg-presets" className="text-sm font-medium text-body mb-2">{t('presets.title')}</p>
                    <div role="group" aria-labelledby="pg-presets" className="flex flex-wrap gap-2">
                      {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => {
                        const on = presetActive(PRESETS[k])
                        return (
                          <button key={k} type="button" aria-pressed={on} onClick={() => applyPreset(PRESETS[k])}
                            className={`min-h-11 px-3 rounded-xl text-sm font-medium border transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'border-line text-body hover:bg-subtle'}`}>
                            {t(`presets.${k}`)}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted mt-2">{t('presets.hint')}</p>
                  </div>

                  <div>
                    {slider('pg-len', t('settings.length'), s.length, LEN, (n) => { set('length', n); setLenText(null) }, t('settings.lengthValue', { n: s.length }))}
                    <div className="flex items-center gap-2 mt-2">
                      <label htmlFor="pg-len-n" className="text-xs text-muted">{t('settings.lengthInput')}</label>
                      <input id="pg-len-n" type="number" inputMode="numeric" min={LEN.min} max={LEN.max} value={lenText ?? s.length}
                        onChange={(e) => { setLenText(e.target.value); const n = parseInt(e.target.value); if (n >= LEN.min && n <= LEN.max) set('length', n) }}
                        onBlur={() => setLenText(null)} className="ui-field px-3 py-2 w-24 min-h-11 tabular-nums" />
                    </div>
                  </div>

                  <fieldset>
                    <legend className="text-sm font-medium text-body mb-1">{t('settings.characters')}</legend>
                    {checkbox('upper', t('settings.uppercase'))}
                    {checkbox('lower', t('settings.lowercase'))}
                    {checkbox('digits', t('settings.numbers'))}
                    {checkbox('symbols', t('settings.specialChars'))}
                  </fieldset>

                  {s.symbols && (
                    <div>
                      <label htmlFor="pg-sym" className="block text-sm font-medium text-body mb-2">{t('settings.customSpecialChars')}</label>
                      <div className="flex gap-2">
                        <input id="pg-sym" type="text" value={s.symbolSet} onChange={(e) => set('symbolSet', e.target.value)} aria-describedby="pg-sym-d"
                          autoComplete="off" spellCheck={false} placeholder={t('settings.customSpecialCharsPlaceholder')} className="ui-field px-4 py-3 font-mono min-w-0" />
                        <button type="button" onClick={() => set('symbolSet', DEFAULT_SYMBOLS)} className="ui-btn-soft px-3 min-h-11 shrink-0 text-sm">{t('settings.symbolsReset')}</button>
                      </div>
                      <p id="pg-sym-d" className="text-xs text-muted mt-1 break-all">{t('settings.symbolsUsed', { n: symbolsShown.length, chars: symbolsShown || '-' })}</p>
                    </div>
                  )}

                  <div>
                    {checkbox('excludeAmbiguous', t('settings.excludeAmbiguous'), t('settings.excludeAmbiguousDesc'))}
                    {checkbox('noRepeat', t('settings.noRepeat'), t('settings.noRepeatDesc'))}
                  </div>
                </>
              )}

              {tab === 'passphrase' && (
                <>
                  {slider('pg-words', t('settings.wordCount'), s.words, WORDS, (n) => set('words', n), t('settings.wordValue', { n: s.words }))}
                  <div>
                    <label htmlFor="pg-sep" className="block text-sm font-medium text-body mb-2">{t('settings.separator')}</label>
                    <select id="pg-sep" value={s.sep} onChange={(e) => set('sep', e.target.value as Sep)} className="ui-field px-4 py-3 min-h-11">
                      {(Object.keys(SEPS) as Sep[]).map((k) => <option key={k} value={k}>{t(`settings.separators.${k}`)}</option>)}
                    </select>
                  </div>
                  <div>
                    {checkbox('cap', t('settings.capitalizeFirst'))}
                    {checkbox('addNum', t('settings.addNumber'), t('settings.addNumberDesc'))}
                  </div>
                </>
              )}

              {tab === 'pin' && (
                <>
                  {slider('pg-pin', t('settings.pinLength'), s.pinLength, PIN, (n) => set('pinLength', n), t('settings.lengthValue', { n: s.pinLength }))}
                  {checkbox('noRepeat', t('settings.noRepeat'), t('settings.noRepeatDesc'))}
                </>
              )}

              <div>
                <p id="pg-count" className="text-sm font-medium text-body mb-2">{t('settings.count')}</p>
                <div role="group" aria-labelledby="pg-count" className="grid grid-cols-4 gap-1 p-1 bg-soft rounded-2xl">
                  {COUNTS.map((n) => (
                    <button key={n} type="button" aria-pressed={s.count === n} onClick={() => set('count', n)} className={seg(s.count === n)}>
                      {t('settings.countN', { n })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 가이드 — 배열 키 누락 시 크래시 대신 빈 목록 */}
      <section className="ui-card p-6 space-y-8" aria-labelledby="pg-guide">
        <h2 id="pg-guide" className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(['tips', 'passphrase', 'manager', 'nist'] as const).map((k) => (
            <div key={k}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${k}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {((t.raw(`guide.${k}.items`) as string[] | undefined) ?? []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              {k === 'nist' && (
                <a href="https://pages.nist.gov/800-63-4/sp800-63b.html" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 min-h-11 text-sm text-primary font-medium hover:underline">
                  {t('guide.nist.link')}<ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              )}
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <dl className="space-y-4">
            {((t.raw('guide.faq.items') as { q: string; a: string }[] | undefined) ?? []).map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-5">
                <dt className="font-medium text-fg">{f.q}</dt>
                <dd className="text-sm text-sub mt-1.5">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
