'use client'

import { useState, useCallback, useMemo, useEffect, useRef, useDeferredValue } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/textConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, X, Undo2 } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import { graphemes, countWords, countLines } from '@/utils/charCount'
import {
  CASE_IDS, LINE_OPS, SPACE_OPS, CHAR_OPS, LIST_PRESETS, REGEX_MAX,
  toCase, runPipeline, encodeSteps, decodeSteps, type Step, type SimpleOp,
} from '@/utils/textConvert'

const SAMPLE = 'getUserName\nXMLHttpRequest2Parser\norder_id\norder_id\nthe lord of the rings'

const GROUPS: { id: string; ops: readonly SimpleOp[] }[] = [
  { id: 'lines', ops: LINE_OPS },
  { id: 'space', ops: SPACE_OPS },
  { id: 'chars', ops: CHAR_OPS },
  { id: 'case', ops: CASE_IDS },
]

const RELATED = [
  { href: '/character-counter/', key: 'characterCounter' },
  { href: '/korean-syllable/', key: 'koreanSyllable' },
  { href: '/keyboard-converter/', key: 'keyboardConverter' },
  { href: '/fancy-text/', key: 'fancyText' },
  { href: '/regex-extractor/', key: 'regexExtractor' },
]

const stats = (s: string) => ({ chars: graphemes(s).length, words: countWords(s), lines: countLines(s) })

function syncUrl(steps: Step[]) {
  const p = new URLSearchParams(window.location.search)
  const enc = encodeSteps(steps)
  if (enc) p.set('ops', enc)
  else p.delete('ops')
  const qs = p.toString()
  if (qs !== window.location.search.replace(/^\?/, '')) {
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }
}

export default function TextConverter() {
  const t = useTranslations('textConverter')
  const searchParams = useSearchParams()

  const [input, setInput] = useState(SAMPLE)
  const [steps, setSteps] = useState<Step[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [find, setFind] = useState('')
  const [repl, setRepl] = useState('')
  const [regex, setRegex] = useState(false)
  const [flags, setFlags] = useState('m')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')

  const stepsRef = useRef(steps)
  stepsRef.current = steps

  // URL(ops) → 단계. 자기 replaceState로 돌아온 값은 같아서 무시 (찾기/앞뒤 단계는 URL에 없으므로 보존)
  useEffect(() => {
    const p = searchParams.get('ops') ?? ''
    if (p !== encodeSteps(stepsRef.current)) setSteps(decodeSteps(p, Date.now()))
  }, [searchParams])

  const update = useCallback((next: Step[]) => {
    setSteps(next)
    syncUrl(next)
  }, [])
  const addStep = (s: Step) => update([...steps, s])

  const deferred = useDeferredValue(input)
  const cases = useMemo(() => CASE_IDS.map(id => ({ id, value: toCase(deferred, id) })), [deferred])
  const result = useMemo(() => runPipeline(input, steps), [input, steps])
  const inStats = useMemo(() => stats(input), [input])
  const outStats = useMemo(() => stats(result.text), [result.text])

  const copy = useCallback(async (text: string, id: string) => {
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
    } catch { /* 권한 거부 시에도 표시만 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(c => (c === id ? null : c)), 2000)
  }, [])

  // Ctrl/⌘ + Enter → 결과 복사
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        copy(result.text, 'out')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copy, result.text])

  const opLabel = (op: SimpleOp) => (CASE_IDS as readonly string[]).includes(op) ? t(`cases.${op}`) : t(`ops.${op}`)
  const stepLabel = (s: Step) => {
    if (s.op === 'replace') return t('steps.replace', { find: s.find, repl: s.repl || '∅' })
    if (s.op === 'affix') return t('steps.affix', { prefix: s.prefix, suffix: s.suffix })
    if (s.op === 'list') return t(`list.${s.preset}`)
    return opLabel(s.op)
  }

  const toggleFlag = (f: string) => setFlags(fl => (fl.includes(f) ? fl.replace(f, '') : fl + f))
  const addReplace = () => {
    if (!find) return
    addStep({ op: 'replace', find, repl, regex, flags: regex ? flags : flags.includes('i') ? 'i' : '' })
  }
  const addAffix = () => {
    if (!prefix && !suffix) return
    addStep({ op: 'affix', prefix, suffix })
  }

  const copyBtn = (text: string, id: string) => (
    <button
      type="button"
      onClick={() => copy(text, id)}
      disabled={!text}
      aria-label={t('actions.copy')}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-soft text-body hover:bg-subtle disabled:opacity-50 shrink-0"
    >
      {copiedId === id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      {copiedId === id ? t('actions.copied') : t('actions.copy')}
    </button>
  )

  const chip = 'px-3 py-1.5 rounded-lg text-sm bg-soft text-body hover:bg-subtle transition-colors'
  const check = (on: boolean, onChange: () => void, label: string) => (
    <label className="inline-flex items-center gap-1.5 text-sm text-body cursor-pointer">
      <input type="checkbox" checked={on} onChange={onChange} className="accent-primary" />
      {label}
    </label>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 입력 */}
      <div className="ui-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="tc-input" className="text-sm font-medium text-fg">{t('input.label')}</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted tabular-nums">{t('stats', inStats)}</span>
            <button type="button" onClick={() => setInput(SAMPLE)} className="px-2.5 py-1 rounded-lg text-xs bg-soft text-body hover:bg-subtle">{t('input.sample')}</button>
            <button type="button" onClick={() => setInput('')} disabled={!input} className="px-2.5 py-1 rounded-lg text-xs bg-soft text-body hover:bg-subtle disabled:opacity-50">{t('actions.clear')}</button>
          </div>
        </div>
        <textarea
          id="tc-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('input.placeholder')}
          rows={6}
          spellCheck={false}
          className="ui-field w-full px-4 py-3 font-mono text-sm leading-relaxed resize-y"
        />
      </div>

      {/* 모든 케이스 */}
      <section className="ui-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('cases.heading')}</h2>
          <p className="text-sm text-muted mt-1">{t('cases.hint')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cases.map(({ id, value }) => (
            <div key={id} className="bg-subtle rounded-xl p-3 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-sub">{t(`cases.${id}`)}</span>
                {copyBtn(value, `case-${id}`)}
              </div>
              <pre className="font-mono text-sm text-fg whitespace-pre-wrap break-all max-h-32 overflow-auto">{value || ' '}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* 단계 적용 */}
      <section className="ui-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('pipeline.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('pipeline.hint')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 도구 */}
          <div className="space-y-5 min-w-0">
            {GROUPS.map(g => (
              <div key={g.id}>
                <h3 className="text-sm font-medium text-sub mb-2">{t(`groups.${g.id}`)}</h3>
                <div className="flex flex-wrap gap-2">
                  {g.ops.map(op => (
                    <button key={op} type="button" className={chip}
                      onClick={() => addStep(op === 'shuffle' ? { op, seed: Date.now() } : { op })}>
                      {opLabel(op)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <h3 className="text-sm font-medium text-sub mb-1">{t('list.title')}</h3>
              <p className="text-xs text-muted mb-2">{t('list.hint')}</p>
              <div className="flex flex-wrap gap-2">
                {LIST_PRESETS.map(p => (
                  <button key={p} type="button" className={`${chip} font-mono`} onClick={() => addStep({ op: 'list', preset: p })}>
                    {t(`list.${p}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-subtle rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-fg">{t('replace.title')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={find} onChange={e => setFind(e.target.value)} placeholder={t('replace.find')} aria-label={t('replace.find')}
                  onKeyDown={e => { if (e.key === 'Enter') addReplace() }} className="ui-field w-full min-w-0 px-3 py-2 font-mono text-sm" />
                <input value={repl} onChange={e => setRepl(e.target.value)} placeholder={t('replace.repl')} aria-label={t('replace.repl')}
                  onKeyDown={e => { if (e.key === 'Enter') addReplace() }} className="ui-field w-full min-w-0 px-3 py-2 font-mono text-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {check(regex, () => setRegex(v => !v), t('replace.regex'))}
                {check(flags.includes('i'), () => toggleFlag('i'), t('replace.ignoreCase'))}
                {regex && check(flags.includes('m'), () => toggleFlag('m'), t('replace.multiline'))}
                {regex && check(flags.includes('s'), () => toggleFlag('s'), t('replace.dotAll'))}
                <button type="button" onClick={addReplace} disabled={!find} className="ui-btn px-3 py-1.5 text-sm ml-auto disabled:opacity-50">{t('addStep')}</button>
              </div>
              <p className="text-xs text-muted">{regex ? t('replace.regexHint', { max: REGEX_MAX.toLocaleString() }) : t('replace.plainHint')}</p>
            </div>

            <div className="bg-subtle rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-fg">{t('affix.title')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder={t('affix.prefix')} aria-label={t('affix.prefix')}
                  className="ui-field w-full min-w-0 px-3 py-2 font-mono text-sm" />
                <input value={suffix} onChange={e => setSuffix(e.target.value)} placeholder={t('affix.suffix')} aria-label={t('affix.suffix')}
                  className="ui-field w-full min-w-0 px-3 py-2 font-mono text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted flex-1">{t('affix.hint')}</p>
                <button type="button" onClick={addAffix} disabled={!prefix && !suffix} className="ui-btn px-3 py-1.5 text-sm disabled:opacity-50">{t('addStep')}</button>
              </div>
            </div>
          </div>

          {/* 단계 + 결과 */}
          <div className="space-y-3 min-w-0 lg:sticky lg:top-20 self-start">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-fg">{t('pipeline.steps', { n: steps.length })}</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => update(steps.slice(0, -1))} disabled={!steps.length}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-soft text-body hover:bg-subtle disabled:opacity-50">
                  <Undo2 className="w-3.5 h-3.5" />{t('pipeline.undo')}
                </button>
                <button type="button" onClick={() => update([])} disabled={!steps.length}
                  className="px-2.5 py-1 rounded-lg text-xs bg-soft text-body hover:bg-subtle disabled:opacity-50">
                  {t('pipeline.reset')}
                </button>
              </div>
            </div>

            {steps.length === 0 ? (
              <p className="bg-subtle rounded-xl p-3 text-sm text-muted">{t('pipeline.empty')}</p>
            ) : (
              <ol className="flex flex-wrap gap-2">
                {steps.map((s, i) => {
                  const err = result.errors[i]
                  return (
                    <li key={i} title={err ? t(`errors.${err}`) : undefined}
                      className={`inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1 py-1 rounded-lg text-sm border ${err ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-primary-soft text-primary border-primary'}`}>
                      <span className="text-xs tabular-nums opacity-70">{i + 1}</span>
                      <span className="truncate min-w-0 font-mono">{stepLabel(s)}</span>
                      <button type="button" onClick={() => update(steps.filter((_, j) => j !== i))} aria-label={t('pipeline.remove')}
                        className="p-0.5 rounded hover:bg-surface">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
            {result.errors.some(Boolean) && (
              <p className="bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-sm" role="alert">
                {[...new Set(result.errors.filter(Boolean))].map(e => t(`errors.${e}`, { max: REGEX_MAX.toLocaleString() })).join(' · ')}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-fg">{t('output.label')}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted tabular-nums">{t('stats', outStats)}</span>
                <button type="button" onClick={() => copy(result.text, 'out')} disabled={!result.text} className="ui-btn inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-50">
                  {copiedId === 'out' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'out' ? t('actions.copied') : t('actions.copy')}
                </button>
              </div>
            </div>
            <textarea value={result.text} readOnly rows={10} spellCheck={false} aria-label={t('output.label')}
              className="ui-field w-full px-4 py-3 font-mono text-sm leading-relaxed resize-y" />
            <p className="text-xs text-faint">{t('shortcut')}</p>
          </div>
        </div>
      </section>

      <div className="ui-card p-5">
        <h2 className="text-sm font-medium text-sub mb-2">{t('related.title')}</h2>
        <div className="flex flex-wrap gap-2">
          {RELATED.map(r => (
            <Link key={r.href} href={r.href} className="px-3 py-1.5 rounded-lg text-sm bg-soft text-body hover:bg-subtle">{t(`related.${r.key}`)}</Link>
          ))}
        </div>
      </div>

      <GuideSection namespace="textConverter" defaultOpen />
    </div>
  )
}
