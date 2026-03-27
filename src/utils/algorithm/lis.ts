// ── Types ─────────────────────────────────────────────────────────────────────

export type LisMethod = 'dp' | 'binary-search'

export interface LisStep {
  action: 'init' | 'compare' | 'update-dp' | 'fill-dp' | 'bs-append' | 'bs-replace' | 'bs-search' | 'backtrack' | 'done'
  index: number            // current element index
  value: number            // arr[index]
  dpOrTails: number[]      // snapshot of dp array or tails array
  lisIndices?: number[]    // indices that form LIS (during backtrack/done)
  compareIndex?: number    // index being compared to
  insertPos?: number       // position in tails for binary search method
  description: string
}

export interface LisResult {
  steps: LisStep[]
  arr: number[]
  lisLength: number
  lisIndices: number[]     // indices of LIS elements in original array
  lisValues: number[]
  method: LisMethod
  dpArray?: number[]       // dp method: dp[i] = LIS length ending at i
  tailsArray?: number[]    // binary search method: tails array
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const LIS_PRESETS: { name: string; arr: number[] }[] = [
  { name: 'basic', arr: [10, 9, 2, 5, 3, 7, 101, 18] },
  { name: 'zigzag', arr: [3, 1, 4, 1, 5, 9, 2, 6, 5] },
  { name: 'sorted', arr: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: 'reverse', arr: [8, 7, 6, 5, 4, 3, 2, 1] },
]

// ── DP Solver O(n^2) ─────────────────────────────────────────────────────────

export function solveLisDP(arr: number[]): LisResult {
  const n = arr.length
  const steps: LisStep[] = []
  const dp = new Array(n).fill(1)       // dp[i] = LIS length ending at arr[i]
  const parent = new Array(n).fill(-1)  // for backtracking

  steps.push({
    action: 'init', index: 0, value: arr[0],
    dpOrTails: [...dp],
    description: 'dp[i] = 1 for all i',
  })

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      steps.push({
        action: 'compare', index: i, value: arr[i],
        compareIndex: j, dpOrTails: [...dp],
        description: `arr[${j}]=${arr[j]} < arr[${i}]=${arr[i]}? ${arr[j] < arr[i] ? 'Yes' : 'No'}`,
      })

      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        parent[i] = j
        steps.push({
          action: 'update-dp', index: i, value: arr[i],
          compareIndex: j, dpOrTails: [...dp],
          description: `dp[${i}] = dp[${j}]+1 = ${dp[i]}`,
        })
      }
    }

    steps.push({
      action: 'fill-dp', index: i, value: arr[i],
      dpOrTails: [...dp],
      description: `dp[${i}] = ${dp[i]}`,
    })
  }

  // Find max and backtrack
  let maxLen = 0
  let maxIdx = 0
  for (let i = 0; i < n; i++) {
    if (dp[i] > maxLen) { maxLen = dp[i]; maxIdx = i }
  }

  const lisIndices: number[] = []
  let idx = maxIdx
  while (idx !== -1) {
    lisIndices.push(idx)
    steps.push({
      action: 'backtrack', index: idx, value: arr[idx],
      dpOrTails: [...dp], lisIndices: [...lisIndices],
      description: `backtrack: arr[${idx}]=${arr[idx]}`,
    })
    idx = parent[idx]
  }
  lisIndices.reverse()

  steps.push({
    action: 'done', index: -1, value: maxLen,
    dpOrTails: [...dp], lisIndices: [...lisIndices],
    description: `LIS length = ${maxLen}`,
  })

  return {
    steps, arr, lisLength: maxLen, lisIndices,
    lisValues: lisIndices.map(i => arr[i]),
    method: 'dp', dpArray: dp,
  }
}

// ── Binary Search Solver O(n log n) ──────────────────────────────────────────

function lowerBound(tails: number[], target: number): number {
  let lo = 0, hi = tails.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (tails[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function solveLisBinarySearch(arr: number[]): LisResult {
  const n = arr.length
  const steps: LisStep[] = []
  const tails: number[] = []
  const tailIndices: number[] = []  // actual indices in arr for each tails position
  const parent = new Array(n).fill(-1)

  steps.push({
    action: 'init', index: 0, value: arr[0],
    dpOrTails: [],
    description: 'tails = []',
  })

  for (let i = 0; i < n; i++) {
    const pos = lowerBound(tails, arr[i])

    steps.push({
      action: 'bs-search', index: i, value: arr[i],
      dpOrTails: [...tails], insertPos: pos,
      description: `lower_bound(${arr[i]}) = ${pos}`,
    })

    if (pos === tails.length) {
      // Append
      if (tails.length > 0) parent[i] = tailIndices[tails.length - 1]
      tails.push(arr[i])
      tailIndices.push(i)
      steps.push({
        action: 'bs-append', index: i, value: arr[i],
        dpOrTails: [...tails], insertPos: pos,
        description: `append ${arr[i]}, tails length = ${tails.length}`,
      })
    } else {
      // Replace
      if (pos > 0) parent[i] = tailIndices[pos - 1]
      tails[pos] = arr[i]
      tailIndices[pos] = i
      steps.push({
        action: 'bs-replace', index: i, value: arr[i],
        dpOrTails: [...tails], insertPos: pos,
        description: `replace tails[${pos}] = ${arr[i]}`,
      })
    }
  }

  // Backtrack from the last element in tailIndices
  const lisIndices: number[] = []
  let idx = tailIndices[tails.length - 1]
  while (idx !== -1) {
    lisIndices.push(idx)
    steps.push({
      action: 'backtrack', index: idx, value: arr[idx],
      dpOrTails: [...tails], lisIndices: [...lisIndices],
      description: `backtrack: arr[${idx}]=${arr[idx]}`,
    })
    idx = parent[idx]
  }
  lisIndices.reverse()

  steps.push({
    action: 'done', index: -1, value: tails.length,
    dpOrTails: [...tails], lisIndices: [...lisIndices],
    description: `LIS length = ${tails.length}`,
  })

  return {
    steps, arr, lisLength: tails.length, lisIndices,
    lisValues: lisIndices.map(i => arr[i]),
    method: 'binary-search', tailsArray: [...tails],
  }
}
