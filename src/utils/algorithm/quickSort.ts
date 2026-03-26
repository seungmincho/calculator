// Quick Sort algorithm with step-by-step recording for visualization
// Lomuto partition scheme (pivot = last element of range)
// Pure functions, no side effects, TypeScript strict

export interface QuickSortStep {
  array: number[]                          // snapshot of array at this step
  pivot: number | null                     // index of pivot element
  comparing: [number, number] | null       // indices being compared
  swapping: [number, number] | null        // indices being swapped
  partitionRange: [number, number] | null  // [low, high] current partition range
  sorted: number[]                         // indices confirmed in final position
  action: 'pivot-select' | 'compare' | 'swap' | 'no-swap' | 'pivot-place' | 'done'
  depth: number                            // recursion depth
  comparisons: number
  swaps: number
}

export interface QuickSortResult {
  steps: QuickSortStep[]
  totalComparisons: number
  totalSwaps: number
  maxDepth: number
}

export function quickSort(array: number[]): QuickSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: QuickSortStep[] = []
  const sortedSet = new Set<number>()
  let comparisons = 0
  let swaps = 0
  let maxDepth = 0

  // Helper to push a step snapshot
  function pushStep(
    action: QuickSortStep['action'],
    pivot: number | null,
    comparing: [number, number] | null,
    swapping: [number, number] | null,
    partitionRange: [number, number] | null,
    depth: number
  ) {
    steps.push({
      array: [...arr],
      pivot,
      comparing,
      swapping,
      partitionRange,
      sorted: [...sortedSet],
      action,
      depth,
      comparisons,
      swaps,
    })
  }

  // Lomuto partition with step recording
  function partition(low: number, high: number, depth: number): number {
    const pivotIdx = high
    const pivotVal = arr[pivotIdx]

    // Record: pivot selected
    pushStep('pivot-select', pivotIdx, null, null, [low, high], depth)

    let i = low - 1

    for (let j = low; j < high; j++) {
      comparisons++

      if (arr[j] <= pivotVal) {
        i++
        if (i !== j) {
          // Record compare step (will swap)
          pushStep('compare', pivotIdx, [j, pivotIdx], null, [low, high], depth)

          // Perform swap
          const tmp = arr[i]
          arr[i] = arr[j]
          arr[j] = tmp
          swaps++

          pushStep('swap', pivotIdx, null, [i, j], [low, high], depth)
        } else {
          // Element already in correct relative position, still a compare
          pushStep('compare', pivotIdx, [j, pivotIdx], null, [low, high], depth)
          pushStep('no-swap', pivotIdx, null, null, [low, high], depth)
        }
      } else {
        // arr[j] > pivot — no swap
        pushStep('compare', pivotIdx, [j, pivotIdx], null, [low, high], depth)
        pushStep('no-swap', pivotIdx, null, null, [low, high], depth)
      }
    }

    // Place pivot in its final position: swap arr[i+1] with arr[high]
    const finalPivotIdx = i + 1
    if (finalPivotIdx !== high) {
      const tmp = arr[finalPivotIdx]
      arr[finalPivotIdx] = arr[high]
      arr[high] = tmp
      swaps++
    }

    sortedSet.add(finalPivotIdx)
    pushStep('pivot-place', finalPivotIdx, null, [finalPivotIdx, high], [low, high], depth)

    return finalPivotIdx
  }

  function sort(low: number, high: number, depth: number) {
    if (low >= high) {
      // Single element sub-array is trivially sorted
      if (low === high) {
        sortedSet.add(low)
      }
      return
    }

    if (depth > maxDepth) maxDepth = depth

    const pivotFinal = partition(low, high, depth)
    sort(low, pivotFinal - 1, depth + 1)
    sort(pivotFinal + 1, high, depth + 1)
  }

  if (n > 0) {
    sort(0, n - 1, 0)
  }

  // Final done step — all indices sorted
  const allSorted = Array.from({ length: n }, (_, i) => i)
  steps.push({
    array: [...arr],
    pivot: null,
    comparing: null,
    swapping: null,
    partitionRange: null,
    sorted: allSorted,
    action: 'done',
    depth: 0,
    comparisons,
    swaps,
  })

  return {
    steps,
    totalComparisons: comparisons,
    totalSwaps: swaps,
    maxDepth,
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
