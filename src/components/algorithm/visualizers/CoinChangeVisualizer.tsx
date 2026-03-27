'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { solveCoinChange, COIN_PRESETS, type CoinChangeStep } from '@/utils/algorithm/coinChange'
import CoinChangeCanvas2D from './CoinChangeCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const COIN_CHANGE_CODE = `// Coin Change — O(amount * coins)
function coinChange(coins, amount) {
  const dp = Array(amount + 1).fill(Infinity);
  const coinUsed = Array(amount + 1).fill(-1);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] + 1 < dp[i]) {
        dp[i] = dp[i - coin] + 1;    // update min
        coinUsed[i] = coin;           // record coin
      }
    }
  }

  // Backtrack to find coins used
  const result = [];
  let rem = amount;
  while (rem > 0 && coinUsed[rem] !== -1) {
    result.push(coinUsed[rem]);
    rem -= coinUsed[rem];
  }
  return { minCoins: dp[amount], coins: result };
}`

const CODE_LINES: Record<CoinChangeStep['action'], number[]> = {
  init:            [3, 4, 5],
  'try-coin':      [8, 9],
  update:          [10, 11],
  skip:            [8],
  fill:            [10],
  'backtrack-pick': [18, 19, 20],
  'backtrack-skip': [17],
  'greedy-pick':   [],
  done:            [22],
}

export default function CoinChangeVisualizer() {
  const t = useTranslations('coinChangeVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [coins, setCoins] = useState<number[]>(COIN_PRESETS[0].coins)
  const [amount, setAmount] = useState(COIN_PRESETS[0].amount)
  const [coinsInput, setCoinsInput] = useState(COIN_PRESETS[0].coins.join(', '))
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof solveCoinChange> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const parsed = coinsInput.split(/[,\s]+/).map(Number).filter(n => n > 0 && Number.isFinite(n))
    if (parsed.length === 0) return
    setCoins(parsed)
    const res = solveCoinChange(parsed, amount)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [coinsInput, amount])

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
    setCoins(COIN_PRESETS[idx].coins)
    setCoinsInput(COIN_PRESETS[idx].coins.join(', '))
    setAmount(COIN_PRESETS[idx].amount)
    handleReset()
  }, [handleReset])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 400 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const { filledSet, activeAmount, activeCoin, selectedCoins, backtrackAmount } = useMemo(() => {
    const filled = new Set<number>()
    let aAmt = -1
    let aCoin: number | undefined
    const selected: number[] = []
    let btAmt = -1

    filled.add(0) // dp[0] always filled

    if (result && currentStepIndex >= 0) {
      for (let i = 0; i <= currentStepIndex && i < result.steps.length; i++) {
        const step = result.steps[i]
        if (step.action === 'fill') filled.add(step.amount)
        if (step.action === 'backtrack-pick' && step.coin !== undefined) {
          selected.push(step.coin)
          btAmt = step.amount
        }
      }
      const cur = result.steps[currentStepIndex]
      aAmt = cur.amount
      aCoin = cur.coin
      if (cur.action.startsWith('backtrack')) btAmt = cur.amount
    }

    return { filledSet: filled, activeAmount: aAmt, activeCoin: aCoin, selectedCoins: selected, backtrackAmount: btAmt }
  }, [result, currentStepIndex])

  const currentStep = result?.steps[currentStepIndex] ?? null
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
    init:             'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    'try-coin':       'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    update:           'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    skip:             'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    fill:             'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300/50 dark:border-cyan-700/40',
    'backtrack-pick': 'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'backtrack-skip': 'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    'greedy-pick':    'bg-orange-50 dark:bg-orange-900/20 border-orange-300/50 dark:border-orange-700/40',
    done:             'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }
  const ACTION_BADGE: Record<string, string> = {
    init:             'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    'try-coin':       'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    update:           'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    skip:             'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    fill:             'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    'backtrack-pick': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'backtrack-skip': 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    'greedy-pick':    'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    done:             'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
              {tHub('categories.dp')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
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
                <CoinChangeCanvas2D
                  dp={result?.dp ?? []}
                  amount={amount}
                  coins={coins}
                  activeAmount={activeAmount}
                  activeCoin={activeCoin}
                  filledSet={filledSet}
                  selectedCoins={selectedCoins}
                  backtrackAmount={backtrackAmount}
                  width={680} height={340}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('result')}: <strong className="text-cyan-600 dark:text-cyan-400">
                  {result ? (result.impossible ? t('impossible') : result.minCoins) : '-'}
                </strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('selectedCoins')}: <strong className="text-emerald-600 dark:text-emerald-400">
                  {result && !result.impossible ? result.selectedCoins.join(' + ') : '-'}
                </strong>
              </span>
              {result && result.greedyPossible && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.greedy')}: <strong className={`${result.greedyCount > result.minCoins ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {result.greedyCount} ({result.greedyCoins.join('+')})
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.preset')}</p>
              <div className="flex flex-wrap gap-2">
                {COIN_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{t(`presets.${p.name}`)}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('coins')}</label>
                <input type="text" value={coinsInput}
                  onChange={e => { setCoinsInput(e.target.value); handleReset() }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono text-sm"
                  placeholder="1, 3, 4" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('amount')} ({amount})</label>
                <input type="range" min={1} max={50} value={amount}
                  onChange={e => { setAmount(Number(e.target.value)); handleReset() }}
                  className="w-full accent-cyan-600 mt-2" />
              </div>
            </div>

            <button onClick={runAlgorithm}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 transition-colors">
              {t('run')}
            </button>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500/80" />{t('legend.filled')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.updated')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.backtrack')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400/80" />{t('legend.inf')}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{tab.icon} {tab.label}</button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <StepsList steps={result?.steps} currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex} actionStyle={ACTION_STYLE} actionBadge={ACTION_BADGE} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && <CodeViewer code={COIN_CHANGE_CODE} language="javascript" highlightLines={codeHighlightLines} title="coinChange.js" />}
                {activeTab === 'guide' && <GuideSection namespace="coinChangeVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: CoinChangeStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) { const c = listRef.current; const t = (el as HTMLElement).offsetTop; const h = (el as HTMLElement).offsetHeight
      if (t < c.scrollTop) c.scrollTop = t; else if (t + h > c.scrollTop + c.clientHeight) c.scrollTop = t + h - c.clientHeight }
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
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${isCur ? (actionStyle[step.action] || '') : isAct ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${actionBadge[step.action] || ''}`}>{step.action}</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {we < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - we} ...</div>}
    </div>
  )
}
