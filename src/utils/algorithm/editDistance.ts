// Edit Distance (Levenshtein Distance) — Dynamic Programming
// Pure functions with step-by-step recording for visualization

export interface EDStep {
  action:
    | 'init'
    | 'compare-match'
    | 'compare-mismatch'
    | 'fill'
    | 'traceback-start'
    | 'traceback-match'
    | 'traceback-delete'
    | 'traceback-insert'
    | 'traceback-replace'
    | 'done'
  row: number
  col: number
  value: number
  char1?: string
  char2?: string
  description: string
}

export type EDOperation = 'match' | 'insert' | 'delete' | 'replace'

export interface EDOperationDetail {
  type: EDOperation
  char1?: string
  char2?: string
  position: number    // position in the result
}

export interface EDResult {
  steps: EDStep[]
  dp: number[][]
  arrows: ('diag-match' | 'diag-replace' | 'up' | 'left' | 'none')[][]
  tracebackPath: { row: number; col: number }[]
  operations: EDOperationDetail[]
  distance: number
  str1: string
  str2: string
}

export const ED_PRESETS: { name: string; str1: string; str2: string }[] = [
  { name: 'kitten', str1: 'KITTEN', str2: 'SITTING' },
  { name: 'sunday', str1: 'SUNDAY', str2: 'SATURDAY' },
  { name: 'abc', str1: 'ABC', str2: 'AEC' },
  { name: 'algorithm', str1: 'ALGORITHM', str2: 'ALTRUISTIC' },
  { name: 'korea', str1: 'KOREA', str2: 'KARATE' },
]

// ── Solver ────────────────────────────────────────────────────────────────────

export function solveEditDistance(str1: string, str2: string): EDResult {
  const m = str1.length
  const n = str2.length
  const steps: EDStep[] = []

  // dp[i][j] = edit distance of str1[0..i-1] and str2[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  const arrows: ('diag-match' | 'diag-replace' | 'up' | 'left' | 'none')[][] =
    Array.from({ length: m + 1 }, () => new Array(n + 1).fill('none'))

  // Base cases
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
    if (i > 0) arrows[i][0] = 'up'
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
    if (j > 0) arrows[0][j] = 'left'
  }

  steps.push({ action: 'init', row: 0, col: 0, value: 0, description: 'DP init' })

  // Fill table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c1 = str1[i - 1]
      const c2 = str2[j - 1]

      if (c1 === c2) {
        dp[i][j] = dp[i - 1][j - 1]
        arrows[i][j] = 'diag-match'
        steps.push({
          action: 'compare-match', row: i, col: j, value: dp[i][j],
          char1: c1, char2: c2,
          description: `'${c1}' == '${c2}' => dp[${i - 1}][${j - 1}] = ${dp[i][j]}`,
        })
      } else {
        const deleteCost = dp[i - 1][j] + 1
        const insertCost = dp[i][j - 1] + 1
        const replaceCost = dp[i - 1][j - 1] + 1
        const minCost = Math.min(deleteCost, insertCost, replaceCost)

        dp[i][j] = minCost

        if (minCost === replaceCost) arrows[i][j] = 'diag-replace'
        else if (minCost === deleteCost) arrows[i][j] = 'up'
        else arrows[i][j] = 'left'

        steps.push({
          action: 'compare-mismatch', row: i, col: j, value: dp[i][j],
          char1: c1, char2: c2,
          description: `'${c1}' != '${c2}' => min(${deleteCost},${insertCost},${replaceCost}) = ${minCost}`,
        })
      }

      steps.push({
        action: 'fill', row: i, col: j, value: dp[i][j],
        description: `dp[${i}][${j}] = ${dp[i][j]}`,
      })
    }
  }

  // Traceback
  const tracebackPath: { row: number; col: number }[] = []
  const operations: EDOperationDetail[] = []
  let ti = m, tj = n

  steps.push({
    action: 'traceback-start', row: ti, col: tj, value: dp[ti][tj],
    description: 'traceback',
  })
  tracebackPath.push({ row: ti, col: tj })

  let opPos = 0
  while (ti > 0 || tj > 0) {
    const arrow = arrows[ti][tj]

    if (arrow === 'diag-match' && ti > 0 && tj > 0) {
      steps.push({
        action: 'traceback-match', row: ti, col: tj, value: dp[ti][tj],
        char1: str1[ti - 1], char2: str2[tj - 1],
        description: `'${str1[ti - 1]}' match`,
      })
      operations.push({ type: 'match', char1: str1[ti - 1], char2: str2[tj - 1], position: opPos++ })
      ti--
      tj--
    } else if (arrow === 'diag-replace' && ti > 0 && tj > 0) {
      steps.push({
        action: 'traceback-replace', row: ti, col: tj, value: dp[ti][tj],
        char1: str1[ti - 1], char2: str2[tj - 1],
        description: `replace '${str1[ti - 1]}' -> '${str2[tj - 1]}'`,
      })
      operations.push({ type: 'replace', char1: str1[ti - 1], char2: str2[tj - 1], position: opPos++ })
      ti--
      tj--
    } else if (arrow === 'up' && ti > 0) {
      steps.push({
        action: 'traceback-delete', row: ti, col: tj, value: dp[ti][tj],
        char1: str1[ti - 1],
        description: `delete '${str1[ti - 1]}'`,
      })
      operations.push({ type: 'delete', char1: str1[ti - 1], position: opPos++ })
      ti--
    } else if (tj > 0) {
      steps.push({
        action: 'traceback-insert', row: ti, col: tj, value: dp[ti][tj],
        char2: str2[tj - 1],
        description: `insert '${str2[tj - 1]}'`,
      })
      operations.push({ type: 'insert', char2: str2[tj - 1], position: opPos++ })
      tj--
    } else {
      break
    }
    tracebackPath.push({ row: ti, col: tj })
  }

  operations.reverse()
  const distance = dp[m][n]

  steps.push({
    action: 'done', row: 0, col: 0, value: distance,
    description: `Edit Distance = ${distance}`,
  })

  return { steps, dp, arrows, tracebackPath, operations, distance, str1, str2 }
}
