// Insertion Sort algorithm with step-by-step recording for visualization
// Pure functions, no side effects, TypeScript strict

export interface InsertionSortStep {
  array: number[]
  action: 'select' | 'compare' | 'shift' | 'insert' | 'done'
  current: number | null        // index of element being inserted
  comparing: [number, number] | null
  shifting: number | null       // index being shifted right
  insertAt: number | null       // index where current is inserted
  sorted: number[]              // indices in sorted portion (left side)
  comparisons: number
  shifts: number
}

export interface InsertionSortResult {
  steps: InsertionSortStep[]
  totalComparisons: number
  totalShifts: number
}

export function insertionSort(array: number[]): InsertionSortResult {
  const arr = [...array]
  const n = arr.length
  const steps: InsertionSortStep[] = []
  let comparisons = 0
  let shifts = 0

  // Index 0 is trivially sorted from the start
  const sorted: number[] = [0]

  for (let i = 1; i < n; i++) {
    const key = arr[i]

    // Step: select element at i
    steps.push({
      array: [...arr],
      action: 'select',
      current: i,
      comparing: null,
      shifting: null,
      insertAt: null,
      sorted: [...sorted],
      comparisons,
      shifts,
    })

    let j = i - 1

    while (j >= 0 && arr[j] > key) {
      comparisons++

      // Step: compare arr[j] with key
      steps.push({
        array: [...arr],
        action: 'compare',
        current: i,
        comparing: [j, j + 1],
        shifting: null,
        insertAt: null,
        sorted: [...sorted],
        comparisons,
        shifts,
      })

      // Shift arr[j] to arr[j+1]
      arr[j + 1] = arr[j]
      shifts++

      steps.push({
        array: [...arr],
        action: 'shift',
        current: i,
        comparing: null,
        shifting: j,
        insertAt: null,
        sorted: [...sorted],
        comparisons,
        shifts,
      })

      j--
    }

    // If we exited without shifting, still record the final comparison (key <= arr[j])
    if (j >= 0 && !(arr[j] > key)) {
      comparisons++
      steps.push({
        array: [...arr],
        action: 'compare',
        current: i,
        comparing: [j, j + 1],
        shifting: null,
        insertAt: null,
        sorted: [...sorted],
        comparisons,
        shifts,
      })
    }

    // Insert key at j+1
    arr[j + 1] = key
    sorted.push(i)

    steps.push({
      array: [...arr],
      action: 'insert',
      current: i,
      comparing: null,
      shifting: null,
      insertAt: j + 1,
      sorted: [...sorted],
      comparisons,
      shifts,
    })
  }

  // Final done step
  const allSorted = Array.from({ length: n }, (_, i) => i)
  steps.push({
    array: [...arr],
    action: 'done',
    current: null,
    comparing: null,
    shifting: null,
    insertAt: null,
    sorted: allSorted,
    comparisons,
    shifts,
  })

  return {
    steps,
    totalComparisons: comparisons,
    totalShifts: shifts,
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
