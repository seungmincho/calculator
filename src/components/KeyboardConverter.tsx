'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/keyboardConverter'
import { Copy, Check, ArrowUpDown, RotateCcw, BookOpen } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { engToKorConvert, korToEngConvert, detectMode } from '@/utils/keyboardConvert'

// ── Example items (hardcoded, not from translation) ──
const EXAMPLES = [
  { input: 'dkssudgktpdy', output: '안녕하세요' },
  { input: 'rkatkgkqslek', output: '감사합니다' },
  { input: 'tkfkdgody', output: '사랑해요' },
  { input: 'gksrmf', output: '한글' },
]

// ── Component ──

export default function KeyboardConverter() {
  const t = useTranslations('keyboardConverter')
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'auto' | 'engToKor' | 'korToEng'>('auto')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const direction = mode === 'auto' ? detectMode(input) : mode
  const output = useMemo(() => {
    if (!input) return ''
    return direction === 'engToKor' ? engToKorConvert(input) : korToEngConvert(input)
  }, [input, direction])

  useEffect(() => { inputRef.current?.focus() }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopyFailed(false)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 3000)
    }
  }, [])

  // Ctrl/Cmd + Enter → 결과 복사
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && output) {
        e.preventDefault()
        copyToClipboard(output, 'output')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [output, copyToClipboard])

  const handleSwap = useCallback(() => {
    setInput(output)
    setMode(direction === 'engToKor' ? 'korToEng' : 'engToKor')
  }, [output, direction])

  const handleReset = useCallback(() => {
    setInput('')
  }, [])

  const handleExample = useCallback((exInput: string) => {
    setMode('auto')
    setInput(exInput)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Main converter card */}
      <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>
        {/* Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-soft rounded-xl">
            {(['auto', 'engToKor', 'korToEng'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === m ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'
                }`}
              >
                {t(m)}
              </button>
            ))}
          </div>
          {mode === 'auto' && input && (
            <span className="text-xs text-muted">{t('detected')}: {t(direction)}</span>
          )}
        </div>

        {/* Input textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-body">
              {t('input')}
            </label>
            <span className="text-xs text-faint">
              {input.length} {t('charCount')}
            </span>
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('inputPlaceholder')}
            rows={5}
            className={`${glassInput} px-3 py-2 resize-none text-base`}
          />
        </div>

        {/* Action buttons row */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleSwap}
            disabled={!output}
            className="flex items-center gap-2 px-4 py-2 bg-soft hover:bg-track text-body rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('swap')}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-sm">{t('swap')}</span>
          </button>
          <button
            onClick={handleReset}
            disabled={!input}
            className="flex items-center gap-2 px-4 py-2 bg-soft hover:bg-track text-body rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">{t('reset')}</span>
          </button>
        </div>

        {/* Output textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-body">
              {t('output')}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-faint">
                {output.length} {t('charCount')}
              </span>
              {output && (
                <button
                  onClick={() => copyToClipboard(output, 'output')}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-soft hover:bg-track text-body rounded-md transition-colors"
                >
                  {copiedId === 'output' ? (
                    <>
                      <Check className="w-3 h-3 text-primary" />
                      <span className="text-primary">{t('copied')}</span>
                    </>
                  ) : copyFailed ? (
                    <span className="text-red-500">{t('copyFailed')}</span>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t('copy')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            rows={5}
            className="w-full px-4 py-3 border border-line rounded-xl bg-subtle text-fg resize-none text-lg font-medium"
          />
        </div>
      </div>

      {/* Examples */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-lg font-semibold text-fg mb-4">
          {t('examples')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => handleExample(ex.input)}
              className="flex items-center justify-between px-4 py-3 bg-subtle hover:bg-soft rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-mono text-muted truncate">
                  {ex.input}
                </span>
                <span className="text-faint shrink-0">→</span>
                <span className="text-sm font-medium text-fg truncate">
                  {ex.output}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Guide section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center gap-2">
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          {/* How to use */}
          <div>
            <h3 className="text-base font-semibold text-body mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-sub">
                  <span className="text-faint mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-base font-semibold text-body mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-sub">
                  <span className="text-faint mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
