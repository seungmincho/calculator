// ── Types ─────────────────────────────────────────────────────────────────────

export interface KMPStep {
  action: 'build-failure-init' | 'build-failure-match' | 'build-failure-mismatch' | 'build-failure-set'
    | 'search-compare' | 'search-match' | 'search-mismatch' | 'search-shift' | 'search-found' | 'search-complete'
  textIdx: number
  patIdx: number
  value: number            // failure value or match count
  description: string
  phase: 'failure' | 'search'
}

export interface KMPResult {
  steps: KMPStep[]
  failure: number[]
  matches: number[]        // starting indices of matches in text
  text: string
  pattern: string
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const KMP_PRESETS: { name: string; text: string; pattern: string }[] = [
  { name: 'basic', text: 'ABABABCABABAB', pattern: 'ABABC' },
  { name: 'repeat', text: 'AAAABAAAABAAA', pattern: 'AAAB' },
  { name: 'hello', text: 'HELLOHELLWORLD', pattern: 'HELL' },
  { name: 'abcabc', text: 'ABCABCABDABCABC', pattern: 'ABCABD' },
]

// ── Solver ────────────────────────────────────────────────────────────────────

export function solveKMP(text: string, pattern: string): KMPResult {
  const steps: KMPStep[] = []
  const m = pattern.length
  const n = text.length
  const failure: number[] = new Array(m).fill(0)
  const matches: number[] = []

  // Phase 1: Build failure function
  steps.push({
    action: 'build-failure-init', textIdx: 0, patIdx: 0, value: 0,
    description: 'failure[0] = 0', phase: 'failure',
  })

  let len = 0  // length of previous longest prefix suffix
  let i = 1

  while (i < m) {
    if (pattern[i] === pattern[len]) {
      len++
      failure[i] = len
      steps.push({
        action: 'build-failure-match', textIdx: i, patIdx: len - 1, value: len,
        description: `'${pattern[i]}'=='${pattern[len - 1]}' => failure[${i}]=${len}`,
        phase: 'failure',
      })
      steps.push({
        action: 'build-failure-set', textIdx: i, patIdx: len, value: len,
        description: `failure[${i}] = ${len}`, phase: 'failure',
      })
      i++
    } else {
      if (len !== 0) {
        steps.push({
          action: 'build-failure-mismatch', textIdx: i, patIdx: len, value: failure[len - 1],
          description: `'${pattern[i]}'!='${pattern[len]}' => len=failure[${len - 1}]=${failure[len - 1]}`,
          phase: 'failure',
        })
        len = failure[len - 1]
      } else {
        failure[i] = 0
        steps.push({
          action: 'build-failure-set', textIdx: i, patIdx: 0, value: 0,
          description: `failure[${i}] = 0`, phase: 'failure',
        })
        i++
      }
    }
  }

  // Phase 2: Search
  let ti = 0  // text index
  let pi = 0  // pattern index

  while (ti < n) {
    steps.push({
      action: 'search-compare', textIdx: ti, patIdx: pi, value: matches.length,
      description: `text[${ti}]='${text[ti]}' vs pat[${pi}]='${pattern[pi]}'`,
      phase: 'search',
    })

    if (text[ti] === pattern[pi]) {
      steps.push({
        action: 'search-match', textIdx: ti, patIdx: pi, value: matches.length,
        description: `'${text[ti]}'=='${pattern[pi]}'`,
        phase: 'search',
      })
      ti++
      pi++

      if (pi === m) {
        const matchStart = ti - m
        matches.push(matchStart)
        steps.push({
          action: 'search-found', textIdx: matchStart, patIdx: 0, value: matches.length,
          description: `match at index ${matchStart}`,
          phase: 'search',
        })
        pi = failure[pi - 1]

        steps.push({
          action: 'search-shift', textIdx: ti, patIdx: pi, value: matches.length,
          description: `shift: pi=failure[${m - 1}]=${pi}`,
          phase: 'search',
        })
      }
    } else {
      if (pi !== 0) {
        steps.push({
          action: 'search-mismatch', textIdx: ti, patIdx: pi, value: matches.length,
          description: `mismatch, pi=failure[${pi - 1}]=${failure[pi - 1]}`,
          phase: 'search',
        })
        pi = failure[pi - 1]

        steps.push({
          action: 'search-shift', textIdx: ti, patIdx: pi, value: matches.length,
          description: `shift pattern to pi=${pi}`,
          phase: 'search',
        })
      } else {
        steps.push({
          action: 'search-mismatch', textIdx: ti, patIdx: pi, value: matches.length,
          description: `mismatch at start, advance text`,
          phase: 'search',
        })
        ti++
      }
    }
  }

  steps.push({
    action: 'search-complete', textIdx: n, patIdx: 0, value: matches.length,
    description: `${matches.length} match(es)`,
    phase: 'search',
  })

  return { steps, failure, matches, text, pattern }
}
