'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, ArrowRightLeft, Trash2, Link, Unlink } from 'lucide-react'

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
  }, [output])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = output
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [output])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError('')
    setParsedUrl(null)
  }, [])

  const handleEncodeFullUrl = useCallback(() => {
    if (!input.trim()) return
    try {
      const url = new URL(input)
      setOutput(url.href)
      setParsedUrl(parseUrl(url.href))
    } catch {
      setError(t('errors.invalidUrl'))
    }
  }, [input, parseUrl, t])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => { setMode('encode'); setOutput(''); setError(''); setParsedUrl(null); }}
          className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            mode === 'encode'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Link className="w-4 h-4" />
          {t('modes.encode')}
        </button>
        <button
          onClick={handleSwap}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          title={t('actions.swap')}
        >
          <ArrowRightLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setMode('decode'); setOutput(''); setError(''); setParsedUrl(null); }}
          className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            mode === 'decode'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Unlink className="w-4 h-4" />
          {t('modes.decode')}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Input */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'encode' ? t('input.text') : t('input.encoded')}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? t('input.textPlaceholder') : t('input.encodedPlaceholder')}
            className="w-full h-48 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'encode' ? t('output.encoded') : t('output.text')}
            </span>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 text-white"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('actions.copied') : t('actions.copy')}
            </button>
          </div>
          <textarea
            value={error || output}
            readOnly
            className={`w-full h-48 p-4 bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed ${
              error ? 'text-red-500' : 'text-gray-900 dark:text-white'
            }`}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={handleConvert}
          className="px-8 py-3 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all"
        >
          {mode === 'encode' ? t('actions.encode') : t('actions.decode')}
        </button>
        {mode === 'encode' && (
          <button
            onClick={handleEncodeFullUrl}
            className="px-6 py-3 rounded-xl font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            {t('actions.parseUrl')}
          </button>
        )}
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {t('actions.clear')}
        </button>
      </div>

      {/* Parsed URL Info */}
      {parsedUrl && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('urlAnalysis.title')}
          </h3>
          <div className="grid gap-3 text-sm">
            <div className="flex">
              <span className="w-24 font-medium text-gray-500 dark:text-gray-400">{t('urlAnalysis.protocol')}</span>
              <span className="text-gray-900 dark:text-white font-mono">{parsedUrl.protocol}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-medium text-gray-500 dark:text-gray-400">{t('urlAnalysis.host')}</span>
              <span className="text-gray-900 dark:text-white font-mono">{parsedUrl.host}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-medium text-gray-500 dark:text-gray-400">{t('urlAnalysis.path')}</span>
              <span className="text-gray-900 dark:text-white font-mono">{parsedUrl.pathname}</span>
            </div>
            {parsedUrl.params.length > 0 && (
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">{t('urlAnalysis.params')}</span>
                <div className="mt-2 space-y-1 ml-4">
                  {parsedUrl.params.map((param, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-mono">{param.key}</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-900 dark:text-white font-mono">{param.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsedUrl.hash && (
              <div className="flex">
                <span className="w-24 font-medium text-gray-500 dark:text-gray-400">{t('urlAnalysis.hash')}</span>
                <span className="text-gray-900 dark:text-white font-mono">{parsedUrl.hash}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.whatIs.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('guide.whatIs.description')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.examples.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-mono">
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
