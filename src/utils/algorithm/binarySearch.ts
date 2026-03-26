export interface BinarySearchStep {
  array: number[]
  target: number
  low: number
  high: number
  mid: number
  action: 'compare' | 'found' | 'go-left' | 'go-right' | 'not-found'
  comparison: 'equal' | 'less' | 'greater' | null
  comparisons: number
  eliminated: number // total elements eliminated so far
}

export interface BinarySearchResult {
  steps: BinarySearchStep[]
  foundIndex: number | null
  totalComparisons: number
}

export function binarySearch(array: number[], target: number): BinarySearchResult {
  const steps: BinarySearchStep[] = []
  let low = 0
  let high = array.length - 1
  let comparisons = 0
  let foundIndex: number | null = null

  const eliminated = (lo: number, hi: number) => {
    // Count indices outside [lo, hi]
    return lo + (array.length - 1 - hi)
  }

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    comparisons++

    let comparison: 'equal' | 'less' | 'greater'
    if (array[mid] === target) {
      comparison = 'equal'
    } else if (array[mid] < target) {
      comparison = 'less'
    } else {
      comparison = 'greater'
    }

    // Record 'compare' step first
    steps.push({
      array,
      target,
      low,
      high,
      mid,
      action: 'compare',
      comparison,
      comparisons,
      eliminated: eliminated(low, high),
    })

    if (comparison === 'equal') {
      steps.push({
        array,
        target,
        low,
        high,
        mid,
        action: 'found',
        comparison: 'equal',
        comparisons,
        eliminated: eliminated(low, high),
      })
      foundIndex = mid
      break
    } else if (comparison === 'less') {
      steps.push({
        array,
        target,
        low,
        high,
        mid,
        action: 'go-right',
        comparison: 'less',
        comparisons,
        eliminated: eliminated(low, high),
      })
      low = mid + 1
    } else {
      steps.push({
        array,
        target,
        low,
        high,
        mid,
        action: 'go-left',
        comparison: 'greater',
        comparisons,
        eliminated: eliminated(low, high),
      })
      high = mid - 1
    }
  }

  if (foundIndex === null) {
    steps.push({
      array,
      target,
      low,
      high,
      mid: -1,
      action: 'not-found',
      comparison: null,
      comparisons,
      eliminated: array.length,
    })
  }

  return {
    steps,
    foundIndex,
    totalComparisons: comparisons,
  }
}

export function generateSortedArray(
  size: number,
  min = 1,
  max = 999
): number[] {
  const range = max - min + 1
  // Generate unique values by picking from a shuffled range
  const count = Math.min(size, range)
  const pool = Array.from({ length: range }, (_, i) => i + min)
  // Fisher-Yates partial shuffle
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

export function generateTarget(
  array: number[]
): { target: number; exists: boolean } {
  if (array.length === 0) return { target: 0, exists: false }

  const exists = Math.random() < 0.7
  if (exists) {
    const idx = Math.floor(Math.random() * array.length)
    return { target: array[idx], exists: true }
  }

  // Pick a value not in the array (within range)
  const min = array[0]
  const max = array[array.length - 1]
  const set = new Set(array)
  let candidate: number
  let attempts = 0
  do {
    candidate = min + Math.floor(Math.random() * (max - min + 1))
    attempts++
  } while (set.has(candidate) && attempts < 100)

  if (set.has(candidate)) {
    // Fallback: pick a value outside range
    candidate = max + 1 + Math.floor(Math.random() * 10)
  }

  return { target: candidate, exists: false }
}
