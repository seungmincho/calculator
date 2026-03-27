// ── Types ─────────────────────────────────────────────────────────────────────

export interface RabinKarpStep {
  action: 'compute-pattern-hash' | 'compute-window-hash' | 'hash-match' | 'hash-mismatch'
    | 'verify-start' | 'verify-match' | 'verify-mismatch' | 'found' | 'slide-window' | 'complete'
  windowStart: number
  windowEnd: number
  textHash: number
  patternHash: number
  comparisons: number
  falsePositives: number
  description: string
}

export interface RabinKarpResult {
  steps: RabinKarpStep[]
  matches: number[]
  text: string
  pattern: string
  base: number
  mod: number
  comparisons: number
  falsePositives: number
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const RABIN_KARP_PRESETS: { name: string; text: string; pattern: string }[] = [
  { name: 'basic', text: 'ABCABCABD', pattern: 'ABCABD' },
  { name: 'repeat', text: 'AAAAAAAAAB', pattern: 'AAAB' },
  { name: 'multi', text: 'ABABABABABAB', pattern: 'ABAB' },
  { name: 'collision', text: 'ADBCBDABC', pattern: 'ABC' },
]

// ── Solver ────────────────────────────────────────────────────────────────────

export function solveRabinKarp(
  text: string,
  pattern: string,
  base: number = 256,
  mod: number = 101,
): RabinKarpResult {
  const steps: RabinKarpStep[] = []
  const n = text.length
  const m = pattern.length
  const matches: number[] = []
  let comparisons = 0
  let falsePositives = 0

  if (m > n || m === 0) {
    steps.push({
      action: 'complete', windowStart: 0, windowEnd: 0,
      textHash: 0, patternHash: 0, comparisons: 0, falsePositives: 0,
      description: `No matches (pattern length ${m} > text length ${n})`,
    })
    return { steps, matches, text, pattern, base, mod, comparisons: 0, falsePositives: 0 }
  }

  // Compute h = base^(m-1) % mod
  let h = 1
  for (let i = 0; i < m - 1; i++) h = (h * base) % mod

  // Compute initial hashes
  let patternHash = 0
  let textHash = 0
  for (let i = 0; i < m; i++) {
    patternHash = (patternHash * base + pattern.charCodeAt(i)) % mod
    textHash = (textHash * base + text.charCodeAt(i)) % mod
  }

  steps.push({
    action: 'compute-pattern-hash', windowStart: 0, windowEnd: m - 1,
    textHash, patternHash, comparisons, falsePositives,
    description: `pattern hash = ${patternHash}, window[0..${m - 1}] hash = ${textHash}`,
  })

  // Slide window
  for (let i = 0; i <= n - m; i++) {
    if (i > 0) {
      // Rolling hash update
      textHash = ((textHash - text.charCodeAt(i - 1) * h) * base + text.charCodeAt(i + m - 1)) % mod
      if (textHash < 0) textHash += mod

      steps.push({
        action: 'slide-window', windowStart: i, windowEnd: i + m - 1,
        textHash, patternHash, comparisons, falsePositives,
        description: `slide to [${i}..${i + m - 1}], hash = ${textHash}`,
      })
    }

    // Compare hashes
    if (textHash === patternHash) {
      steps.push({
        action: 'hash-match', windowStart: i, windowEnd: i + m - 1,
        textHash, patternHash, comparisons, falsePositives,
        description: `hash match at ${i}: ${textHash} == ${patternHash}, verifying...`,
      })

      // Verify character by character
      steps.push({
        action: 'verify-start', windowStart: i, windowEnd: i + m - 1,
        textHash, patternHash, comparisons, falsePositives,
        description: `verifying text[${i}..${i + m - 1}] vs pattern`,
      })

      let matched = true
      for (let j = 0; j < m; j++) {
        comparisons++
        if (text[i + j] !== pattern[j]) {
          matched = false
          falsePositives++
          steps.push({
            action: 'verify-mismatch', windowStart: i, windowEnd: i + m - 1,
            textHash, patternHash, comparisons, falsePositives,
            description: `false positive! text[${i + j}]='${text[i + j]}' != pattern[${j}]='${pattern[j]}'`,
          })
          break
        }
      }

      if (matched) {
        matches.push(i)
        steps.push({
          action: 'found', windowStart: i, windowEnd: i + m - 1,
          textHash, patternHash, comparisons, falsePositives,
          description: `match found at index ${i}`,
        })
      }
    } else {
      steps.push({
        action: 'hash-mismatch', windowStart: i, windowEnd: i + m - 1,
        textHash, patternHash, comparisons, falsePositives,
        description: `hash mismatch at ${i}: ${textHash} != ${patternHash}`,
      })
    }
  }

  steps.push({
    action: 'complete', windowStart: n, windowEnd: n,
    textHash: 0, patternHash, comparisons, falsePositives,
    description: `${matches.length} match(es), ${comparisons} comparisons, ${falsePositives} false positive(s)`,
  })

  return { steps, matches, text, pattern, base, mod, comparisons, falsePositives }
}
