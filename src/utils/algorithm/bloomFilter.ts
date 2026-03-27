// Bloom Filter algorithm
// Pure functions with step-by-step recording for visualization

export interface BloomFilterState {
  bits: boolean[]
  m: number           // bit array size
  k: number           // number of hash functions
  insertedItems: string[]
}

export type BloomStepAction =
  | 'init'
  | 'hash'          // computing hash position
  | 'set-bit'       // setting a bit to 1
  | 'insert-done'   // finished inserting an element
  | 'check-bit'     // checking a bit
  | 'check-positive'
  | 'check-negative'
  | 'check-false-positive'

export interface BloomStep {
  action: BloomStepAction
  value: string
  hashIndex: number         // which hash function (0..k-1)
  bitPosition: number       // position in bit array
  bits: boolean[]           // snapshot
  insertedItems: string[]
  description: string
  bitState?: '1' | '0'     // for check-bit action
}

export interface BloomInsertResult {
  steps: BloomStep[]
  finalBits: boolean[]
}

export interface BloomCheckResult {
  steps: BloomStep[]
  found: boolean
  isFalsePositive: boolean
}

// ---------------------------------------------------------------------------
// Hash functions — simple but distinct hashes for visualization
// ---------------------------------------------------------------------------

function hashFn(value: string, seed: number, m: number): number {
  let h = seed * 31
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) ^ (seed * (i + 1))
    h = h & 0x7fffffff // keep positive
  }
  return ((h % m) + m) % m
}

export function getHashPositions(value: string, k: number, m: number): number[] {
  const positions: number[] = []
  for (let i = 0; i < k; i++) {
    positions.push(hashFn(value, i + 1, m))
  }
  return positions
}

// ---------------------------------------------------------------------------
// Create empty filter
// ---------------------------------------------------------------------------

export function createBloomFilter(m: number, k: number): BloomFilterState {
  return {
    bits: Array(m).fill(false),
    m,
    k,
    insertedItems: [],
  }
}

// ---------------------------------------------------------------------------
// Insert with step recording
// ---------------------------------------------------------------------------

export function bloomInsert(
  state: BloomFilterState,
  value: string,
): BloomInsertResult {
  const steps: BloomStep[] = []
  const bits = [...state.bits]
  const insertedItems = [...state.insertedItems]

  const positions = getHashPositions(value, state.k, state.m)

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]

    // Hash computation step
    steps.push({
      action: 'hash',
      value,
      hashIndex: i,
      bitPosition: pos,
      bits: [...bits],
      insertedItems: [...insertedItems],
      description: 'hash',
    })

    // Set bit step
    bits[pos] = true
    steps.push({
      action: 'set-bit',
      value,
      hashIndex: i,
      bitPosition: pos,
      bits: [...bits],
      insertedItems: [...insertedItems],
      description: 'set-bit',
    })
  }

  insertedItems.push(value)

  steps.push({
    action: 'insert-done',
    value,
    hashIndex: -1,
    bitPosition: -1,
    bits: [...bits],
    insertedItems: [...insertedItems],
    description: 'insert-done',
  })

  return { steps, finalBits: bits }
}

// ---------------------------------------------------------------------------
// Check membership with step recording
// ---------------------------------------------------------------------------

export function bloomCheck(
  state: BloomFilterState,
  value: string,
): BloomCheckResult {
  const steps: BloomStep[] = []
  const positions = getHashPositions(value, state.k, state.m)
  let allSet = true

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]

    // Hash step
    steps.push({
      action: 'hash',
      value,
      hashIndex: i,
      bitPosition: pos,
      bits: [...state.bits],
      insertedItems: [...state.insertedItems],
      description: 'hash',
    })

    // Check bit
    const isSet = state.bits[pos]
    steps.push({
      action: 'check-bit',
      value,
      hashIndex: i,
      bitPosition: pos,
      bits: [...state.bits],
      insertedItems: [...state.insertedItems],
      description: 'check-bit',
      bitState: isSet ? '1' : '0',
    })

    if (!isSet) {
      allSet = false
      // Definitely not in set
      steps.push({
        action: 'check-negative',
        value,
        hashIndex: i,
        bitPosition: pos,
        bits: [...state.bits],
        insertedItems: [...state.insertedItems],
        description: 'check-negative',
      })
      return { steps, found: false, isFalsePositive: false }
    }
  }

  const actuallyInserted = state.insertedItems.includes(value)
  const isFalsePositive = allSet && !actuallyInserted

  if (isFalsePositive) {
    steps.push({
      action: 'check-false-positive',
      value,
      hashIndex: -1,
      bitPosition: -1,
      bits: [...state.bits],
      insertedItems: [...state.insertedItems],
      description: 'check-false-positive',
    })
  } else {
    steps.push({
      action: 'check-positive',
      value,
      hashIndex: -1,
      bitPosition: -1,
      bits: [...state.bits],
      insertedItems: [...state.insertedItems],
      description: 'check-positive',
    })
  }

  return { steps, found: true, isFalsePositive }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function getBloomStats(state: BloomFilterState) {
  const setBits = state.bits.filter(b => b).length
  const fillRate = setBits / state.m
  const n = state.insertedItems.length
  // Theoretical false positive rate: (1 - e^(-kn/m))^k
  const fpRate = n > 0
    ? Math.pow(1 - Math.exp((-state.k * n) / state.m), state.k)
    : 0

  return {
    setBits,
    totalBits: state.m,
    fillRate,
    fpRate,
    insertedCount: n,
  }
}
