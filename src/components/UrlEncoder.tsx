'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/urlEncoder'
import { Copy, Check, ArrowRightLeft, Trash2, Link, Unlink } from 'lucide-react'
import { glassCard, glassInset } from '@/lib/glass'
import UrlBatchConverter from '@/components/UrlBatchConverter'

type Mode = 'encode' | 'decode'

interface ParsedUrl {
  protocol: string
  host: string
  pathname: string
  search: string
  hash: string
  params: Array<{ key: string; value: string }>
}

export default function UrlEncoder() {
  const t = useTranslations('urlEncoder')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<Mode>('encode')
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [error, setError] = useState('')
  const [parsedUrl, setParsedUrl] = useState<ParsedUrl | null>(null)

  const parseUrl = useCallback((urlString: string): ParsedUrl | null => {
    try {
      const url = new URL(urlString)
      const params: Array<{ key: string; value: string }> = []
      url.searchParams.forEach((value, key) => {
        params.push({ key, value })
      })
      return {
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        params
      }
    } catch {
      return null
    }
  }, [])

  const handleConvert = useCallback(() => {
    setError('')
    setCopied(false)
    setCopyFailed(false)
    setParsedUrl(null)

    if (!input.trim()) {
      setOutput('')
      return
    }

    try {
      if (mode === 'encode') {
        const encoded = encodeURIComponent(input)
        setOutput(encoded)
      } else {
        const decoded = decodeURIComponent(input)
        setOutput(decoded)

        // Try to parse as URL
        const parsed = parseUrl(decoded)
        if (parsed) {
          setParsedUrl(parsed)
        }
      }
    } catch {
      setError(mode === 'encode' ? t('errors.encodeError') : t('errors.decodeError'))
      setOutput('')
    }
  }, [input, mode, parseUrl, t])

  const handleSwap = useCallback(() => {
    setMode(prev => prev === 'encode' ? 'decode' : 'encode')
    setInput(output)
    setOutput('')
    setError('')
    setParsedUrl(null)
    setCopied(false)
    setCopyFailed(false)
  }, [output])

  const handleCopy = useCallback(async () => {
    if (!output) return
    setCopied(false)
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = output
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        try {
          textarea.select()
          if (!document.execCommand('copy')) throw new Error('Copy failed')
        } finally { textarea.remove() }
      } catch { setCopyFailed(true); return }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError('')
    setParsedUrl(null)
    setCopied(false)
    setCopyFailed(false)
  }, [])

  const handleEncodeFullUrl = useCallback(() => {
    setError('')
    setCopied(false)
    setCopyFailed(false)
    if (!input.trim()) return
    try {
      const url = new URL(input)
      setOutput(url.href)
      setParsedUrl(parseUrl(url.href))
    } catch {
      setError(t('errors.invalidUrl'))
      setOutput('')
      setParsedUrl(null)
    }
  }, [input, parseUrl, t])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">
          {t('title')}
        </h1>
        <p className="text-sm text-muted mt-1">
          {t('description')}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => { setMode('encode'); setOutput(''); setError(''); setParsedUrl(null); setCopied(false); setCopyFailed(false); }}
          className={`min-h-11 min-w-0 px-3 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            mode === 'encode'
              ? 'bg-primary text-white'
              : 'bg-soft text-body hover:bg-subtle'
          }`}
        >
          <Link className="w-4 h-4" />
          {t('modes.encode')}
        </button>
        <button
          onClick={handleSwap}
          className="min-h-11 min-w-11 p-2 rounded-xl bg-soft text-sub hover:bg-subtle transition-colors"
          aria-label={t('actions.swap')}
          title={t('actions.swap')}
        >
          <ArrowRightLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setMode('decode'); setOutput(''); setError(''); setParsedUrl(null); setCopied(false); setCopyFailed(false); }}
          className={`min-h-11 min-w-0 px-3 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            mode === 'decode'
              ? 'bg-primary text-white'
              : 'bg-soft text-body hover:bg-subtle'
          }`}
        >
          <Unlink className="w-4 h-4" />
          {t('modes.decode')}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input */}
        <div className={`${glassCard} ${glassInset} border border-line overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 bg-subtle border-b border-line">
            <span className="text-sm font-medium text-body">
              {mode === 'encode' ? t('input.text') : t('input.encoded')}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setOutput(''); setError(''); setParsedUrl(null); setCopied(false); setCopyFailed(false) }}
            aria-label={mode === 'encode' ? t('input.text') : t('input.encoded')}
            placeholder={mode === 'encode' ? t('input.textPlaceholder') : t('input.encodedPlaceholder')}
            className="w-full h-48 p-4 text-fg bg-transparent resize-none focus:outline-none text-base font-mono leading-relaxed placeholder:text-faint"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className={`${glassCard} ${glassInset} border border-line overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 bg-subtle border-b border-line">
            <span className="text-sm font-medium text-body">
              {mode === 'encode' ? t('output.encoded') : t('output.text')}
            </span>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="ui-btn min-h-11 inline-flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('actions.copied') : t('actions.copy')}
            </button>
          </div>
          <textarea
            value={error || output}
            readOnly
            aria-label={mode === 'encode' ? t('output.encoded') : t('output.text')}
            className={`w-full h-48 p-4 bg-transparent resize-none focus:outline-none text-base font-mono leading-relaxed ${
              error ? 'text-red-500' : 'text-fg'
            }`}
            spellCheck={false}
          />
        </div>
      </div>
      {copyFailed && <p role="alert" className="mt-3 rounded-xl bg-subtle p-3 text-sm text-body">{t('copyFailed')}</p>}

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <button
          onClick={handleConvert}
          className="ui-btn min-h-11 px-4 py-3"
        >
          {mode === 'encode' ? t('actions.encode') : t('actions.decode')}
        </button>
        {mode === 'encode' && (
          <button
            onClick={handleEncodeFullUrl}
            className="ui-btn-soft min-h-11 px-4 py-3"
          >
            {t('actions.parseUrl')}
          </button>
        )}
        <button
          onClick={handleClear}
          className="ui-btn-soft min-h-11 inline-flex items-center gap-2 px-4 py-3"
        >
          <Trash2 className="w-4 h-4" />
          {t('actions.clear')}
        </button>
      </div>

      {/* Parsed URL Info */}
      {parsedUrl && (
        <div className={`mt-6 ${glassCard} ${glassInset} border border-line p-6`}>
          <h3 className="text-lg font-semibold text-fg mb-4">
            {t('urlAnalysis.title')}
          </h3>
          <div className="grid gap-3 text-sm">
            <div className="flex">
              <span className="w-24 font-medium text-muted">{t('urlAnalysis.protocol')}</span>
              <span className="text-fg font-mono">{parsedUrl.protocol}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-medium text-muted">{t('urlAnalysis.host')}</span>
              <span className="text-fg font-mono">{parsedUrl.host}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-medium text-muted">{t('urlAnalysis.path')}</span>
              <span className="min-w-0 text-fg font-mono break-all">{parsedUrl.pathname}</span>
            </div>
            {parsedUrl.params.length > 0 && (
              <div>
                <span className="font-medium text-muted">{t('urlAnalysis.params')}</span>
                <div className="mt-2 space-y-1 ml-4">
                  {parsedUrl.params.map((param, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="min-w-0 text-primary font-mono break-all">{param.key}</span>
                      <span className="text-faint">=</span>
                      <span className="min-w-0 text-fg font-mono break-all">{param.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsedUrl.hash && (
              <div className="flex">
                <span className="w-24 font-medium text-muted">{t('urlAnalysis.hash')}</span>
                <span className="min-w-0 text-fg font-mono break-all">{parsedUrl.hash}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <UrlBatchConverter />

      {/* Guide */}
      <div className={`mt-8 ${glassCard} ${glassInset} border border-line p-6`}>
        <h2 className="text-lg font-semibold text-fg mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-body mb-3">
              {t('guide.whatIs.title')}
            </h3>
            <p className="text-sm text-sub">
              {t('guide.whatIs.description')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-body mb-3">
              {t('guide.examples.title')}
            </h3>
            <ul className="space-y-2 text-sm text-sub font-mono">
              <li>공백 → %20</li>
              <li>& → %26</li>
              <li>= → %3D</li>
              <li>? → %3F</li>
              <li>한글 → %ED%95%9C%EA%B8%80</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
