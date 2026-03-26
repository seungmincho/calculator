// Bubble Sort algorithm with step-by-step recording for visualization
// Pure functions, no side effects, TypeScript strict

export interface SortStep {
  array: number[]                       // snapshot of the array at this step
  comparing: [number, number] | null    // indices being compared
  swapping: [number, number] | null     // indices being swapped (null if no swap)
  sorted: number[]                      // indices confirmed sorted (at the end)
  action: 'compare' | 'swap' | 'no-swap' | 'pass-complete' | 'done'
  passNumber: number                    // which pass (outer loop iteration, 0-indexed)
  comparisons: number                   // total comparisons so far
  swaps: number                         // total swaps so far
}

export interface SortResult {
  steps: SortStep[]
  totalComparisons: number
  totalSwaps: number
  totalPasses: number
}

export function bubbleSort(array: number[]): SortResult {
  const arr = [...array]
  const n = arr.length
  const steps: SortStep[] = []
  const sorted: number[] = []
  let comparisons = 0
  let swaps = 0
  let pass = 0

  for (let i = 0; i < n - 1; i++) {
    let swappedInPass = false

    for (let j = 0; j < n - 1 - i; j++) {
      comparisons++

      // Record compare step
      steps.push({
        array: [...arr],
        comparing: [j, j + 1],
        swapping: null,
        sorted: [...sorted],
        action: 'compare',
        passNumber: pass,
        comparisons,
        swaps,
      })

      if (arr[j] > arr[j + 1]) {
        // Swap
        const tmp = arr[j]
        arr[j] = arr[j + 1]
        arr[j + 1] = tmp
        swaps++
        swappedInPass = true

        steps.push({
          array: [...arr],
          comparing: null,
          swapping: [j, j + 1],
          sorted: [...sorted],
          action: 'swap',
          passNumber: pass,
          comparisons,
          swaps,
        })
      } else {
        steps.push({
          array: [...arr],
          comparing: null,
          swapping: null,
          sorted: [...sorted],
          action: 'no-swap',
          passNumber: pass,
          comparisons,
          swaps,
        })
      }
    }

    // After this pass, the element at index n-1-i is in its final position
    sorted.unshift(n - 1 - i)

    steps.push({
      array: [...arr],
      comparing: null,
      swapping: null,
      sorted: [...sorted],
      action: 'pass-complete',
      passNumber: pass,
      comparisons,
      swaps,
    })

    pass++

    // Early termination: no swaps means array is already sorted
    if (!swappedInPass) {
      // Mark remaining indices as sorted
      for (let k = 0; k < n - 1 - i; k++) {
        if (!sorted.includes(k)) sorted.unshift(k)
      }
      break
    }
  }

  // If we completed all passes without early termination, index 0 is also sorted
  if (!sorted.includes(0)) {
    sorted.unshift(0)
  }

  // Final done step with all indices sorted
  const allSorted = Array.from({ length: n }, (_, i) => i)
  steps.push({
    array: [...arr],
    comparing: null,
    swapping: null,
    sorted: allSorted,
    action: 'done',
    passNumber: pass,
    comparisons,
    swaps,
  })

  return {
    steps,
    totalComparisons: comparisons,
    totalSwaps: swaps,
    totalPasses: pass,
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
