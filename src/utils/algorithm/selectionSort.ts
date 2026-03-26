// Selection Sort algorithm with step-by-step recording for visualization
// Pure functions, no side effects, TypeScript strict

export interface SelectionSortStep {
  array: number[]
  action: 'scan-start' | 'compare' | 'new-min' | 'swap' | 'no-swap' | 'done'
  current: number | null         // index being scanned
  minIndex: number | null        // current minimum index
  comparing: [number, number] | null
  swapping: [number, number] | null
  sorted: number[]               // indices confirmed sorted (left side)
  scanRange: [number, number] | null  // [i, n-1] current scan range
  comparisons: number
  swaps: number
}

export interface SelectionSortResult {
  steps: SelectionSortStep[]
  totalComparisons: number
  totalSwaps: number
}

export function selectionSort(array: number[]): SelectionSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: SelectionSortStep[] = []
  const sorted: number[] = []
  let comparisons = 0
  let swaps = 0

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i

    // Record scan-start: beginning of outer loop pass
    steps.push({
      array: [...arr],
      action: 'scan-start',
      current: i,
      minIndex: minIdx,
      comparing: null,
      swapping: null,
      sorted: [...sorted],
      scanRange: [i, n - 1],
      comparisons,
      swaps,
    })

    for (let j = i + 1; j < n; j++) {
      comparisons++

      // Record compare step
      steps.push({
        array: [...arr],
        action: 'compare',
        current: j,
        minIndex: minIdx,
        comparing: [j, minIdx],
        swapping: null,
        sorted: [...sorted],
        scanRange: [i, n - 1],
        comparisons,
        swaps,
      })

      if (arr[j] < arr[minIdx]) {
        minIdx = j

        // Record new-min step
        steps.push({
          array: [...arr],
          action: 'new-min',
          current: j,
          minIndex: minIdx,
          comparing: null,
          swapping: null,
          sorted: [...sorted],
          scanRange: [i, n - 1],
          comparisons,
          swaps,
        })
      }
    }

    if (minIdx !== i) {
      // Swap arr[i] and arr[minIdx]
      const tmp = arr[i]
      arr[i] = arr[minIdx]
      arr[minIdx] = tmp
      swaps++

      steps.push({
        array: [...arr],
        action: 'swap',
        current: i,
        minIndex: minIdx,
        comparing: null,
        swapping: [i, minIdx],
        sorted: [...sorted],
        scanRange: [i, n - 1],
        comparisons,
        swaps,
      })
    } else {
      steps.push({
        array: [...arr],
        action: 'no-swap',
        current: i,
        minIndex: i,
        comparing: null,
        swapping: null,
        sorted: [...sorted],
        scanRange: [i, n - 1],
        comparisons,
        swaps,
      })
    }

    // After this pass, index i is in its final position
    sorted.push(i)
  }

  // The last element is also sorted
  if (!sorted.includes(n - 1)) {
    sorted.push(n - 1)
  }

  // Final done step with all indices sorted
  const allSorted = Array.from({ length: n }, (_, i) => i)
  steps.push({
    array: [...arr],
    action: 'done',
    current: null,
    minIndex: null,
    comparing: null,
    swapping: null,
    sorted: allSorted,
    scanRange: null,
    comparisons,
    swaps,
  })

  return {
    steps,
    totalComparisons: comparisons,
    totalSwaps: swaps,
  }
}

export function generateRandomArray(
  size: number,
  min: number = 5,
  max: number = 100
): number[] {
  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  )
}

export function generateNearlySorted(size: number): number[] {
  const arr = Array.from({ length: size }, (_, i) => i + 1)
  // Swap ~10% of elements (at least 1 swap for any non-trivial size)
  const swapCount = Math.max(1, Math.floor(size * 0.1))
  for (let s = 0; s < swapCount; s++) {
    const i = Math.floor(Math.random() * size)
    const j = Math.floor(Math.random() * size)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

export function generateReversed(size: number): number[] {
  return Array.from({ length: size }, (_, i) => size - i)
}
