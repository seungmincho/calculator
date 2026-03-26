// Heap Sort algorithm with step-by-step recording for visualization
// Pure functions, no side effects, TypeScript strict

export interface HeapSortStep {
  array: number[]
  action: 'compare' | 'swap' | 'heapify-start' | 'extract' | 'done'
  comparing: [number, number] | null
  swapping: [number, number] | null
  heapSize: number           // current heap size
  sorted: number[]           // indices confirmed sorted (extracted from heap)
  phase: 'build' | 'extract' // build heap phase vs extract phase
  comparisons: number
  swaps: number
}

export interface HeapSortResult {
  steps: HeapSortStep[]
  totalComparisons: number
  totalSwaps: number
}

// Sift down element at index i within heap of given size, recording steps
function siftDown(
  arr: number[],
  i: number,
  heapSize: number,
  sorted: number[],
  phase: 'build' | 'extract',
  steps: HeapSortStep[],
  comparisons: { value: number },
  swaps: { value: number }
): void {
  // Record heapify-start for this subtree root
  steps.push({
    array: [...arr],
    action: 'heapify-start',
    comparing: null,
    swapping: null,
    heapSize,
    sorted: [...sorted],
    phase,
    comparisons: comparisons.value,
    swaps: swaps.value,
  })

  let current = i

  while (true) {
    const left = 2 * current + 1
    const right = 2 * current + 2
    let largest = current

    if (left < heapSize) {
      comparisons.value++
      steps.push({
        array: [...arr],
        action: 'compare',
        comparing: [largest, left],
        swapping: null,
        heapSize,
        sorted: [...sorted],
        phase,
        comparisons: comparisons.value,
        swaps: swaps.value,
      })
      if (arr[left] > arr[largest]) {
        largest = left
      }
    }

    if (right < heapSize) {
      comparisons.value++
      steps.push({
        array: [...arr],
        action: 'compare',
        comparing: [largest, right],
        swapping: null,
        heapSize,
        sorted: [...sorted],
        phase,
        comparisons: comparisons.value,
        swaps: swaps.value,
      })
      if (arr[right] > arr[largest]) {
        largest = right
      }
    }

    if (largest !== current) {
      // Swap current with largest child
      const tmp = arr[current]
      arr[current] = arr[largest]
      arr[largest] = tmp
      swaps.value++

      steps.push({
        array: [...arr],
        action: 'swap',
        comparing: null,
        swapping: [current, largest],
        heapSize,
        sorted: [...sorted],
        phase,
        comparisons: comparisons.value,
        swaps: swaps.value,
      })

      current = largest
    } else {
      break
    }
  }
}

export function heapSort(array: number[]): HeapSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: HeapSortStep[] = []
  const sorted: number[] = []
  const comparisons = { value: 0 }
  const swaps = { value: 0 }

  // Phase 1: Build max-heap (heapify from n/2-1 down to 0)
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    siftDown(arr, i, n, sorted, 'build', steps, comparisons, swaps)
  }

  // Phase 2: Extract elements one by one from heap
  for (let end = n - 1; end > 0; end--) {
    // Swap root (max) with last element in heap
    const tmp = arr[0]
    arr[0] = arr[end]
    arr[end] = tmp
    swaps.value++

    // Record extract step — root moved to sorted position
    sorted.unshift(end)
    steps.push({
      array: [...arr],
      action: 'extract',
      comparing: null,
      swapping: [0, end],
      heapSize: end,
      sorted: [...sorted],
      phase: 'extract',
      comparisons: comparisons.value,
      swaps: swaps.value,
    })

    // Restore heap property on reduced heap
    siftDown(arr, 0, end, sorted, 'extract', steps, comparisons, swaps)
  }

  // Index 0 is now the last remaining element — it is sorted
  if (!sorted.includes(0)) {
    sorted.unshift(0)
  }

  // Final done step
  const allSorted = Array.from({ length: n }, (_, i) => i)
  steps.push({
    array: [...arr],
    action: 'done',
    comparing: null,
    swapping: null,
    heapSize: 0,
    sorted: allSorted,
    phase: 'extract',
    comparisons: comparisons.value,
    swaps: swaps.value,
  })

  return {
    steps,
    totalComparisons: comparisons.value,
    totalSwaps: swaps.value,
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
