// Counting Sort algorithm with step-by-step recording for visualization
// Non-comparison sort — O(n + k) time, O(k) space
// Pure functions, no side effects, TypeScript strict

export interface CountingSortStep {
  array: number[]           // original input array (unchanged throughout)
  countArray: number[]      // count/frequency array (grows each phase)
  outputArray: number[]     // output array being built
  action: 'count' | 'accumulate' | 'place' | 'done'
  highlightInput: number | null   // index in input array
  highlightCount: number | null   // index in count array
  highlightOutput: number | null  // index in output array
  phase: 'counting' | 'accumulating' | 'placing'
  sorted: number[]          // final sorted values (populated on done)
}

export interface CountingSortResult {
  steps: CountingSortStep[]
  maxValue: number
}

export function countingSort(array: number[]): CountingSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: CountingSortStep[] = []

  if (n === 0) {
    return { steps, maxValue: 0 }
  }

  const maxValue = Math.max(...arr)
  const count = new Array(maxValue + 1).fill(0)
  const output = new Array(n).fill(-1)

  // ── Phase 1: Count frequencies ──
  for (let i = 0; i < n; i++) {
    count[arr[i]]++
    steps.push({
      array: [...arr],
      countArray: [...count],
      outputArray: [...output],
      action: 'count',
      highlightInput: i,
      highlightCount: arr[i],
      highlightOutput: null,
      phase: 'counting',
      sorted: [],
    })
  }

  // ── Phase 2: Accumulate (prefix sum) ──
  for (let i = 1; i <= maxValue; i++) {
    count[i] += count[i - 1]
    steps.push({
      array: [...arr],
      countArray: [...count],
      outputArray: [...output],
      action: 'accumulate',
      highlightInput: null,
      highlightCount: i,
      highlightOutput: null,
      phase: 'accumulating',
      sorted: [],
    })
  }

  // ── Phase 3: Place elements into output ──
  for (let i = n - 1; i >= 0; i--) {
    const val = arr[i]
    const pos = count[val] - 1
    output[pos] = val
    count[val]--
    steps.push({
      array: [...arr],
      countArray: [...count],
      outputArray: [...output],
      action: 'place',
      highlightInput: i,
      highlightCount: val,
      highlightOutput: pos,
      phase: 'placing',
      sorted: [],
    })
  }

  // ── Done ──
  steps.push({
    array: [...arr],
    countArray: [...count],
    outputArray: [...output],
    action: 'done',
    highlightInput: null,
    highlightCount: null,
    highlightOutput: null,
    phase: 'placing',
    sorted: [...output],
  })

  return { steps, maxValue }
}

export function generateRandomArray(
  size: number,
  min: number = 0,
  max: number = 20
): number[] {
  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  )
}

/** Generates an array with many repeated values to showcase counting sort's strength */
export function generateWithDuplicates(size: number): number[] {
  // Use only 0–9 as values so duplicates appear frequently
  return Array.from({ length: size }, () => Math.floor(Math.random() * 10))
}
