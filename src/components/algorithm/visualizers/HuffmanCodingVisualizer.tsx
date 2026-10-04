'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/algorithmHub'
import '@/lib/i18n/ns/huffmanCodingVisualizer'
import { solveHuffman, HUFFMAN_PRESETS, type HuffmanStep } from '@/utils/algorithm/huffmanCoding'
import HuffmanCodingCanvas2D from './HuffmanCodingCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const HUFFMAN_CODE = `// Huffman Coding — Greedy O(n log n)
// Phase 1: Count character frequencies
function countFreq(text) {
  const freq = {};
  for (const ch of text)
    freq[ch] = (freq[ch] || 0) + 1;
  return freq;
}

// Phase 2: Build Huffman tree
function buildTree(freq) {
  const heap = Object.entries(freq)
    .map(([ch, f]) => ({ ch, f, left: null, right: null }));
  // Min-heap by frequency
  while (heap.length > 1) {
    heap.sort((a, b) => a.f - b.f);
    const left = heap.shift();   // extract min
    const right = heap.shift();  // extract 2nd min
    const merged = {
      ch: null,
      f: left.f + right.f,      // merge
      left, right
    };
    heap.push(merged);
  }
  return heap[0];
}

// Phase 3: Assign codes (left=0, right=1)
function assignCodes(node, prefix = '', table = {}) {
  if (node.ch !== null) {
    table[node.ch] = prefix || '0';
    return table;
  }
  assignCodes(node.left, prefix + '0', table);
  assignCodes(node.right, prefix + '1', table);
  return table;
}

// Phase 4: Encode
function encode(text, table) {
  return text.split('').map(ch => table[ch]).join('');
}`

const CODE_LINES: Record<HuffmanStep['action'], number[]> = {
  'count-freq':   [3, 4, 5, 6],
  'init-heap':    [11, 12],
  'extract-min':  [16, 17],
  'merge':        [18, 19, 20, 21, 22],
  'assign-code':  [28, 29, 30, 31, 32],
  'encode-char':  [37],
  'complete':     [37],
}

export default function HuffmanCodingVisualizer() {
  const t = useTranslations('huffmanCodingVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [text, setText] = useState(HUFFMAN_PRESETS[0].text)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof solveHuffman> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = solveHuffman(text.toUpperCase())
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [text])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setResult(null)
  }, [])

  const selectPreset = useCallback((idx: number) => {
    setPresetIdx(idx)
    setText(HUFFMAN_PRESETS[idx].text)
    handleReset()
  }, [handleReset])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 600 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const currentStep = result?.steps[currentStepIndex] ?? null

  const canvasProps = useMemo(() => {
    if (!currentStep) return {
      tree: null,
      highlightNodes: [] as number[],
      codeTable: {} as Record<string, string>,
      freqMap: result?.freqMap ?? {} as Record<string, number>,
      encodedSoFar: '',
    }
    return {
      tree: currentStep.tree,
      highlightNodes: currentStep.highlightNodes,
      codeTable: currentStep.codeTable,
      freqMap: result?.freqMap ?? {},
      encodedSoFar: currentStep.encodedSoFar,
    }
  }, [currentStep, result?.freqMap])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return CODE_LINES[currentStep.action] ?? []
  }, [currentStep])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const ACTION_STYLE: Record<string, string> = {
    'count-freq':   'bg-subtle border-line',
    'init-heap':    'bg-subtle border-line',
    'extract-min':  'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'merge':        'bg-subtle border-line',
    'assign-code':  'bg-subtle border-line',
    'encode-char':  'bg-subtle border-line',
    'complete':     'bg-subtle border-line',
  }
  const ACTION_BADGE: Record<string, string> = {
    'count-freq':   'bg-soft text-sub',
    'init-heap':    'bg-soft text-sub',
    'extract-min':  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'merge':        'bg-soft text-sub',
    'assign-code':  'bg-soft text-sub',
    'encode-char':  'bg-soft text-sub',
    'complete':     'bg-soft text-sub',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {tHub('categories.greedy')}
            </span>
            <span className="text-xs text-gray-400">★★☆</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying} onPlay={handlePlay} onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => { if (currentStepIndex < 0) runAlgorithm(); else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1)) }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed} onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)} totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <HuffmanCodingCanvas2D
                  {...canvasProps}
                  width={680} height={420}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {result && (
                <>
                  <span className="text-sub">
                    {t('originalSize')}: <strong className="text-blue-600 dark:text-blue-400">{result.originalBits}b</strong>
                  </span>
                  <span className="text-sub">
                    {t('compressedSize')}: <strong className="text-emerald-600 dark:text-emerald-400">{result.compressedBits}b</strong>
                  </span>
                  <span className="text-sub">
                    {t('ratio')}: <strong className="text-amber-600 dark:text-amber-400">
                      {((1 - result.compressedBits / result.originalBits) * 100).toFixed(1)}%
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted mb-2">{t('tabs.steps')}</p>
              <div className="flex flex-wrap gap-2">
                {HUFFMAN_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-amber-500 text-white' : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{p.name}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted mb-1 block">{t('text')}</label>
              <input type="text" value={text} maxLength={20}
                onChange={e => { setText(e.target.value.toUpperCase()); handleReset() }}
                className="w-full px-3 py-2 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-sm" />
            </div>

            <button onClick={runAlgorithm}
              className="w-full px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              {t('encode')}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="flex border-b border-line">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20'
                        : 'text-muted hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{tab.label}</button>
                ))}
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-sub mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-faint italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <StepsList steps={result?.steps} currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex} actionStyle={ACTION_STYLE} actionBadge={ACTION_BADGE} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && <CodeViewer code={HUFFMAN_CODE} language="javascript" highlightLines={codeHighlightLines} title="huffman.js" />}
                {activeTab === 'guide' && <GuideSection namespace="huffmanCodingVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: HuffmanStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) {
      const c = listRef.current
      const tp = (el as HTMLElement).offsetTop
      const h = (el as HTMLElement).offsetHeight
      if (tp < c.scrollTop) c.scrollTop = tp
      else if (tp + h > c.scrollTop + c.clientHeight) c.scrollTop = tp + h - c.clientHeight
    }
  }, [currentIndex])
  if (!steps || steps.length === 0) return null
  const ws = Math.max(0, currentIndex - 10)
  const we = Math.min(steps.length - 1, currentIndex + 20)
  return (
    <div ref={listRef} className="space-y-1">
      {ws > 0 && <div className="text-xs text-gray-400 text-center py-1">... {ws} ...</div>}
      {steps.slice(ws, we + 1).map((step, wi) => {
        const idx = ws + wi
        const isCur = idx === currentIndex
        const isAct = idx <= currentIndex
        return (
          <div key={idx} data-active={isCur ? 'true' : undefined} onClick={() => onStepClick(idx)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${isCur ? (actionStyle[step.action] || '') : isAct ? 'border-line bg-subtle' : 'border-line opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${actionBadge[step.action] || ''}`}>
                {step.action}
              </span>
              <span className="text-sub truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {we < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - we} ...</div>}
    </div>
  )
}
