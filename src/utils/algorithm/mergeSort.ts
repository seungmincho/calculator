// Merge Sort algorithm with step-by-step recording for visualization
// Top-down recursive merge sort (standard two-way merge)
// Pure functions, no side effects, TypeScript strict

export interface MergeSortStep {
  array: number[]                          // full array snapshot
  action: 'split' | 'compare' | 'merge-place' | 'merge-complete' | 'done'
  range: [number, number]                  // [left, right] inclusive — active sub-array
  leftRange: [number, number] | null       // left half range during merge
  rightRange: [number, number] | null      // right half range during merge
  comparing: [number, number] | null       // two indices being compared during merge
  placing: number | null                   // index where element is being placed
  sorted: number[]                         // indices confirmed sorted (fully merged)
  depth: number                            // recursion depth
  comparisons: number                      // total comparisons so far
  merges: number                           // total merge operations so far
}

export interface MergeSortResult {
  steps: MergeSortStep[]
  totalComparisons: number
  totalMerges: number
  maxDepth: number
}

export function mergeSort(array: number[]): MergeSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: MergeSortStep[] = []
  const sortedSet = new Set<number>()
  let comparisons = 0
  let merges = 0
  let maxDepth = 0

  function pushStep(
    action: MergeSortStep['action'],
    range: [number, number],
    leftRange: [number, number] | null,
    rightRange: [number, number] | null,
    comparing: [number, number] | null,
    placing: number | null,
    depth: number
  ) {
    steps.push({
      array: [...arr],
      action,
      range,
      leftRange,
      rightRange,
      comparing,
      placing,
      sorted: [...sortedSet],
      depth,
      comparisons,
      merges,
    })
  }

  // Merge arr[left..mid] and arr[mid+1..right] in-place (via temp buffer)
  function merge(left: number, mid: number, right: number, depth: number) {
    const leftRange: [number, number] = [left, mid]
    const rightRange: [number, number] = [mid + 1, right]
    const range: [number, number] = [left, right]

    // Copy sub-arrays into temp buffers
    const leftBuf = arr.slice(left, mid + 1)
    const rightBuf = arr.slice(mid + 1, right + 1)

    let i = 0       // pointer into leftBuf
    let j = 0       // pointer into rightBuf
    let k = left    // write position in arr

    while (i < leftBuf.length && j < rightBuf.length) {
      comparisons++

      // The two indices in the original array being logically compared
      const leftIdx = left + i
      const rightIdx = mid + 1 + j

      // Record the comparison
      pushStep('compare', range, leftRange, rightRange, [leftIdx, rightIdx], null, depth)

      if (leftBuf[i] <= rightBuf[j]) {
        arr[k] = leftBuf[i]
        i++
      } else {
        arr[k] = rightBuf[j]
        j++
      }
      merges++

      // Record placing the chosen element at position k
      pushStep('merge-place', range, leftRange, rightRange, null, k, depth)

      k++
    }

    // Drain remaining left elements
    while (i < leftBuf.length) {
      arr[k] = leftBuf[i]
      merges++
      pushStep('merge-place', range, leftRange, rightRange, null, k, depth)
      i++
      k++
    }

    // Drain remaining right elements
    while (j < rightBuf.length) {
      arr[k] = rightBuf[j]
      merges++
      pushStep('merge-place', range, leftRange, rightRange, null, k, depth)
      j++
      k++
    }

    // Mark all indices in [left, right] as sorted after a completed merge
    for (let idx = left; idx <= right; idx++) {
      sortedSet.add(idx)
    }

    pushStep('merge-complete', range, leftRange, rightRange, null, null, depth)
  }

  function sort(left: number, right: number, depth: number) {
    if (left >= right) {
      // Single element is trivially sorted — add it but emit no step
      sortedSet.add(left)
      return
    }

    if (depth > maxDepth) maxDepth = depth

    const mid = Math.floor((left + right) / 2)
    const range: [number, number] = [left, right]
    const leftRange: [number, number] = [left, mid]
    const rightRange: [number, number] = [mid + 1, right]

    // Record the split
    pushStep('split', range, leftRange, rightRange, null, null, depth)

    sort(left, mid, depth + 1)
    sort(mid + 1, right, depth + 1)
    merge(left, mid, right, depth)
  }

  if (n > 0) {
    sort(0, n - 1, 0)
  }

  // Final done step — all indices sorted
  const allSorted = Array.from({ length: n }, (_, i) => i)
  allSorted.forEach(i => sortedSet.add(i))

  steps.push({
    array: [...arr],
    action: 'done',
    range: [0, n - 1],
    leftRange: null,
    rightRange: null,
    comparing: null,
    placing: null,
    sorted: allSorted,
    depth: 0,
    comparisons,
    merges,
  })

  return {
    steps,
    totalComparisons: comparisons,
    totalMerges: merges,
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
