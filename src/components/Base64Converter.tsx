'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, ArrowRightLeft, Trash2, Upload, Image } from 'lucide-react'

type Mode = 'encode' | 'decode'

export default function Base64Converter() {
  const t = useTranslations('base64Converter')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<Mode>('encode')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleConvert = useCallback(() => {
    setError('')
    setImagePreview(null)

    if (!input.trim()) {
      setOutput('')
      return
    }

    try {
      if (mode === 'encode') {
        // Text to Base64
        const encoded = btoa(unescape(encodeURIComponent(input)))
        setOutput(encoded)
      } else {
        // Base64 to Text
        // Check if it's a data URI
        const base64Data = input.includes(',') ? input.split(',')[1] : input

        // Try to detect if it's an image
        if (input.startsWith('data:image/')) {
          setImagePreview(input)
          setOutput(t('output.imageDetected'))
        } else {
          const decoded = decodeURIComponent(escape(atob(base64Data)))
          setOutput(decoded)
        }
      }
    } catch {
      setError(mode === 'encode' ? t('errors.encodeError') : t('errors.decodeError'))
      setOutput('')
    }
  }, [input, mode, t])

  const handleSwap = useCallback(() => {
    setMode(prev => prev === 'encode' ? 'decode' : 'encode')
    setInput(output)
    setOutput('')
    setError('')
    setImagePreview(null)
  }, [output])

  const handleCopy = useCallback(async () => {
    if (!output || output === t('output.imageDetected')) return
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
  }, [output, t])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError('')
    setImagePreview(null)
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (mode === 'encode') {
        setInput(result)
        // Auto-convert for files
        setOutput(result)
        if (file.type.startsWith('image/')) {
          setImagePreview(result)
        }
      } else {
        setInput(result)
      }
    }
    reader.readAsDataURL(file)
  }, [mode])

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
          onClick={() => { setMode('encode'); setOutput(''); setError(''); }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            mode === 'encode'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
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
          onClick={() => { setMode('decode'); setOutput(''); setError(''); }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            mode === 'decode'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {t('modes.decode')}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Input */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'encode' ? t('input.text') : t('input.base64')}
            </span>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-all">
              <Upload className="w-4 h-4" />
              {t('actions.upload')}
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept={mode === 'encode' ? '*/*' : '.txt,.base64'}
              />
            </label>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? t('input.textPlaceholder') : t('input.base64Placeholder')}
            className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'encode' ? t('output.base64') : t('output.text')}
            </span>
            <button
              onClick={handleCopy}
              disabled={!output || output === t('output.imageDetected')}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('actions.copied') : t('actions.copy')}
            </button>
          </div>
          {imagePreview ? (
            <div className="p-4 flex flex-col items-center justify-center h-64">
              <Image className="w-8 h-8 text-gray-400 mb-2" />
              <img src={imagePreview} alt="Preview" className="max-h-48 max-w-full object-contain rounded" />
            </div>
          ) : (
            <textarea
              value={error || output}
              readOnly
              className={`w-full h-64 p-4 bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed ${
                error ? 'text-red-500' : 'text-gray-900 dark:text-white'
              }`}
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={handleConvert}
          className="px-8 py-3 rounded-xl font-medium bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
        >
          {mode === 'encode' ? t('actions.encode') : t('actions.decode')}
        </button>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {t('actions.clear')}
        </button>
      </div>

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
              {t('guide.useCases.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.useCases.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
