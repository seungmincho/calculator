'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Upload, Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

// ── 모델 데이터 ──
interface LlmModel {
  id: string
  name: string
  provider: string
  contextWindow: number
  inputPricePer1M: number   // USD per 1M input tokens
  outputPricePer1M: number  // USD per 1M output tokens
  // 토큰 추정 계수: 한국어 글자당 토큰, 영어 글자당 토큰
  koreanCharPerToken: number
  englishCharPerToken: number
}

const MODELS: LlmModel[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128000, inputPricePer1M: 2.50, outputPricePer1M: 10.00, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', contextWindow: 128000, inputPricePer1M: 0.15, outputPricePer1M: 0.60, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', contextWindow: 1047576, inputPricePer1M: 2.00, outputPricePer1M: 8.00, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', provider: 'OpenAI', contextWindow: 1047576, inputPricePer1M: 0.40, outputPricePer1M: 1.60, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 nano', provider: 'OpenAI', contextWindow: 1047576, inputPricePer1M: 0.10, outputPricePer1M: 0.40, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'o1', name: 'o1', provider: 'OpenAI', contextWindow: 200000, inputPricePer1M: 15.00, outputPricePer1M: 60.00, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'o3', name: 'o3', provider: 'OpenAI', contextWindow: 200000, inputPricePer1M: 2.00, outputPricePer1M: 8.00, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'o3-mini', name: 'o3 mini', provider: 'OpenAI', contextWindow: 200000, inputPricePer1M: 1.10, outputPricePer1M: 4.40, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  { id: 'o4-mini', name: 'o4-mini', provider: 'OpenAI', contextWindow: 200000, inputPricePer1M: 1.10, outputPricePer1M: 4.40, koreanCharPerToken: 0.7, englishCharPerToken: 4.0 },
  // Anthropic
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', contextWindow: 200000, inputPricePer1M: 15.00, outputPricePer1M: 75.00, koreanCharPerToken: 1.2, englishCharPerToken: 4.0 },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', contextWindow: 200000, inputPricePer1M: 3.00, outputPricePer1M: 15.00, koreanCharPerToken: 1.2, englishCharPerToken: 4.0 },
  { id: 'claude-haiku-3.5', name: 'Claude 3.5 Haiku', provider: 'Anthropic', contextWindow: 200000, inputPricePer1M: 0.80, outputPricePer1M: 4.00, koreanCharPerToken: 1.2, englishCharPerToken: 4.0 },
  // Google
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', contextWindow: 1048576, inputPricePer1M: 1.25, outputPricePer1M: 10.00, koreanCharPerToken: 1.0, englishCharPerToken: 4.0 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', contextWindow: 1048576, inputPricePer1M: 0.15, outputPricePer1M: 0.60, koreanCharPerToken: 1.0, englishCharPerToken: 4.0 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', contextWindow: 1048576, inputPricePer1M: 0.10, outputPricePer1M: 0.40, koreanCharPerToken: 1.0, englishCharPerToken: 4.0 },
  // Meta
  { id: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', contextWindow: 1048576, inputPricePer1M: 0.20, outputPricePer1M: 0.60, koreanCharPerToken: 0.8, englishCharPerToken: 4.0 },
  { id: 'llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', contextWindow: 10485760, inputPricePer1M: 0.15, outputPricePer1M: 0.40, koreanCharPerToken: 0.8, englishCharPerToken: 4.0 },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Meta', contextWindow: 128000, inputPricePer1M: 0.18, outputPricePer1M: 0.40, koreanCharPerToken: 0.8, englishCharPerToken: 4.0 },
]

const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Meta'] as const

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  Google: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Meta: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

// ── 한국어/영어 비율 분석 ──
function analyzeText(text: string) {
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/g
  const koreanChars = (text.match(koreanRegex) || []).length
  const totalChars = text.replace(/\s/g, '').length
  const englishChars = totalChars - koreanChars
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0

  const words = text.trim().split(/\s+/).filter(Boolean).length
  const lines = text.split('\n').length

  return { koreanChars, englishChars, totalChars, koreanRatio, words, lines, charCount: text.length }
}

// ── 토큰 수 추정 ──
function estimateTokens(text: string, model: LlmModel): number {
  if (!text) return 0
  const { koreanChars, englishChars } = analyzeText(text)
  const koreanTokens = koreanChars / model.koreanCharPerToken
  const englishTokens = englishChars / model.englishCharPerToken
  // 공백/줄바꿈 등도 토큰으로 처리
  const whitespaceChars = text.length - text.replace(/\s/g, '').length
  const whitespaceTokens = whitespaceChars / 4
  return Math.ceil(koreanTokens + englishTokens + whitespaceTokens)
}

// ── 비용 계산 ──
function calculateCost(inputTokens: number, outputTokens: number, model: LlmModel) {
  const inputCostUSD = (inputTokens / 1_000_000) * model.inputPricePer1M
  const outputCostUSD = (outputTokens / 1_000_000) * model.outputPricePer1M
  return { inputCostUSD, outputCostUSD, totalCostUSD: inputCostUSD + outputCostUSD }
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function formatContext(n: number): string {
  if (n >= 10_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000).toFixed(0)}K`
}

function formatUSD(n: number): string {
  if (n < 0.0001 && n > 0) return '< $0.0001'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(4)}`
}

function formatKRW(usd: number, rate: number): string {
  const krw = usd * rate
  if (krw < 1 && krw > 0) return '< ₩1'
  return `₩${Math.round(krw).toLocaleString()}`
}

export default function LlmTokenCalculator() {
  const t = useTranslations('llmTokenCalculator')
  const [text, setText] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('gpt-4o')
  const [outputTokenCount, setOutputTokenCount] = useState(500)
  const [exchangeRate, setExchangeRate] = useState(1380)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0]

  const textAnalysis = useMemo(() => analyzeText(text), [text])
  const inputTokens = useMemo(() => estimateTokens(text, selectedModel), [text, selectedModel])
  const cost = useMemo(
    () => calculateCost(inputTokens, outputTokenCount, selectedModel),
    [inputTokens, outputTokenCount, selectedModel]
  )

  // 모델별 비교 데이터
  const comparisonData = useMemo(() => {
    const filtered = filterProvider === 'all' ? MODELS : MODELS.filter(m => m.provider === filterProvider)
    return filtered.map(m => {
      const tokens = estimateTokens(text, m)
      const c = calculateCost(tokens, outputTokenCount, m)
      return { model: m, tokens, cost: c }
    })
  }, [text, outputTokenCount, filterProvider])

  const copyToClipboard = useCallback(async (value: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
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

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) setText(content)
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 왼쪽: 입력 + 설정 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 모델 선택 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('selectedModel')}
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {PROVIDERS.map(provider => (
                <optgroup key={provider} label={provider}>
                  {MODELS.filter(m => m.provider === provider).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* 모델 정보 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>{t('contextWindow')}</span>
                <span className="font-mono">{formatContext(selectedModel.contextWindow)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('inputPrice')}</span>
                <span className="font-mono">${selectedModel.inputPricePer1M.toFixed(2)} {t('perMillionTokens')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('outputPrice')}</span>
                <span className="font-mono">${selectedModel.outputPricePer1M.toFixed(2)} {t('perMillionTokens')}</span>
              </div>
            </div>
          </div>

          {/* 출력 토큰 + 환율 설정 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('outputTokensLabel')}
              </label>
              <input
                type="number"
                value={outputTokenCount}
                onChange={(e) => setOutputTokenCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder={t('outputTokensPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('exchangeRate')} (USD → KRW)
              </label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 결과 카드 */}
          {text.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('estimatedCost')}</h2>

              {/* 토큰 수 */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(inputTokens)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('inputTokens')}</div>
                </div>
              </div>

              {/* 텍스트 통계 */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="font-bold text-gray-900 dark:text-white">{formatNumber(textAnalysis.charCount)}</div>
                  <div className="text-gray-500 dark:text-gray-400">{t('charCount')}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="font-bold text-gray-900 dark:text-white">{formatNumber(textAnalysis.words)}</div>
                  <div className="text-gray-500 dark:text-gray-400">{t('wordCount')}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="font-bold text-gray-900 dark:text-white">{formatNumber(textAnalysis.lines)}</div>
                  <div className="text-gray-500 dark:text-gray-400">{t('lineCount')}</div>
                </div>
              </div>

              {/* 한국어 비율 */}
              {textAnalysis.koreanRatio > 0 && (
                <div className="text-xs">
                  <div className="flex justify-between mb-1 text-gray-600 dark:text-gray-400">
                    <span>한국어 {(textAnalysis.koreanRatio * 100).toFixed(1)}%</span>
                    <span>English {((1 - textAnalysis.koreanRatio) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${textAnalysis.koreanRatio * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">{t('koreanNote')}</p>
                </div>
              )}

              {/* 비용 */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('inputCost')}</span>
                  <span>{formatUSD(cost.inputCostUSD)} ({formatKRW(cost.inputCostUSD, exchangeRate)})</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('outputCost')}</span>
                  <span>{formatUSD(cost.outputCostUSD)} ({formatKRW(cost.outputCostUSD, exchangeRate)})</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span>{t('totalCost')}</span>
                  <span>{formatUSD(cost.totalCostUSD)} ({formatKRW(cost.totalCostUSD, exchangeRate)})</span>
                </div>
              </div>

              {/* 복사 버튼 */}
              <button
                onClick={() => copyToClipboard(
                  `${selectedModel.name}: ${formatNumber(inputTokens)} tokens, ${formatUSD(cost.totalCostUSD)}`,
                  'result'
                )}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
              >
                {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedId === 'result' ? t('copied') : t('copy')}
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 텍스트 입력 + 비교 테이블 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 텍스트 입력 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('inputLabel')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  {t('fileUpload')}
                </button>
                {text && (
                  <button
                    onClick={() => setText('')}
                    className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('clear')}
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.go,.rs,.yaml,.yml,.toml,.log"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="relative"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('inputPlaceholder')}
                rows={16}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
              />
              {!text && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{t('fileUploadDesc')}</p>
                  </div>
                </div>
              )}
            </div>
            {!text && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center">{t('noText')}</p>
            )}
          </div>

          {/* 모델 비교 테이블 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modelComparison')}</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterProvider('all')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filterProvider === 'all'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('allModels')}
                </button>
                {PROVIDERS.map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterProvider(p)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      filterProvider === p
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs">
                    <th className="text-left py-2 pr-2">{t('modelName')}</th>
                    <th className="text-left py-2 pr-2">{t('provider')}</th>
                    <th className="text-right py-2 pr-2">{t('contextWindow')}</th>
                    <th className="text-right py-2 pr-2">{t('inputPrice')}</th>
                    <th className="text-right py-2 pr-2">{t('outputPrice')}</th>
                    {text && <th className="text-right py-2 pr-2">{t('tokenCount')}</th>}
                    {text && <th className="text-right py-2">{t('estCost')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(({ model: m, tokens, cost: c }) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedModelId(m.id)}
                      className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 ${
                        m.id === selectedModelId ? 'bg-blue-50 dark:bg-blue-950' : ''
                      }`}
                    >
                      <td className="py-2 pr-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {m.name}
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${PROVIDER_COLORS[m.provider]}`}>
                          {m.provider}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">
                        {formatContext(m.contextWindow)}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">
                        ${m.inputPricePer1M.toFixed(2)}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono text-gray-600 dark:text-gray-400">
                        ${m.outputPricePer1M.toFixed(2)}
                      </td>
                      {text && (
                        <td className="py-2 pr-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber(tokens)}
                        </td>
                      )}
                      {text && (
                        <td className="py-2 text-right font-mono text-gray-900 dark:text-white whitespace-nowrap">
                          {formatUSD(c.totalCostUSD)}
                          <span className="text-xs text-gray-400 ml-1">({formatKRW(c.totalCostUSD, exchangeRate)})</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {showGuide && (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {(['whatIsToken', 'koreanTokens', 'costTips'] as const).map((section) => (
              <div key={section} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {t(`guide.${section}.title`)}
                </h3>
                <ul className="space-y-2">
                  {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
