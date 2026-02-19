'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  ChevronDown,
  AlertTriangle,
  X,
  RotateCcw,
  Code,
  Eye,
  FileText,
  History,
  Settings,
  Globe,
  Loader2,
} from 'lucide-react'

// ── Types ──

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
type RequestTab = 'params' | 'headers' | 'body' | 'auth'
type ResponseTab = 'body' | 'headers' | 'codeGen'
type ResponseViewMode = 'pretty' | 'raw' | 'preview'
type AuthType = 'none' | 'basic' | 'bearer'
type CodeGenLang = 'curl' | 'fetch' | 'axios'

interface KeyValuePair {
  id: string
  key: string
  value: string
  enabled: boolean
}

interface AuthConfig {
  type: AuthType
  basicUsername: string
  basicPassword: string
  bearerToken: string
}

interface EnvVariable {
  id: string
  key: string
  value: string
}

interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
}

interface HistoryEntry {
  id: string
  method: HttpMethod
  url: string
  status: number
  time: number
  timestamp: number
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: string
  auth: AuthConfig
}

// ── Constants ──

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PUT: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  PATCH: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  HEAD: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  OPTIONS: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const MAX_HISTORY = 20
const HISTORY_KEY = 'api-tester-history'
const ENV_KEY = 'api-tester-env'

// ── Helpers ──

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function createEmptyPair(): KeyValuePair {
  return { id: generateId(), key: '', value: '', enabled: true }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
  if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
  if (status >= 500) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

function tryPrettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function isJsonResponse(headers: Record<string, string>): boolean {
  const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')
  return ct ? ct[1].toLowerCase().includes('json') : false
}

function isHtmlResponse(headers: Record<string, string>): boolean {
  const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')
  return ct ? ct[1].toLowerCase().includes('html') : false
}

function replaceEnvVars(text: string, envVars: EnvVariable[]): string {
  let result = text
  for (const v of envVars) {
    if (v.key) {
      result = result.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.value)
    }
  }
  return result
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* ignore quota errors */ }
}

// ── Component ──

export default function ApiTester() {
  const t = useTranslations('apiTester')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Request state ──
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [requestTab, setRequestTab] = useState<RequestTab>('params')
  const [params, setParams] = useState<KeyValuePair[]>([createEmptyPair()])
  const [headers, setHeaders] = useState<KeyValuePair[]>([createEmptyPair()])
  const [body, setBody] = useState('')
  const [bodyError, setBodyError] = useState<string | null>(null)
  const [auth, setAuth] = useState<AuthConfig>({
    type: 'none',
    basicUsername: '',
    basicPassword: '',
    bearerToken: '',
  })

  // ── Response state ──
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [responseTab, setResponseTab] = useState<ResponseTab>('body')
  const [responseViewMode, setResponseViewMode] = useState<ResponseViewMode>('pretty')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corsError, setCorsError] = useState(false)

  // ── History & env ──
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [envVars, setEnvVars] = useState<EnvVariable[]>([])
  const [showEnv, setShowEnv] = useState(false)
  const [codeGenLang, setCodeGenLang] = useState<CodeGenLang>('curl')
  const [showMethodDropdown, setShowMethodDropdown] = useState(false)
  const [responseHeadersOpen, setResponseHeadersOpen] = useState(false)

  // ── Load history and env from localStorage ──
  useEffect(() => {
    setHistory(loadFromStorage<HistoryEntry[]>(HISTORY_KEY, []))
    setEnvVars(loadFromStorage<EnvVariable[]>(ENV_KEY, []))
  }, [])

  // ── Clipboard ──
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
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  // ── Key-value pair helpers ──
  const updatePair = useCallback((
    setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>,
    id: string,
    field: 'key' | 'value' | 'enabled',
    val: string | boolean
  ) => {
    setter(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
  }, [])

  const removePair = useCallback((
    setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>,
    id: string
  ) => {
    setter(prev => {
      const next = prev.filter(p => p.id !== id)
      return next.length === 0 ? [createEmptyPair()] : next
    })
  }, [])

  const addPair = useCallback((setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>) => {
    setter(prev => [...prev, createEmptyPair()])
  }, [])

  // ── Validate JSON body ──
  const validateBody = useCallback((text: string) => {
    setBody(text)
    if (!text.trim()) {
      setBodyError(null)
      return
    }
    try {
      JSON.parse(text)
      setBodyError(null)
    } catch (e) {
      setBodyError(e instanceof Error ? e.message : t('bodyInvalid'))
    }
  }, [t])

  // ── Build final URL with params ──
  const buildUrl = useCallback((): string => {
    let finalUrl = replaceEnvVars(url, envVars)
    const enabledParams = params.filter(p => p.enabled && p.key)
    if (enabledParams.length > 0) {
      try {
        const urlObj = new URL(finalUrl)
        enabledParams.forEach(p => {
          urlObj.searchParams.set(
            replaceEnvVars(p.key, envVars),
            replaceEnvVars(p.value, envVars)
          )
        })
        finalUrl = urlObj.toString()
      } catch {
        const qs = enabledParams
          .map(p => `${encodeURIComponent(replaceEnvVars(p.key, envVars))}=${encodeURIComponent(replaceEnvVars(p.value, envVars))}`)
          .join('&')
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs
      }
    }
    return finalUrl
  }, [url, params, envVars])

  // ── Build headers object ──
  const buildHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {}
    headers.filter(p => p.enabled && p.key).forEach(p => {
      h[replaceEnvVars(p.key, envVars)] = replaceEnvVars(p.value, envVars)
    })
    // Auth headers
    if (auth.type === 'basic') {
      const cred = btoa(`${replaceEnvVars(auth.basicUsername, envVars)}:${replaceEnvVars(auth.basicPassword, envVars)}`)
      h['Authorization'] = `Basic ${cred}`
    } else if (auth.type === 'bearer') {
      h['Authorization'] = `Bearer ${replaceEnvVars(auth.bearerToken, envVars)}`
    }
    // Content-Type for body
    if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim() && !h['Content-Type']) {
      h['Content-Type'] = 'application/json'
    }
    return h
  }, [headers, auth, method, body, envVars])

  // ── Send request ──
  const sendRequest = useCallback(async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setCorsError(false)
    setResponse(null)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const finalUrl = buildUrl()
    const finalHeaders = buildHeaders()
    const finalBody = ['POST', 'PUT', 'PATCH'].includes(method) && body.trim()
      ? replaceEnvVars(body, envVars)
      : undefined

    const startTime = performance.now()

    try {
      const res = await fetch(finalUrl, {
        method,
        headers: finalHeaders,
        body: finalBody,
        signal: controller.signal,
      })

      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)
      const responseBody = await res.text()
      const responseSize = new Blob([responseBody]).size

      const resHeaders: Record<string, string> = {}
      res.headers.forEach((val, key) => {
        resHeaders[key] = val
      })

      const responseData: ResponseData = {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: responseBody,
        time: responseTime,
        size: responseSize,
      }
      setResponse(responseData)
      setResponseTab('body')

      // Auto pretty-print JSON
      if (isJsonResponse(resHeaders)) {
        setResponseViewMode('pretty')
      }

      // Save to history
      const entry: HistoryEntry = {
        id: generateId(),
        method,
        url: finalUrl,
        status: res.status,
        time: responseTime,
        timestamp: Date.now(),
        headers: headers.filter(h => h.key),
        params: params.filter(p => p.key),
        body,
        auth,
      }
      setHistory(prev => {
        const next = [entry, ...prev].slice(0, MAX_HISTORY)
        saveToStorage(HISTORY_KEY, next)
        return next
      })
    } catch (err) {
      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)

      if (err instanceof DOMException && err.name === 'AbortError') {
        setError(t('requestCancelled'))
      } else {
        // Likely a CORS or network error
        const msg = err instanceof Error ? err.message : t('unknownError')
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS') || msg.includes('TypeError')) {
          setCorsError(true)
          setError(t('corsError'))
        } else {
          setError(msg)
        }
      }

      // Still add to history with status 0
      const entry: HistoryEntry = {
        id: generateId(),
        method,
        url: finalUrl,
        status: 0,
        time: responseTime,
        timestamp: Date.now(),
        headers: headers.filter(h => h.key),
        params: params.filter(p => p.key),
        body,
        auth,
      }
      setHistory(prev => {
        const next = [entry, ...prev].slice(0, MAX_HISTORY)
        saveToStorage(HISTORY_KEY, next)
        return next
      })
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [url, method, body, buildUrl, buildHeaders, headers, params, auth, envVars, t])

  // ── Cancel request ──
  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  // ── Load from history ──
  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    setMethod(entry.method)
    // Extract base URL (without query params from params)
    try {
      const urlObj = new URL(entry.url)
      urlObj.search = ''
      setUrl(urlObj.toString())
    } catch {
      setUrl(entry.url)
    }
    setHeaders(entry.headers.length > 0 ? entry.headers : [createEmptyPair()])
    setParams(entry.params.length > 0 ? entry.params : [createEmptyPair()])
    setBody(entry.body)
    setAuth(entry.auth)
    setShowHistory(false)
  }, [])

  // ── Clear history ──
  const clearHistory = useCallback(() => {
    setHistory([])
    saveToStorage(HISTORY_KEY, [])
  }, [])

  // ── Env vars ──
  const addEnvVar = useCallback(() => {
    setEnvVars(prev => {
      const next = [...prev, { id: generateId(), key: '', value: '' }]
      saveToStorage(ENV_KEY, next)
      return next
    })
  }, [])

  const updateEnvVar = useCallback((id: string, field: 'key' | 'value', val: string) => {
    setEnvVars(prev => {
      const next = prev.map(v => v.id === id ? { ...v, [field]: val } : v)
      saveToStorage(ENV_KEY, next)
      return next
    })
  }, [])

  const removeEnvVar = useCallback((id: string) => {
    setEnvVars(prev => {
      const next = prev.filter(v => v.id !== id)
      saveToStorage(ENV_KEY, next)
      return next
    })
  }, [])

  // ── Code generation ──
  const generateCode = useCallback((): string => {
    const finalUrl = buildUrl()
    const finalHeaders = buildHeaders()
    const finalBody = ['POST', 'PUT', 'PATCH'].includes(method) && body.trim()
      ? replaceEnvVars(body, envVars)
      : undefined

    if (codeGenLang === 'curl') {
      let cmd = `curl -X ${method} '${finalUrl}'`
      Object.entries(finalHeaders).forEach(([k, v]) => {
        cmd += ` \\\n  -H '${k}: ${v}'`
      })
      if (finalBody) {
        cmd += ` \\\n  -d '${finalBody}'`
      }
      return cmd
    }

    if (codeGenLang === 'fetch') {
      const opts: Record<string, unknown> = { method }
      if (Object.keys(finalHeaders).length > 0) opts.headers = finalHeaders
      if (finalBody) opts.body = finalBody
      return `fetch('${finalUrl}', ${JSON.stringify(opts, null, 2)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
    }

    // axios
    const axiosOpts: Record<string, unknown> = {
      method: method.toLowerCase(),
      url: finalUrl,
    }
    if (Object.keys(finalHeaders).length > 0) axiosOpts.headers = finalHeaders
    if (finalBody) {
      try {
        axiosOpts.data = JSON.parse(finalBody)
      } catch {
        axiosOpts.data = finalBody
      }
    }
    return `axios(${JSON.stringify(axiosOpts, null, 2)})
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`
  }, [buildUrl, buildHeaders, method, body, envVars, codeGenLang])

  // ── Reset all ──
  const resetAll = useCallback(() => {
    setMethod('GET')
    setUrl('')
    setParams([createEmptyPair()])
    setHeaders([createEmptyPair()])
    setBody('')
    setBodyError(null)
    setAuth({ type: 'none', basicUsername: '', basicPassword: '', bearerToken: '' })
    setResponse(null)
    setError(null)
    setCorsError(false)
  }, [])

  // ── KeyValue editor component ──
  const renderKeyValueEditor = (
    pairs: KeyValuePair[],
    setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>,
    keyPlaceholder: string,
    valuePlaceholder: string,
  ) => (
    <div className="space-y-2">
      {pairs.map((pair) => (
        <div key={pair.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(setter, pair.id, 'enabled', e.target.checked)}
            className="accent-blue-600 shrink-0"
          />
          <input
            type="text"
            value={pair.key}
            onChange={(e) => updatePair(setter, pair.id, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            type="text"
            value={pair.value}
            onChange={(e) => updatePair(setter, pair.id, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={() => removePair(setter, pair.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
            title={t('remove')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => addPair(setter)}
        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        <Plus size={14} />
        {t('addRow')}
      </button>
    </div>
  )

  // ── Request tabs config ──
  const requestTabs: { key: RequestTab; label: string }[] = [
    { key: 'params', label: t('tabs.params') },
    { key: 'headers', label: t('tabs.headers') },
    { key: 'body', label: t('tabs.body') },
    { key: 'auth', label: t('tabs.auth') },
  ]

  const responseTabs: { key: ResponseTab; label: string }[] = [
    { key: 'body', label: t('tabs.responseBody') },
    { key: 'headers', label: t('tabs.responseHeaders') },
    { key: 'codeGen', label: t('tabs.codeGen') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEnv(!showEnv)}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            title={t('envVars')}
          >
            <Settings size={14} />
            <span className="hidden sm:inline">{t('envVars')}</span>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            title={t('history')}
          >
            <History size={14} />
            <span className="hidden sm:inline">{t('history')}</span>
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full">
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            title={t('reset')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Environment Variables Panel */}
      {showEnv && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings size={16} />
              {t('envVars')}
            </h3>
            <button onClick={() => setShowEnv(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('envVarsHint')}</p>
          <div className="space-y-2">
            {envVars.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={v.key}
                  onChange={(e) => updateEnvVar(v.id, 'key', e.target.value)}
                  placeholder={t('envKeyPlaceholder')}
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  value={v.value}
                  onChange={(e) => updateEnvVar(v.id, 'value', e.target.value)}
                  placeholder={t('envValuePlaceholder')}
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <button
                  onClick={() => removeEnvVar(v.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addEnvVar}
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Plus size={14} />
              {t('addEnvVar')}
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <History size={16} />
              {t('history')}
            </h3>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  {t('clearHistory')}
                </button>
              )}
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={16} />
              </button>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('noHistory')}</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => loadHistoryEntry(entry)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${METHOD_COLORS[entry.method]}`}>
                    {entry.method}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate font-mono">
                    {entry.url}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded ${entry.status > 0 ? getStatusColor(entry.status) : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                    {entry.status > 0 ? entry.status : 'ERR'}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {entry.time}ms
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* URL Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2">
          {/* Method selector */}
          <div className="relative">
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              className={`flex items-center gap-1 px-3 py-2.5 text-sm font-bold rounded-lg border border-gray-300 dark:border-gray-600 ${METHOD_COLORS[method]} min-w-[90px] justify-center`}
            >
              {method}
              <ChevronDown size={14} />
            </button>
            {showMethodDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[100px]">
                {HTTP_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMethod(m); setShowMethodDropdown(false) }}
                    className={`w-full px-3 py-2 text-sm font-bold text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${method === m ? 'bg-gray-50 dark:bg-gray-700' : ''} ${METHOD_COLORS[m]} first:rounded-t-lg last:rounded-b-lg`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* URL input */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) sendRequest() }}
            placeholder={t('urlPlaceholder')}
            className="flex-1 min-w-0 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
          />

          {/* Send / Cancel button */}
          {loading ? (
            <button
              onClick={cancelRequest}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm whitespace-nowrap"
            >
              <X size={16} />
              {t('cancel')}
            </button>
          ) : (
            <button
              onClick={sendRequest}
              disabled={!url.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm whitespace-nowrap"
            >
              <Send size={16} />
              {t('send')}
            </button>
          )}
        </div>
      </div>

      {/* Close method dropdown on click outside */}
      {showMethodDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMethodDropdown(false)} />
      )}

      {/* Main content area */}
      <div className="grid lg:grid-cols-1 gap-6">
        {/* Request section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Request tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
            {requestTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRequestTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  requestTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Params tab */}
            {requestTab === 'params' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('paramsHint')}</p>
                {renderKeyValueEditor(params, setParams, t('keyPlaceholder'), t('valuePlaceholder'))}
              </div>
            )}

            {/* Headers tab */}
            {requestTab === 'headers' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('headersHint')}</p>
                {renderKeyValueEditor(headers, setHeaders, t('headerKeyPlaceholder'), t('headerValuePlaceholder'))}
              </div>
            )}

            {/* Body tab */}
            {requestTab === 'body' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('bodyHint')}</p>
                  {bodyError && (
                    <span className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {bodyError}
                    </span>
                  )}
                </div>
                <textarea
                  value={body}
                  onChange={(e) => validateBody(e.target.value)}
                  placeholder={t('bodyPlaceholder')}
                  rows={8}
                  className={`w-full px-4 py-3 text-sm font-mono border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y ${
                    bodyError
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
            )}

            {/* Auth tab */}
            {requestTab === 'auth' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('authType')}</label>
                  <select
                    value={auth.type}
                    onChange={(e) => setAuth(prev => ({ ...prev, type: e.target.value as AuthType }))}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="none">{t('authNone')}</option>
                    <option value="basic">{t('authBasic')}</option>
                    <option value="bearer">{t('authBearer')}</option>
                  </select>
                </div>

                {auth.type === 'basic' && (
                  <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('username')}</label>
                      <input
                        type="text"
                        value={auth.basicUsername}
                        onChange={(e) => setAuth(prev => ({ ...prev, basicUsername: e.target.value }))}
                        placeholder={t('usernamePlaceholder')}
                        className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('password')}</label>
                      <input
                        type="password"
                        value={auth.basicPassword}
                        onChange={(e) => setAuth(prev => ({ ...prev, basicPassword: e.target.value }))}
                        placeholder={t('passwordPlaceholder')}
                        className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {auth.type === 'bearer' && (
                  <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('bearerToken')}</label>
                    <input
                      type="text"
                      value={auth.bearerToken}
                      onChange={(e) => setAuth(prev => ({ ...prev, bearerToken: e.target.value }))}
                      placeholder={t('bearerTokenPlaceholder')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Response section */}
        {(response || loading || error) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Status bar */}
            {loading && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-950">
                <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">{t('sending')}</span>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
                {corsError && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
                    <p>{t('corsExplanation')}</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      {(t.raw('corsSuggestions') as string[]).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {response && !loading && (
              <>
                {/* Status + meta */}
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className={`px-3 py-1 text-sm font-bold rounded-lg ${getStatusColor(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Clock size={14} />
                    {response.time}ms
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <FileText size={14} />
                    {formatBytes(response.size)}
                  </div>
                </div>

                {/* Response tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
                  {responseTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setResponseTab(tab.key)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        responseTab === tab.key
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {/* Response Body */}
                  {responseTab === 'body' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setResponseViewMode('pretty')}
                            className={`px-3 py-1 text-xs rounded-lg ${responseViewMode === 'pretty' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            <Eye size={12} className="inline mr-1" />
                            {t('prettyView')}
                          </button>
                          <button
                            onClick={() => setResponseViewMode('raw')}
                            className={`px-3 py-1 text-xs rounded-lg ${responseViewMode === 'raw' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            <Code size={12} className="inline mr-1" />
                            {t('rawView')}
                          </button>
                          {isHtmlResponse(response.headers) && (
                            <button
                              onClick={() => setResponseViewMode('preview')}
                              className={`px-3 py-1 text-xs rounded-lg ${responseViewMode === 'preview' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              <Globe size={12} className="inline mr-1" />
                              {t('previewView')}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(response.body, 'response-body')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
                        >
                          {copiedId === 'response-body' ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === 'response-body' ? t('copied') : t('copy')}
                        </button>
                      </div>
                      {responseViewMode === 'preview' && isHtmlResponse(response.headers) ? (
                        <iframe
                          srcDoc={response.body}
                          className="w-full h-96 border border-gray-300 dark:border-gray-600 rounded-lg bg-white"
                          sandbox="allow-same-origin"
                          title={t('htmlPreview')}
                        />
                      ) : (
                        <pre className="w-full p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-words border border-gray-200 dark:border-gray-700">
                          {responseViewMode === 'pretty' ? tryPrettyJson(response.body) : response.body}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Response Headers */}
                  {responseTab === 'headers' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('headerName')}</th>
                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('headerValue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(response.headers).map(([k, v]) => (
                            <tr key={k} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400">{k}</td>
                              <td className="py-2 px-3 font-mono text-gray-700 dark:text-gray-300 break-all">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Code Generation */}
                  {responseTab === 'codeGen' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          {(['curl', 'fetch', 'axios'] as CodeGenLang[]).map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setCodeGenLang(lang)}
                              className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                                codeGenLang === lang
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => copyToClipboard(generateCode(), 'code-gen')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
                        >
                          {copiedId === 'code-gen' ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === 'code-gen' ? t('copied') : t('copy')}
                        </button>
                      </div>
                      <pre className="w-full p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg overflow-x-auto whitespace-pre-wrap break-words border border-gray-200 dark:border-gray-700">
                        {generateCode()}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Code Gen - also available before sending */}
        {!response && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Code size={16} />
                {t('tabs.codeGen')}
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  {(['curl', 'fetch', 'axios'] as CodeGenLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeGenLang(lang)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                        codeGenLang === lang
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => copyToClipboard(generateCode(), 'code-gen-pre')}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  {copiedId === 'code-gen-pre' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === 'code-gen-pre' ? t('copied') : t('copy')}
                </button>
              </div>
              <pre className="w-full p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg overflow-x-auto whitespace-pre-wrap break-words border border-gray-200 dark:border-gray-700">
                {generateCode()}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.features.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.features.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5 shrink-0">*</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 mt-0.5 shrink-0">*</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.cors.title')}</h3>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('guide.cors.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
