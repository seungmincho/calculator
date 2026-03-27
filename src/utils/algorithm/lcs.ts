// ── Types ─────────────────────────────────────────────────────────────────────

export interface LCSStep {
  action: 'init' | 'compare-match' | 'compare-mismatch' | 'fill' | 'traceback-start' | 'traceback-match' | 'traceback-up' | 'traceback-left' | 'done'
  row: number
  col: number
  value: number
  char1?: string
  char2?: string
  description: string
}

export interface LCSResult {
  steps: LCSStep[]
  dp: number[][]
  arrows: ('diag' | 'up' | 'left' | 'none')[][]  // direction arrows for traceback
  tracebackPath: { row: number; col: number }[]
  lcsString: string
  str1: string
  str2: string
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const LCS_PRESETS: { name: string; str1: string; str2: string }[] = [
  { name: 'abcde', str1: 'ABCDE', str2: 'ACE' },
  { name: 'algorithm', str1: 'ALGORITHM', str2: 'ALTRUISTIC' },
  { name: 'dynamic', str1: 'DYNAMIC', str2: 'DICING' },
  { name: 'korea', str1: 'KOREA', str2: 'KARATE' },
]

// ── Solver ────────────────────────────────────────────────────────────────────

export function solveLCS(str1: string, str2: string): LCSResult {
  const m = str1.length
  const n = str2.length
  const steps: LCSStep[] = []

  // dp[i][j] = LCS length of str1[0..i-1] and str2[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  const arrows: ('diag' | 'up' | 'left' | 'none')[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill('none'))

  steps.push({ action: 'init', row: 0, col: 0, value: 0, description: 'DP init' })

  // Fill table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c1 = str1[i - 1]
      const c2 = str2[j - 1]

      if (c1 === c2) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        arrows[i][j] = 'diag'
        steps.push({
          action: 'compare-match', row: i, col: j, value: dp[i][j],
          char1: c1, char2: c2,
          description: `'${c1}' == '${c2}' => dp[${i-1}][${j-1}]+1 = ${dp[i][j]}`,
        })
      } else {
        if (dp[i - 1][j] >= dp[i][j - 1]) {
          dp[i][j] = dp[i - 1][j]
          arrows[i][j] = 'up'
        } else {
          dp[i][j] = dp[i][j - 1]
          arrows[i][j] = 'left'
        }
        steps.push({
          action: 'compare-mismatch', row: i, col: j, value: dp[i][j],
          char1: c1, char2: c2,
          description: `'${c1}' != '${c2}' => max(${dp[i-1][j]}, ${dp[i][j-1]}) = ${dp[i][j]}`,
        })
      }

      steps.push({ action: 'fill', row: i, col: j, value: dp[i][j], description: `dp[${i}][${j}] = ${dp[i][j]}` })
    }
  }

  // Traceback
  const tracebackPath: { row: number; col: number }[] = []
  const lcsChars: string[] = []
  let ti = m, tj = n

  steps.push({ action: 'traceback-start', row: ti, col: tj, value: dp[ti][tj], description: 'traceback' })
  tracebackPath.push({ row: ti, col: tj })

  while (ti > 0 && tj > 0) {
    if (arrows[ti][tj] === 'diag') {
      lcsChars.push(str1[ti - 1])
      steps.push({
        action: 'traceback-match', row: ti, col: tj, value: dp[ti][tj],
        char1: str1[ti - 1],
        description: `'${str1[ti - 1]}' matched`,
      })
      ti--
      tj--
    } else if (arrows[ti][tj] === 'up') {
      steps.push({ action: 'traceback-up', row: ti, col: tj, value: dp[ti][tj], description: 'go up' })
      ti--
    } else {
      steps.push({ action: 'traceback-left', row: ti, col: tj, value: dp[ti][tj], description: 'go left' })
      tj--
    }
    tracebackPath.push({ row: ti, col: tj })
  }

  lcsChars.reverse()
  const lcsString = lcsChars.join('')

  steps.push({ action: 'done', row: 0, col: 0, value: dp[m][n], description: `LCS = "${lcsString}" (len=${dp[m][n]})` })

  return { steps, dp, arrows, tracebackPath, lcsString, str1, str2 }
}
