'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Upload, Plus, Trash2, AlertTriangle, FileText, Table } from 'lucide-react'

interface EnvEntry {
  id: string
  type: 'variable' | 'comment' | 'empty'
  key: string
  value: string
  comment: string
  rawComment: string // for comment-only lines
}

type ExportFormat = 'env' | 'docker' | 'yaml' | 'json' | 'shell'

let idCounter = 0
function genId() {
  return `env_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`
}

const SAMPLE_ENV = `# Application Settings
APP_NAME=MyApp
APP_ENV=development
APP_PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=admin
DB_PASSWORD="s3cr3t_p@ssword"

# API Keys
API_KEY='your-api-key-here'
SECRET_KEY=abc123xyz

# Feature Flags
ENABLE_LOGGING=true
DEBUG_MODE=false`

function parseEnv(text: string): EnvEntry[] {
  const lines = text.split('\n')
  return lines.map(line => {
    const trimmed = line.trim()

    if (trimmed === '') {
      return { id: genId(), type: 'empty', key: '', value: '', comment: '', rawComment: '' }
    }

    if (trimmed.startsWith('#')) {
      return { id: genId(), type: 'comment', key: '', value: '', comment: '', rawComment: trimmed }
    }

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) {
      return { id: genId(), type: 'variable', key: trimmed, value: '', comment: '', rawComment: '' }
    }

    const key = line.slice(0, eqIdx).trim()
    let rawVal = line.slice(eqIdx + 1)

    // Strip inline comment
    let inlineComment = ''
    const commentMatch = rawVal.match(/^([^#"']*|"[^"]*"|'[^']*')*?(#.*)$/)
    if (commentMatch && commentMatch[2]) {
      inlineComment = commentMatch[2].slice(1).trim()
      rawVal = rawVal.slice(0, rawVal.lastIndexOf(commentMatch[2])).trim()
    }

    // Strip quotes
    let value = rawVal
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    return { id: genId(), type: 'variable', key, value, comment: inlineComment, rawComment: '' }
  })
}

function entriesToEnv(entries: EnvEntry[]): string {
  return entries.map(e => {
    if (e.type === 'empty') return ''
    if (e.type === 'comment') return e.rawComment
    const needsQuotes = e.value.includes(' ') || e.value.includes('#') || e.value.includes('"') || e.value.includes("'")
    const val = needsQuotes ? `"${e.value.replace(/"/g, '\\"')}"` : e.value
    return e.comment ? `${e.key}=${val} # ${e.comment}` : `${e.key}=${val}`
  }).join('\n')
}

function entriesToDocker(entries: EnvEntry[]): string {
  return entries
    .filter(e => e.type === 'variable' && e.key)
    .map(e => `${e.key}=${e.value}`)
    .join('\n')
}

function entriesToYaml(entries: EnvEntry[]): string {
  const vars = entries.filter(e => e.type === 'variable' && e.key)
  if (vars.length === 0) return 'environment: []'
  const lines = vars.map(e => {
    const val = e.value.includes(':') || e.value.includes('#') || e.value === ''
      ? `"${e.value}"`
      : e.value
    return `  - ${e.key}=${val}`
  })
  return `environment:\n${lines.join('\n')}`
}

function entriesToJson(entries: EnvEntry[]): string {
  const obj: Record<string, string> = {}
  entries.filter(e => e.type === 'variable' && e.key).forEach(e => {
    obj[e.key] = e.value
  })
  return JSON.stringify(obj, null, 2)
}

function entriesToShell(entries: EnvEntry[]): string {
  return entries
    .filter(e => e.type === 'variable' && e.key)
    .map(e => {
      const needsQuotes = e.value.includes(' ') || e.value.includes('"') || e.value.includes("'")
      const val = needsQuotes ? `"${e.value.replace(/"/g, '\\"')}"` : e.value
      return `export ${e.key}=${val}`
    })
    .join('\n')
}

function getExportOutput(entries: EnvEntry[], format: ExportFormat): string {
  switch (format) {
    case 'env': return entriesToEnv(entries)
    case 'docker': return entriesToDocker(entries)
    case 'yaml': return entriesToYaml(entries)
    case 'json': return entriesToJson(entries)
    case 'shell': return entriesToShell(entries)
  }
}

function getDuplicateKeys(entries: EnvEntry[]): Set<string> {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const e of entries) {
    if (e.type === 'variable' && e.key) {
      if (seen.has(e.key)) dupes.add(e.key)
      seen.add(e.key)
    }
  }
  return dupes
}

function isInvalidKey(key: string): boolean {
  if (!key) return false
  return !/^[A-Z_][A-Z0-9_]*$/.test(key)
}

export default function EnvEditor() {
  const t = useTranslations('envEditor')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [viewMode, setViewMode] = useState<'raw' | 'table'>('raw')
  const [rawText, setRawText] = useState(SAMPLE_ENV)
  const [entries, setEntries] = useState<EnvEntry[]>(() => parseEnv(SAMPLE_ENV))
  const [exportFormat, setExportFormat] = useState<ExportFormat>('env')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const switchToRaw = useCallback(() => {
    setRawText(entriesToEnv(entries))
    setViewMode('raw')
  }, [entries])

  const switchToTable = useCallback(() => {
    setEntries(parseEnv(rawText))
    setViewMode('table')
  }, [rawText])

  const handleRawChange = useCallback((val: string) => {
    setRawText(val)
  }, [])

  const handleLoadSample = useCallback(() => {
    setRawText(SAMPLE_ENV)
    setEntries(parseEnv(SAMPLE_ENV))
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setRawText(text)
      setEntries(parseEnv(text))
      if (viewMode === 'table') setViewMode('table')
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [viewMode])

  const addEntry = useCallback(() => {
    setEntries(prev => [...prev, { id: genId(), type: 'variable', key: '', value: '', comment: '', rawComment: '' }])
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateEntry = useCallback((id: string, field: keyof EnvEntry, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
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
    } catch { /* ignore */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // Compute stats and validation
  const currentEntries = viewMode === 'raw' ? parseEnv(rawText) : entries
  const varEntries = currentEntries.filter(e => e.type === 'variable')
  const commentEntries = currentEntries.filter(e => e.type === 'comment')
  const emptyEntries = currentEntries.filter(e => e.type === 'empty')
  const duplicateKeys = getDuplicateKeys(currentEntries)
  const invalidKeys = varEntries.filter(e => e.key && isInvalidKey(e.key)).map(e => e.key)
  const emptyValueKeys = varEntries.filter(e => e.key && e.value === '').map(e => e.key)

  const exportOutput = getExportOutput(currentEntries, exportFormat)

  const formatTabs: { id: ExportFormat; label: string }[] = [
    { id: 'env', label: t('envFormat') },
    { id: 'docker', label: t('dockerFormat') },
    { id: 'yaml', label: t('yamlFormat') },
    { id: 'json', label: t('jsonFormat') },
    { id: 'shell', label: t('shellFormat') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button
                onClick={switchToRaw}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <FileText size={14} />
                {t('rawMode')}
              </button>
              <button
                onClick={switchToTable}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Table size={14} />
                {t('tableMode')}
              </button>
            </div>
            {/* Import file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Upload size={14} />
              {t('importFile')}
            </button>
            <input ref={fileInputRef} type="file" accept=".env,.txt" className="hidden" onChange={handleFileUpload} />
            {/* Sample */}
            <button
              onClick={handleLoadSample}
              className="px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {t('sample')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Editor area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Raw mode */}
          {viewMode === 'raw' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <textarea
                value={rawText}
                onChange={e => handleRawChange(e.target.value)}
                className="w-full h-96 font-mono text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="KEY=value"
                spellCheck={false}
              />
            </div>
          )}

          {/* Table mode */}
          {viewMode === 'table' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <div className="col-span-4">{t('key')}</div>
                  <div className="col-span-4">{t('value')}</div>
                  <div className="col-span-3">{t('comment')}</div>
                  <div className="col-span-1"></div>
                </div>

                {entries.map(entry => {
                  if (entry.type === 'empty') {
                    return (
                      <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-11 h-4 border-b border-dashed border-gray-200 dark:border-gray-700" />
                        <button onClick={() => deleteEntry(entry.id)} className="col-span-1 text-gray-400 hover:text-red-500 transition-colors flex justify-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  }
                  if (entry.type === 'comment') {
                    return (
                      <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-11">
                          <input
                            type="text"
                            value={entry.rawComment}
                            onChange={e => updateEntry(entry.id, 'rawComment', e.target.value)}
                            className="w-full px-2 py-1.5 font-mono text-sm border border-gray-200 dark:border-gray-600 rounded bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button onClick={() => deleteEntry(entry.id)} className="col-span-1 text-gray-400 hover:text-red-500 transition-colors flex justify-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  }
                  const isDupe = duplicateKeys.has(entry.key)
                  const isInvalid = isInvalidKey(entry.key)
                  return (
                    <div key={entry.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={entry.key}
                          onChange={e => updateEntry(entry.id, 'key', e.target.value)}
                          placeholder="KEY_NAME"
                          className={`w-full px-2 py-1.5 font-mono text-sm border rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            isDupe ? 'border-yellow-400' : isInvalid ? 'border-orange-400' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={entry.value}
                          onChange={e => updateEntry(entry.id, 'value', e.target.value)}
                          placeholder="value"
                          className="w-full px-2 py-1.5 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={entry.comment}
                          onChange={e => updateEntry(entry.id, 'comment', e.target.value)}
                          placeholder="# comment"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      <button onClick={() => deleteEntry(entry.id)} className="col-span-1 text-gray-400 hover:text-red-500 transition-colors flex justify-center">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}

                <button
                  onClick={addEntry}
                  className="flex items-center gap-2 mt-3 px-4 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors w-full justify-center"
                >
                  <Plus size={14} />
                  {t('addVariable')}
                </button>
              </div>
            </div>
          )}

          {/* Export section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('export')}</h2>
              <button
                onClick={() => copyToClipboard(exportOutput, 'export')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {copiedId === 'export' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'export' ? t('copied') : t('copy')}
              </button>
            </div>
            {/* Format tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
              {formatTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setExportFormat(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    exportFormat === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <pre className="w-full h-48 overflow-auto font-mono text-xs p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 whitespace-pre">
              {exportOutput}
            </pre>
          </div>
        </div>

        {/* Sidebar: stats + validation */}
        <div className="space-y-4">
          {/* Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('statistics')}</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('variables')}</span>
                <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{varEntries.filter(e => e.key).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('comments')}</span>
                <span className="font-mono font-medium text-green-600 dark:text-green-400">{commentEntries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('emptyLines')}</span>
                <span className="font-mono font-medium text-gray-500 dark:text-gray-400">{emptyEntries.length}</span>
              </div>
            </div>
          </div>

          {/* Validation */}
          {(duplicateKeys.size > 0 || invalidKeys.length > 0 || emptyValueKeys.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                Warnings
              </h2>
              <div className="space-y-2">
                {Array.from(duplicateKeys).map(key => (
                  <div key={`dupe-${key}`} className="flex items-start gap-2">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded shrink-0">
                      {t('duplicate')}
                    </span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{key}</span>
                  </div>
                ))}
                {invalidKeys.map(key => (
                  <div key={`inv-${key}`} className="flex items-start gap-2">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded shrink-0">
                      {t('invalidKey')}
                    </span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{key}</span>
                  </div>
                ))}
                {emptyValueKeys.slice(0, 3).map(key => (
                  <div key={`empty-${key}`} className="flex items-start gap-2">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded shrink-0">
                      {t('emptyValue')}
                    </span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{key}</span>
                  </div>
                ))}
                {emptyValueKeys.length > 3 && (
                  <p className="text-xs text-gray-400">+{emptyValueKeys.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {/* Guide */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('guide.title')}</h2>
            <ul className="space-y-1.5">
              {(t.raw('guide.format.items') as string[]).map((item, i) => (
                <li key={i} className="text-xs text-blue-700 dark:text-blue-300 flex gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <ul className="space-y-1.5">
                {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                  <li key={i} className="text-xs text-blue-700 dark:text-blue-300 flex gap-1.5">
                    <span className="shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
