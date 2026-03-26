// Radix Sort (LSD) algorithm with step-by-step recording for visualization
// Non-comparison sort — O(d * (n + b)) time, O(n + b) space
// d = number of digits, b = base (10), n = array length
// Pure functions, no side effects, TypeScript strict

export interface RadixSortStep {
  array: number[]          // current array state after each collect phase
  buckets: number[][]      // 10 buckets (0-9), populated during distribute
  action: 'distribute' | 'collect' | 'digit-complete' | 'done'
  currentDigit: number     // which digit position (0=ones, 1=tens, 2=hundreds …)
  highlightIndex: number | null  // index in array being moved
  highlightBucket: number | null // bucket (0-9) receiving/releasing element
  highlightDigit: number | null  // digit value extracted from highlighted element
}

export interface RadixSortResult {
  steps: RadixSortStep[]
  totalDigits: number
}

// ── Helpers ──

function getDigit(n: number, d: number): number {
  return Math.floor(n / Math.pow(10, d)) % 10
}

function numDigits(n: number): number {
  if (n === 0) return 1
  return Math.floor(Math.log10(n)) + 1
}

function emptyBuckets(): number[][] {
  return Array.from({ length: 10 }, () => [])
}

// ── Main algorithm ──

export function radixSort(array: number[]): RadixSortResult {
  if (array.length === 0) return { steps: [], totalDigits: 0 }

  const arr = [...array]
  const steps: RadixSortStep[] = []
  const maxVal = Math.max(...arr)
  const totalDigits = numDigits(maxVal)

  let current = [...arr]

  for (let d = 0; d < totalDigits; d++) {
    const buckets = emptyBuckets()

    // ── Distribute: place each element into its bucket ──
    for (let i = 0; i < current.length; i++) {
      const digit = getDigit(current[i], d)
      buckets[digit].push(current[i])
      steps.push({
        array: [...current],
        buckets: buckets.map(b => [...b]),
        action: 'distribute',
        currentDigit: d,
        highlightIndex: i,
        highlightBucket: digit,
        highlightDigit: digit,
      })
    }

    // ── Collect: read back from buckets in order ──
    const collected: number[] = []
    for (let b = 0; b < 10; b++) {
      for (let j = 0; j < buckets[b].length; j++) {
        collected.push(buckets[b][j])
        steps.push({
          array: [...collected, ...current.slice(collected.length)],
          buckets: buckets.map(bkt => [...bkt]),
          action: 'collect',
          currentDigit: d,
          highlightIndex: collected.length - 1,
          highlightBucket: b,
          highlightDigit: getDigit(buckets[b][j], d),
        })
      }
    }
    current = [...collected]

    // ── Digit complete: show stable array after this pass ──
    steps.push({
      array: [...current],
      buckets: emptyBuckets(),
      action: 'digit-complete',
      currentDigit: d,
      highlightIndex: null,
      highlightBucket: null,
      highlightDigit: null,
    })
  }

  // ── Done ──
  steps.push({
    array: [...current],
    buckets: emptyBuckets(),
    action: 'done',
    currentDigit: totalDigits - 1,
    highlightIndex: null,
    highlightBucket: null,
    highlightDigit: null,
  })

  return { steps, totalDigits }
}

// ── Array generators ──

export function generateRandomArray(
  size: number,
  min: number = 0,
  max: number = 999
): number[] {
  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  )
}

/** All values have the same number of digits (100-999 range) */
export function generateSameDigits(size: number): number[] {
  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * 900) + 100
  )
}
