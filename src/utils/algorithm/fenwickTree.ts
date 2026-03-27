// ── Fenwick Tree (Binary Indexed Tree) Algorithm ─────────────────────────────
// Prefix sum queries and point updates in O(log n)

export type FenwickOperation = 'update' | 'prefix-sum' | 'range-sum'

export interface FenwickStep {
  action: 'build-add' | 'update-visit' | 'update-add' | 'query-visit' | 'query-add' | 'done'
  bitIndex: number           // 1-based index in BIT
  value: number              // value at this BIT index
  accumulator: number        // running sum for queries
  lowbit: number             // i & (-i) for this index
  binaryRepr: string         // binary representation of index
  responsibleRange: [number, number] // [start, end] range this index covers
  description: string
  bitSnapshot: number[]      // full BIT state after this step
}

export interface FenwickResult {
  steps: FenwickStep[]
  bit: number[]              // BIT array (1-based, index 0 unused)
  answer?: number
}

// ── Core ─────────────────────────────────────────────────────────────────────

function lowbit(i: number): number {
  return i & (-i)
}

export function toBinary(i: number, width = 0): string {
  const bin = i.toString(2)
  return width > 0 ? bin.padStart(width, '0') : bin
}

/** Get the range [start, end] (1-based) that BIT[i] is responsible for */
export function responsibleRange(i: number): [number, number] {
  const lb = lowbit(i)
  return [i - lb + 1, i]
}

// ── Build ────────────────────────────────────────────────────────────────────

export function buildFenwickTree(arr: number[]): FenwickResult {
  const n = arr.length
  const bit = new Array(n + 1).fill(0)
  const steps: FenwickStep[] = []

  // Build using prefix sum propagation
  for (let i = 1; i <= n; i++) {
    bit[i] += arr[i - 1]
    const lb = lowbit(i)
    const range = responsibleRange(i)
    steps.push({
      action: 'build-add', bitIndex: i, value: bit[i], accumulator: 0,
      lowbit: lb, binaryRepr: toBinary(i),
      responsibleRange: range,
      description: `BIT[${i}] += arr[${i - 1}] = ${arr[i - 1]}, responsible for [${range[0]},${range[1]}]`,
      bitSnapshot: [...bit],
    })

    // Propagate to parent
    const parent = i + lb
    if (parent <= n) {
      bit[parent] += bit[i]
    }
  }

  return { steps, bit }
}

// ── Point Update ─────────────────────────────────────────────────────────────

export function updateFenwick(
  bitArr: number[], n: number, idx: number, delta: number
): FenwickResult {
  const bit = [...bitArr]
  const steps: FenwickStep[] = []
  let i = idx // 1-based

  while (i <= n) {
    const lb = lowbit(i)
    const range = responsibleRange(i)

    steps.push({
      action: 'update-visit', bitIndex: i, value: bit[i], accumulator: 0,
      lowbit: lb, binaryRepr: toBinary(i),
      responsibleRange: range,
      description: `Visit BIT[${i}] (${toBinary(i)}), lowbit = ${lb}`,
      bitSnapshot: [...bit],
    })

    bit[i] += delta

    steps.push({
      action: 'update-add', bitIndex: i, value: bit[i], accumulator: 0,
      lowbit: lb, binaryRepr: toBinary(i),
      responsibleRange: range,
      description: `BIT[${i}] += ${delta} → ${bit[i]}, next = ${i} + ${lb} = ${i + lb}`,
      bitSnapshot: [...bit],
    })

    i += lb
  }

  steps.push({
    action: 'done', bitIndex: idx, value: delta, accumulator: 0,
    lowbit: 0, binaryRepr: '', responsibleRange: [0, 0],
    description: `Update complete: index ${idx} += ${delta}`,
    bitSnapshot: [...bit],
  })

  return { steps, bit }
}

// ── Prefix Sum Query ─────────────────────────────────────────────────────────

export function prefixSumFenwick(
  bit: number[], idx: number
): FenwickResult {
  const steps: FenwickStep[] = []
  let sum = 0
  let i = idx // 1-based

  while (i > 0) {
    const lb = lowbit(i)
    const range = responsibleRange(i)

    steps.push({
      action: 'query-visit', bitIndex: i, value: bit[i], accumulator: sum,
      lowbit: lb, binaryRepr: toBinary(i),
      responsibleRange: range,
      description: `Visit BIT[${i}] (${toBinary(i)}), lowbit = ${lb}`,
      bitSnapshot: [...bit],
    })

    sum += bit[i]

    steps.push({
      action: 'query-add', bitIndex: i, value: bit[i], accumulator: sum,
      lowbit: lb, binaryRepr: toBinary(i),
      responsibleRange: range,
      description: `sum += BIT[${i}] = ${bit[i]} → sum = ${sum}, next = ${i} - ${lb} = ${i - lb}`,
      bitSnapshot: [...bit],
    })

    i -= lb
  }

  steps.push({
    action: 'done', bitIndex: idx, value: sum, accumulator: sum,
    lowbit: 0, binaryRepr: '', responsibleRange: [0, 0],
    description: `Prefix sum [1..${idx}] = ${sum}`,
    bitSnapshot: [...bit],
  })

  return { steps, bit, answer: sum }
}

// ── Range Sum Query ──────────────────────────────────────────────────────────

export function rangeSumFenwick(
  bit: number[], l: number, r: number
): FenwickResult {
  // sum(l, r) = prefix(r) - prefix(l-1)
  const rResult = prefixSumFenwick(bit, r)
  const lResult = l > 1 ? prefixSumFenwick(bit, l - 1) : { steps: [], bit, answer: 0 }
  const answer = (rResult.answer ?? 0) - (lResult.answer ?? 0)

  // Combine steps
  const steps: FenwickStep[] = [
    ...rResult.steps.filter(s => s.action !== 'done'),
    ...lResult.steps.filter(s => s.action !== 'done'),
    {
      action: 'done', bitIndex: l, value: answer, accumulator: answer,
      lowbit: 0, binaryRepr: '', responsibleRange: [l, r],
      description: `Range sum [${l}..${r}] = prefix(${r}) - prefix(${l - 1}) = ${rResult.answer} - ${lResult.answer} = ${answer}`,
      bitSnapshot: [...bit],
    },
  ]

  return { steps, bit, answer }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function generateRandomArray(size: number, min = 1, max = 20): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

/** Get original array values from BIT (by computing individual prefix sums) */
export function getOriginalArray(bit: number[], n: number): number[] {
  const arr: number[] = []
  for (let i = 1; i <= n; i++) {
    const prefR = prefixSumFenwick(bit, i)
    const prefL = i > 1 ? prefixSumFenwick(bit, i - 1) : { answer: 0 }
    arr.push((prefR.answer ?? 0) - (prefL.answer ?? 0))
  }
  return arr
}

export { lowbit }
