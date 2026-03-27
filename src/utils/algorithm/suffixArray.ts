// ── Types ─────────────────────────────────────────────────────────────────────

export interface SuffixArrayStep {
  action: 'init-suffixes' | 'sort-compare' | 'sort-swap' | 'sort-complete'
    | 'lcp-compute' | 'lcp-complete' | 'search-start' | 'search-mid' | 'search-match' | 'search-narrow' | 'search-found' | 'search-not-found' | 'complete'
  phase: 'build' | 'lcp' | 'search'
  suffixArray: number[]
  lcpArray: number[]
  highlightIndices: number[]   // indices in SA being compared/highlighted
  searchLo?: number
  searchHi?: number
  searchMid?: number
  description: string
}

export interface SuffixArrayResult {
  steps: SuffixArrayStep[]
  text: string
  suffixArray: number[]
  lcpArray: number[]
  matches: number[]        // original string indices where pattern was found
  pattern: string
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const SUFFIX_ARRAY_PRESETS: { name: string; text: string; pattern: string }[] = [
  { name: 'banana', text: 'BANANA$', pattern: 'ANA' },
  { name: 'abcabc', text: 'ABCABC$', pattern: 'ABC' },
  { name: 'mississippi', text: 'MISSISSIPPI$', pattern: 'ISSI' },
  { name: 'abracadabra', text: 'ABRACADABRA$', pattern: 'ABRA' },
]

// ── Solver ────────────────────────────────────────────────────────────────────

export function buildSuffixArray(text: string, pattern: string): SuffixArrayResult {
  const steps: SuffixArrayStep[] = []
  const n = text.length
  const matches: number[] = []

  // 1. Initialize suffix indices
  const sa: number[] = Array.from({ length: n }, (_, i) => i)

  steps.push({
    action: 'init-suffixes', phase: 'build',
    suffixArray: [...sa], lcpArray: [],
    highlightIndices: [],
    description: `Initialize ${n} suffixes`,
  })

  // 2. Sort suffixes (using JS sort for clarity, recording key comparisons)
  // We record a limited number of comparison steps to avoid explosion
  let sortStepCount = 0
  const maxSortSteps = 40

  sa.sort((a, b) => {
    const sa1 = text.substring(a)
    const sb1 = text.substring(b)
    const cmp = sa1 < sb1 ? -1 : sa1 > sb1 ? 1 : 0
    if (sortStepCount < maxSortSteps) {
      sortStepCount++
      steps.push({
        action: 'sort-compare', phase: 'build',
        suffixArray: [...sa], lcpArray: [],
        highlightIndices: [a, b],
        description: `compare "${text.substring(a, a + 6)}${a + 6 < n ? '...' : ''}" vs "${text.substring(b, b + 6)}${b + 6 < n ? '...' : ''}"`,
      })
    }
    return cmp
  })

  steps.push({
    action: 'sort-complete', phase: 'build',
    suffixArray: [...sa], lcpArray: [],
    highlightIndices: [],
    description: `Suffix array built: [${sa.join(', ')}]`,
  })

  // 3. Compute LCP array using Kasai's algorithm
  const rank: number[] = new Array(n).fill(0)
  for (let i = 0; i < n; i++) rank[sa[i]] = i

  const lcp: number[] = new Array(n).fill(0)
  let k = 0

  for (let i = 0; i < n; i++) {
    if (rank[i] === 0) { k = 0; continue }
    const j = sa[rank[i] - 1]
    while (i + k < n && j + k < n && text[i + k] === text[j + k]) k++
    lcp[rank[i]] = k

    if (steps.length < 120) {
      steps.push({
        action: 'lcp-compute', phase: 'lcp',
        suffixArray: [...sa], lcpArray: [...lcp],
        highlightIndices: [sa[rank[i]], sa[rank[i] - 1]],
        description: `LCP[${rank[i]}] = ${k} (between "${text.substring(j, j + 6)}..." and "${text.substring(i, i + 6)}...")`,
      })
    }

    if (k > 0) k--
  }

  steps.push({
    action: 'lcp-complete', phase: 'lcp',
    suffixArray: [...sa], lcpArray: [...lcp],
    highlightIndices: [],
    description: `LCP array: [${lcp.join(', ')}]`,
  })

  // 4. Binary search for pattern
  if (pattern.length > 0) {
    let lo = 0
    let hi = n - 1
    let foundLo = -1
    let foundHi = -1

    steps.push({
      action: 'search-start', phase: 'search',
      suffixArray: [...sa], lcpArray: [...lcp],
      highlightIndices: [], searchLo: lo, searchHi: hi,
      description: `Binary search for "${pattern}" in SA[0..${n - 1}]`,
    })

    // Find lower bound
    lo = 0; hi = n - 1
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const suffix = text.substring(sa[mid], Math.min(sa[mid] + pattern.length, n))

      steps.push({
        action: 'search-mid', phase: 'search',
        suffixArray: [...sa], lcpArray: [...lcp],
        highlightIndices: [sa[mid]], searchLo: lo, searchHi: hi, searchMid: mid,
        description: `mid=${mid}, SA[${mid}]=${sa[mid]}, suffix="${suffix}"`,
      })

      if (suffix < pattern) {
        steps.push({
          action: 'search-narrow', phase: 'search',
          suffixArray: [...sa], lcpArray: [...lcp],
          highlightIndices: [sa[mid]], searchLo: mid + 1, searchHi: hi, searchMid: mid,
          description: `"${suffix}" < "${pattern}", lo = ${mid + 1}`,
        })
        lo = mid + 1
      } else {
        if (suffix.startsWith(pattern)) foundLo = mid
        steps.push({
          action: 'search-narrow', phase: 'search',
          suffixArray: [...sa], lcpArray: [...lcp],
          highlightIndices: [sa[mid]], searchLo: lo, searchHi: mid - 1, searchMid: mid,
          description: `"${suffix}" >= "${pattern}", hi = ${mid - 1}`,
        })
        hi = mid - 1
      }
    }

    // Find upper bound
    if (foundLo !== -1) {
      lo = foundLo; hi = n - 1
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2)
        const suffix = text.substring(sa[mid], Math.min(sa[mid] + pattern.length, n))

        if (suffix.startsWith(pattern) || suffix <= pattern) {
          if (suffix.startsWith(pattern)) foundHi = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }

      // Collect matches
      for (let i = foundLo; i <= foundHi; i++) {
        matches.push(sa[i])
      }

      steps.push({
        action: 'search-found', phase: 'search',
        suffixArray: [...sa], lcpArray: [...lcp],
        highlightIndices: matches,
        searchLo: foundLo, searchHi: foundHi,
        description: `Found "${pattern}" at indices: [${matches.sort((a, b) => a - b).join(', ')}]`,
      })
    } else {
      steps.push({
        action: 'search-not-found', phase: 'search',
        suffixArray: [...sa], lcpArray: [...lcp],
        highlightIndices: [],
        description: `"${pattern}" not found`,
      })
    }
  }

  steps.push({
    action: 'complete', phase: 'search',
    suffixArray: [...sa], lcpArray: [...lcp],
    highlightIndices: matches,
    description: `Done. SA size=${n}, ${matches.length} match(es)`,
  })

  return { steps, text, suffixArray: sa, lcpArray: lcp, matches: matches.sort((a, b) => a - b), pattern }
}
