'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeftRight,
  Copy,
  Check,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Settings,
  BookOpen,
  FileText,
} from 'lucide-react'
import yaml from 'js-yaml'

type Direction = 'yaml-to-json' | 'json-to-yaml'

interface ConvertResult {
  output: string
  error: string | null
}

function tryConvert(input: string, direction: Direction, indent: number, sortKeys: boolean, flowLevel: number): ConvertResult {
  if (!input.trim()) return { output: '', error: null }

  try {
    if (direction === 'yaml-to-json') {
      const parsed = yaml.load(input)
      const replacer = sortKeys
        ? (_key: string, value: unknown) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              return Object.keys(value as Record<string, unknown>)
                .sort()
                .reduce<Record<string, unknown>>((sorted, k) => {
                  sorted[k] = (value as Record<string, unknown>)[k]
                  return sorted
                }, {})
            }
            return value
          }
        : undefined
      return { output: JSON.stringify(parsed, replacer, indent), error: null }
    } else {
      const parsed = JSON.parse(input)
      return {
        output: yaml.dump(parsed, {
          indent,
          sortKeys,
          flowLevel: flowLevel === -1 ? -1 : flowLevel,
          lineWidth: 120,
          noRefs: true,
          quotingType: '"',
          forceQuotes: false,
        }),
        error: null,
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { output: '', error: msg }
  }
}

// 샘플 데이터
const SAMPLE_YAML = `# Kubernetes Deployment 예시
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web
    version: "1.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            limits:
              cpu: "500m"
              memory: "128Mi"
          env:
            - name: NODE_ENV
              value: production
`

const SAMPLE_JSON = `{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "web-app",
    "labels": {
      "app": "web",
      "version": "1.0"
    }
  },
  "spec": {
    "replicas": 3,
    "selector": {
      "matchLabels": {
        "app": "web"
      }
    },
    "template": {
      "metadata": {
        "labels": {
          "app": "web"
        }
      },
      "spec": {
        "containers": [
          {
            "name": "nginx",
            "image": "nginx:1.25",
            "ports": [
              {
                "containerPort": 80
              }
            ]
          }
        ]
      }
    }
  }
}`

export default function YamlJsonConverter() {
  const t = useTranslations('yamlJsonConverter')

  const [direction, setDirection] = useState<Direction>('yaml-to-json')
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [flowLevel, setFlowLevel] = useState(-1) // -1 = block style
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const result = tryConvert(input, direction, indent, sortKeys, flowLevel)

  const switchDirection = useCallback(() => {
    setDirection(prev => {
      const newDir = prev === 'yaml-to-json' ? 'json-to-yaml' : 'yaml-to-json'
      // output을 새 input으로 전환
      if (result.output) {
        setInput(result.output)
      }
      return newDir as Direction
    })
  }, [result.output])

  const loadSample = useCallback(() => {
    setInput(direction === 'yaml-to-json' ? SAMPLE_YAML : SAMPLE_JSON)
  }, [direction])

  const clearAll = useCallback(() => {
    setInput('')
  }, [])

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

  const downloadOutput = useCallback(() => {
    if (!result.output) return
    const ext = direction === 'yaml-to-json' ? 'json' : 'yaml'
    const mime = direction === 'yaml-to-json' ? 'application/json' : 'text/yaml'
    const blob = new Blob([result.output], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `converted.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [result.output, direction])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setInput(text)
        // 파일 확장자로 방향 자동 감지
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (ext === 'json') {
          setDirection('json-to-yaml')
        } else if (ext === 'yaml' || ext === 'yml') {
          setDirection('yaml-to-json')
        }
      }
    }
    reader.readAsText(file)
    e.target.value = '' // 같은 파일 재선택 가능하도록
  }, [])

  const inputLabel = direction === 'yaml-to-json' ? 'YAML' : 'JSON'
  const outputLabel = direction === 'yaml-to-json' ? 'JSON' : 'YAML'
  const lineCount = input.split('\n').length

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
      </div>

      {/* 방향 선택 + 옵션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 방향 토글 */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => { setDirection('yaml-to-json'); setInput('') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${direction === 'yaml-to-json' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
            >
              YAML → JSON
            </button>
            <button
              onClick={switchDirection}
              className="px-2 py-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label={t('switchDirection')}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setDirection('json-to-yaml'); setInput('') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${direction === 'json-to-yaml' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
            >
              JSON → YAML
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={loadSample}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {t('loadSample')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t('uploadFile')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${showOptions ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              aria-expanded={showOptions}
            >
              <Settings className="w-4 h-4" />
              {t('options')}
            </button>
          </div>
        </div>

        {/* 옵션 패널 */}
        {showOptions && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('indent')}</label>
              <select
                value={indent}
                onChange={e => setIndent(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>2 {t('spaces')}</option>
                <option value={4}>4 {t('spaces')}</option>
                <option value={8}>8 {t('spaces')}</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sortKeys}
                  onChange={e => setSortKeys(e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('sortKeys')}</span>
              </label>
            </div>
            {direction === 'json-to-yaml' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('flowLevel')}</label>
                <select
                  value={flowLevel}
                  onChange={e => setFlowLevel(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value={-1}>{t('blockStyle')}</option>
                  <option value={0}>{t('flowStyle')}</option>
                  <option value={1}>{t('flowLevel1')}</option>
                  <option value={2}>{t('flowLevel2')}</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 입력/출력 영역 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* 입력 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{inputLabel}</span>
              {input && (
                <span className="text-xs text-gray-400">{lineCount} {t('lines')}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {input && (
                <>
                  <button
                    onClick={() => copyToClipboard(input, 'input')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={t('copy')}
                  >
                    {copiedId === 'input' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={t('clear')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={direction === 'yaml-to-json' ? t('yamlPlaceholder') : t('jsonPlaceholder')}
            className="w-full h-96 px-4 py-3 font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
            aria-label={`${inputLabel} input`}
          />
        </div>

        {/* 출력 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{outputLabel}</span>
              {result.output && (
                <span className="text-xs text-gray-400">{result.output.split('\n').length} {t('lines')}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {result.output && (
                <>
                  <button
                    onClick={() => copyToClipboard(result.output, 'output')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={t('copy')}
                  >
                    {copiedId === 'output' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={downloadOutput}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={t('download')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="relative h-96 overflow-auto">
            {result.error ? (
              <div className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('conversionError')}</p>
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-mono whitespace-pre-wrap">{result.error}</p>
                </div>
              </div>
            ) : result.output ? (
              <pre className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100 whitespace-pre overflow-x-auto">{result.output}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                {t('outputPlaceholder')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 상태 바 */}
      {input.trim() && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${result.error ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'}`}
        >
          {result.error ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          <span>{result.error ? t('invalidInput') : t('validInput')}</span>
          {!result.error && result.output && (
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {new Blob([result.output]).size.toLocaleString('ko-KR')} bytes
            </span>
          )}
        </div>
      )}

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.features.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.features.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.useCases.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.useCases.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.yamlTips.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.yamlTips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
