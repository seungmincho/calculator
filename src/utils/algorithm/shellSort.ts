// Shell Sort with step-by-step recording for visualization
// Pure functions, no side effects, TypeScript strict

export type GapSequence = 'shell' | 'knuth' | 'hibbard'

export interface ShellSortStep {
  array: number[]
  comparing: [number, number] | null
  swapping: [number, number] | null
  sorted: number[]
  gap: number
  gapPass: number                // which gap we're on (0-indexed)
  action: 'set-gap' | 'compare' | 'swap' | 'no-swap' | 'gap-complete' | 'done'
  comparisons: number
  swaps: number
  activeIndices: number[]        // indices in the current gap group
}

export interface ShellSortResult {
  steps: ShellSortStep[]
  totalComparisons: number
  totalSwaps: number
  gapSequence: number[]
}

function getGapSequence(n: number, type: GapSequence): number[] {
  const gaps: number[] = []

  switch (type) {
    case 'shell': {
      // Shell's original: n/2, n/4, ..., 1
      let gap = Math.floor(n / 2)
      while (gap >= 1) {
        gaps.push(gap)
        gap = Math.floor(gap / 2)
      }
      break
    }
    case 'knuth': {
      // Knuth: (3^k - 1) / 2 starting from 1
      const knuthGaps: number[] = []
      let k = 1
      while (k < n) {
        knuthGaps.push(k)
        k = k * 3 + 1
      }
      knuthGaps.reverse()
      gaps.push(...knuthGaps)
      break
    }
    case 'hibbard': {
      // Hibbard: 2^k - 1: 1, 3, 7, 15, 31, ...
      const hibbardGaps: number[] = []
      let p = 1
      while (p < n) {
        hibbardGaps.push(p)
        p = p * 2 + 1
      }
      hibbardGaps.reverse()
      gaps.push(...hibbardGaps)
      break
    }
  }

  // Ensure 1 is always the last gap
  if (gaps[gaps.length - 1] !== 1) gaps.push(1)
  return gaps
}

export function shellSort(array: number[], gapType: GapSequence = 'shell'): ShellSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: ShellSortStep[] = []
  let comparisons = 0
  let swaps = 0

  const gapSequence = getGapSequence(n, gapType)

  for (let gapPass = 0; gapPass < gapSequence.length; gapPass++) {
    const gap = gapSequence[gapPass]

    // Record gap start
    const activeForGap: number[] = []
    for (let i = 0; i < n; i++) activeForGap.push(i)

    steps.push({
      array: [...arr],
      comparing: null,
      swapping: null,
      sorted: [],
      gap,
      gapPass,
      action: 'set-gap',
      comparisons,
      swaps,
      activeIndices: activeForGap,
    })

    // Insertion sort with this gap
    for (let i = gap; i < n; i++) {
      let j = i
      while (j >= gap) {
        comparisons++
        const groupIndices = []
        for (let k = j % gap; k < n; k += gap) groupIndices.push(k)

        // Record compare step
        steps.push({
          array: [...arr],
          comparing: [j - gap, j],
          swapping: null,
          sorted: [],
          gap,
          gapPass,
          action: 'compare',
          comparisons,
          swaps,
          activeIndices: groupIndices,
        })

        if (arr[j - gap] > arr[j]) {
          // Swap
          const tmp = arr[j]
          arr[j] = arr[j - gap]
          arr[j - gap] = tmp
          swaps++

          steps.push({
            array: [...arr],
            comparing: null,
            swapping: [j - gap, j],
            sorted: [],
            gap,
            gapPass,
            action: 'swap',
            comparisons,
            swaps,
            activeIndices: groupIndices,
          })

          j -= gap
        } else {
          steps.push({
            array: [...arr],
            comparing: null,
            swapping: null,
            sorted: [],
            gap,
            gapPass,
            action: 'no-swap',
            comparisons,
            swaps,
            activeIndices: groupIndices,
          })
          break
        }
      }
    }

    // Gap complete
    steps.push({
      array: [...arr],
      comparing: null,
      swapping: null,
      sorted: [],
      gap,
      gapPass,
      action: 'gap-complete',
      comparisons,
      swaps,
      activeIndices: [],
    })
  }

  // Done
  const allSorted = Array.from({ length: n }, (_, i) => i)
  steps.push({
    array: [...arr],
    comparing: null,
    swapping: null,
    sorted: allSorted,
    gap: 1,
    gapPass: gapSequence.length - 1,
    action: 'done',
    comparisons,
    swaps,
    activeIndices: [],
  })

  return {
    steps,
    totalComparisons: comparisons,
    totalSwaps: swaps,
    gapSequence,
  }
}

export function generateRandomArray(size: number, min = 5, max = 100): number[] {
  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  )
}

export function generateNearlySorted(size: number): number[] {
  const arr = Array.from({ length: size }, (_, i) => i + 1)
  const swapCount = Math.max(1, Math.floor(size * 0.1))
  for (let s = 0; s < swapCount; s++) {
    const i = Math.floor(Math.random() * size)
    const j = Math.floor(Math.random() * size)
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
  }
  return arr
}

export function generateReversed(size: number): number[] {
  return Array.from({ length: size }, (_, i) => size - i)
}
