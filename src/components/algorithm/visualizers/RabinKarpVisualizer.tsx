'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/algorithmHub'
import '@/lib/i18n/ns/rabinKarpVisualizer'
import { solveRabinKarp, RABIN_KARP_PRESETS, type RabinKarpStep } from '@/utils/algorithm/rabinKarp'
import RabinKarpCanvas2D from './RabinKarpCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const RABIN_KARP_CODE = `// Rabin-Karp Pattern Matching — Rolling Hash
function rabinKarp(text, pattern, base = 256, mod = 101) {
  const n = text.length, m = pattern.length;
  let h = 1;
  for (let i = 0; i < m - 1; i++)
    h = (h * base) % mod;        // h = base^(m-1) % mod

  // Compute initial hashes
  let patHash = 0, txtHash = 0;
  for (let i = 0; i < m; i++) {
    patHash = (patHash * base + pattern[i]) % mod;
    txtHash = (txtHash * base + text[i]) % mod;
  }

  const matches = [];
  for (let i = 0; i <= n - m; i++) {
    if (txtHash === patHash) {
      // Hash match → verify characters
      let match = true;
      for (let j = 0; j < m; j++) {
        if (text[i+j] !== pattern[j]) {
          match = false; break;   // spurious hit!
        }
      }
      if (match) matches.push(i);
    }
    // Rolling hash: remove leading, add trailing
    if (i < n - m) {
      txtHash = ((txtHash - text[i] * h) * base
                 + text[i + m]) % mod;
      if (txtHash < 0) txtHash += mod;
    }
  }
  return matches;
}`

const CODE_LINES: Record<RabinKarpStep['action'], number[]> = {
  'compute-pattern-hash': [9, 10, 11, 12],
  'compute-window-hash':  [9, 10, 11, 12],
  'hash-match':           [16, 17],
  'hash-mismatch':        [16],
  'verify-start':         [18, 19],
  'verify-match':         [20],
  'verify-mismatch':      [21, 22],
  'found':                [24],
  'slide-window':         [27, 28, 29],
  'complete':             [31],
}

export default function RabinKarpVisualizer() {
  const t = useTranslations('rabinKarpVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [text, setText] = useState(RABIN_KARP_PRESETS[0].text)
  const [pattern, setPattern] = useState(RABIN_KARP_PRESETS[0].pattern)
  const [base, setBase] = useState(256)
  const [mod, setMod] = useState(101)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof solveRabinKarp> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = solveRabinKarp(text.toUpperCase(), pattern.toUpperCase(), base, mod)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [text, pattern, base, mod])

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
    setText(RABIN_KARP_PRESETS[idx].text)
    setPattern(RABIN_KARP_PRESETS[idx].pattern)
    handleReset()
  }, [handleReset])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 500 / speed)
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

  const { windowStart, windowEnd, textHash, patternHash, matchesSoFar, falsePositives } = useMemo(() => {
    if (!currentStep) return { windowStart: 0, windowEnd: 0, textHash: 0, patternHash: 0, matchesSoFar: [] as number[], falsePositives: 0 }
    const ms: number[] = []
    for (let i = 0; i <= currentStepIndex; i++) {
      if (result!.steps[i].action === 'found') {
        ms.push(result!.steps[i].windowStart)
      }
    }
    return {
      windowStart: currentStep.windowStart,
      windowEnd: currentStep.windowEnd,
      textHash: currentStep.textHash,
      patternHash: currentStep.patternHash,
      matchesSoFar: ms,
      falsePositives: currentStep.falsePositives,
    }
  }, [result, currentStepIndex, currentStep])

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
    'compute-pattern-hash': 'bg-subtle border-line',
    'compute-window-hash':  'bg-subtle border-line',
    'hash-match':           'bg-subtle border-line',
    'hash-mismatch':        'bg-subtle border-line',
    'verify-start':         'bg-subtle border-line',
    'verify-match':         'bg-subtle border-line',
    'verify-mismatch':      'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'found':                'bg-subtle border-line',
    'slide-window':         'bg-subtle border-line',
    'complete':             'bg-subtle border-line',
  }

  const ACTION_BADGE: Record<string, string> = {
    'compute-pattern-hash': 'bg-soft text-sub',
    'compute-window-hash':  'bg-soft text-sub',
    'hash-match':           'bg-soft text-sub',
    'hash-mismatch':        'bg-soft text-sub',
    'verify-start':         'bg-soft text-sub',
    'verify-match':         'bg-soft text-sub',
    'verify-mismatch':      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'found':                'bg-soft text-sub',
    'slide-window':         'bg-soft text-sub',
    'complete':             'bg-soft text-sub',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-soft text-sub">
              {tHub('categories.string')}
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
                <RabinKarpCanvas2D
                  text={result?.text ?? text.toUpperCase()} pattern={result?.pattern ?? pattern.toUpperCase()}
                  windowStart={windowStart} windowEnd={windowEnd}
                  textHash={textHash} patternHash={patternHash}
                  matches={matchesSoFar} action={currentStep?.action ?? ''}
                  falsePositives={falsePositives}
                  width={680} height={280}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-sub">
                {t('stats.matches')}: <strong className="text-emerald-600 dark:text-emerald-400">{matchesSoFar.length}</strong>
              </span>
              <span className="text-sub">
                {t('comparisons')}: <strong className="text-blue-600 dark:text-blue-400">{currentStep?.comparisons ?? 0}</strong>
              </span>
              <span className="text-sub">
                {t('stats.falsePositives')}: <strong className="text-amber-600 dark:text-amber-400">{falsePositives}</strong>
              </span>
              <span className="text-sub">
                {t('stats.hashValues')}: <strong className="text-pink-600 dark:text-pink-400">{textHash}</strong> vs <strong className="text-pink-600 dark:text-pink-400">{patternHash}</strong>
              </span>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted mb-2">{t('controls.preset')}</p>
              <div className="flex flex-wrap gap-2">
                {RABIN_KARP_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-pink-500 text-white' : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{p.name}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">{t('text')}</label>
                <input type="text" value={text} maxLength={20}
                  onChange={e => { setText(e.target.value.toUpperCase()); handleReset() }}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">{t('pattern')}</label>
                <input type="text" value={pattern} maxLength={10}
                  onChange={e => { setPattern(e.target.value.toUpperCase()); handleReset() }}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">{t('base')}</label>
                <input type="number" value={base} min={2} max={1000}
                  onChange={e => { setBase(Number(e.target.value)); handleReset() }}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">{t('modulo')}</label>
                <input type="number" value={mod} min={2} max={10000}
                  onChange={e => { setMod(Number(e.target.value)); handleReset() }}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm" />
              </div>
            </div>

            <button onClick={runAlgorithm}
              className="w-full px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              {t('run')}
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
                      activeTab === tab.key ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-500 bg-subtle'
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
                {activeTab === 'code' && <CodeViewer code={RABIN_KARP_CODE} language="javascript" highlightLines={codeHighlightLines} title="rabin-karp.js" />}
                {activeTab === 'guide' && <GuideSection namespace="rabinKarpVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: RabinKarpStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) { const c = listRef.current; const tp = (el as HTMLElement).offsetTop; const h = (el as HTMLElement).offsetHeight
      if (tp < c.scrollTop) c.scrollTop = tp; else if (tp + h > c.scrollTop + c.clientHeight) c.scrollTop = tp + h - c.clientHeight }
  }, [currentIndex])
  if (!steps || steps.length === 0) return null
  const ws = Math.max(0, currentIndex - 10), we = Math.min(steps.length - 1, currentIndex + 20)
  return (
    <div ref={listRef} className="space-y-1">
      {ws > 0 && <div className="text-xs text-gray-400 text-center py-1">... {ws} ...</div>}
      {steps.slice(ws, we + 1).map((step, wi) => {
        const idx = ws + wi; const isCur = idx === currentIndex; const isAct = idx <= currentIndex
        return (
          <div key={idx} data-active={isCur ? 'true' : undefined} onClick={() => onStepClick(idx)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${isCur ? (actionStyle[step.action] || '') : isAct ? 'border-line bg-subtle' : 'border-line opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${actionBadge[step.action] || ''}`}>
                {step.action.replace('compute-', '').replace('pattern-', 'P:').replace('window-', 'W:').replace('hash-', 'H:').replace('verify-', 'V:').replace('slide-', 'S:')}
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
