// ── Types ─────────────────────────────────────────────────────────────────────

export type SlidingWindowMode = 'fixed' | 'variable'

export interface SlidingWindowStep {
  action: 'init' | 'expand' | 'shrink' | 'update-best' | 'slide' | 'complete'
  description: string
  left: number
  right: number
  currentSum: number
  bestValue: number           // max sum (fixed) or min length (variable)
  bestLeft: number
  bestRight: number
  phase: 'running' | 'done'
}

export interface SlidingWindowResult {
  steps: SlidingWindowStep[]
  array: number[]
  mode: SlidingWindowMode
  windowSize: number          // k for fixed mode
  target: number              // target for variable mode
  bestValue: number
  bestLeft: number
  bestRight: number
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const SW_PRESETS: { name: string; array: number[]; windowSize: number; target: number }[] = [
  { name: 'basic', array: [2, 1, 5, 1, 3, 2], windowSize: 3, target: 7 },
  { name: 'large', array: [4, 2, 1, 7, 8, 1, 2, 8, 1, 0], windowSize: 3, target: 15 },
  { name: 'uniform', array: [3, 3, 3, 3, 3, 3, 3, 3], windowSize: 4, target: 10 },
  { name: 'peaks', array: [1, 9, 1, 1, 9, 1, 1, 1, 9, 1], windowSize: 3, target: 11 },
]

// ── Random generator ─────────────────────────────────────────────────────────

export function generateRandomArray(size: number = 12, max: number = 15): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * max) + 1)
}

// ── Solvers ──────────────────────────────────────────────────────────────────

export function solveFixedWindow(array: number[], k: number): SlidingWindowResult {
  const steps: SlidingWindowStep[] = []
  const n = array.length
  const safeK = Math.min(k, n)

  // Init: compute first window sum
  let currentSum = 0
  for (let i = 0; i < safeK; i++) {
    currentSum += array[i]
  }

  let bestSum = currentSum
  let bestLeft = 0
  let bestRight = safeK - 1

  steps.push({
    action: 'init',
    description: `window[0..${safeK - 1}] sum=${currentSum}`,
    left: 0, right: safeK - 1,
    currentSum, bestValue: bestSum,
    bestLeft: 0, bestRight: safeK - 1,
    phase: 'running',
  })

  // Slide
  for (let i = 1; i <= n - safeK; i++) {
    const removed = array[i - 1]
    const added = array[i + safeK - 1]
    currentSum = currentSum - removed + added

    steps.push({
      action: 'slide',
      description: `-arr[${i - 1}]=${removed}, +arr[${i + safeK - 1}]=${added} => sum=${currentSum}`,
      left: i, right: i + safeK - 1,
      currentSum, bestValue: bestSum,
      bestLeft, bestRight,
      phase: 'running',
    })

    if (currentSum > bestSum) {
      bestSum = currentSum
      bestLeft = i
      bestRight = i + safeK - 1

      steps.push({
        action: 'update-best',
        description: `new max=${bestSum} at [${bestLeft}..${bestRight}]`,
        left: i, right: i + safeK - 1,
        currentSum, bestValue: bestSum,
        bestLeft, bestRight,
        phase: 'running',
      })
    }
  }

  steps.push({
    action: 'complete',
    description: `max sum=${bestSum} at [${bestLeft}..${bestRight}]`,
    left: bestLeft, right: bestRight,
    currentSum: bestSum, bestValue: bestSum,
    bestLeft, bestRight,
    phase: 'done',
  })

  return { steps, array, mode: 'fixed', windowSize: safeK, target: 0, bestValue: bestSum, bestLeft, bestRight }
}

export function solveVariableWindow(array: number[], target: number): SlidingWindowResult {
  const steps: SlidingWindowStep[] = []
  const n = array.length

  let left = 0
  let currentSum = 0
  let bestLen = Infinity
  let bestLeft = -1
  let bestRight = -1

  steps.push({
    action: 'init',
    description: `target >= ${target}`,
    left: 0, right: -1,
    currentSum: 0, bestValue: bestLen === Infinity ? -1 : bestLen,
    bestLeft: -1, bestRight: -1,
    phase: 'running',
  })

  for (let right = 0; right < n; right++) {
    currentSum += array[right]

    steps.push({
      action: 'expand',
      description: `+arr[${right}]=${array[right]} => sum=${currentSum}`,
      left, right,
      currentSum, bestValue: bestLen === Infinity ? -1 : bestLen,
      bestLeft, bestRight,
      phase: 'running',
    })

    while (currentSum >= target && left <= right) {
      const windowLen = right - left + 1
      if (windowLen < bestLen) {
        bestLen = windowLen
        bestLeft = left
        bestRight = right

        steps.push({
          action: 'update-best',
          description: `min len=${bestLen} at [${bestLeft}..${bestRight}]`,
          left, right,
          currentSum, bestValue: bestLen,
          bestLeft, bestRight,
          phase: 'running',
        })
      }

      currentSum -= array[left]

      steps.push({
        action: 'shrink',
        description: `-arr[${left}]=${array[left]} => sum=${currentSum + array[left]} -> ${currentSum}`,
        left: left + 1, right,
        currentSum, bestValue: bestLen === Infinity ? -1 : bestLen,
        bestLeft, bestRight,
        phase: 'running',
      })

      left++
    }
  }

  const finalBest = bestLen === Infinity ? -1 : bestLen

  steps.push({
    action: 'complete',
    description: finalBest === -1 ? 'no valid window' : `min length=${finalBest} at [${bestLeft}..${bestRight}]`,
    left: bestLeft, right: bestRight,
    currentSum: 0, bestValue: finalBest,
    bestLeft, bestRight,
    phase: 'done',
  })

  return { steps, array, mode: 'variable', windowSize: 0, target, bestValue: finalBest, bestLeft, bestRight }
}
