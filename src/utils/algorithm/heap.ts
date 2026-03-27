// ── Heap / Priority Queue Algorithm ──────────────────────────────────────────

export type HeapType = 'min' | 'max'

export interface HeapStep {
  action: 'insert' | 'compare' | 'swap' | 'extract-root' | 'move-last' | 'done' | 'heapify-start' | 'heapify-down'
  indices: number[]       // indices involved
  values: number[]        // values at those indices
  description: string     // human-readable
  comparisons: number
  swaps: number
  arraySnapshot: number[] // full array state after this step
}

export interface HeapResult {
  steps: HeapStep[]
  array: number[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parent(i: number): number { return Math.floor((i - 1) / 2) }
function leftChild(i: number): number { return 2 * i + 1 }
function rightChild(i: number): number { return 2 * i + 2 }

function shouldSwap(arr: number[], i: number, j: number, type: HeapType): boolean {
  return type === 'min' ? arr[j] < arr[i] : arr[j] > arr[i]
}

// ── Insert ───────────────────────────────────────────────────────────────────

export function heapInsert(existingArray: number[], value: number, type: HeapType): HeapResult {
  const arr = [...existingArray]
  const steps: HeapStep[] = []
  let comparisons = 0
  let swaps = 0

  arr.push(value)
  steps.push({
    action: 'insert', indices: [arr.length - 1], values: [value],
    description: `Insert ${value} at index ${arr.length - 1}`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  // Bubble up
  let i = arr.length - 1
  while (i > 0) {
    const p = parent(i)
    comparisons++
    steps.push({
      action: 'compare', indices: [i, p], values: [arr[i], arr[p]],
      description: `Compare ${arr[i]} (index ${i}) with parent ${arr[p]} (index ${p})`,
      comparisons, swaps, arraySnapshot: [...arr],
    })

    if (shouldSwap(arr, p, i, type)) {
      ;[arr[i], arr[p]] = [arr[p], arr[i]]
      swaps++
      steps.push({
        action: 'swap', indices: [i, p], values: [arr[i], arr[p]],
        description: `Swap index ${i} and ${p}`,
        comparisons, swaps, arraySnapshot: [...arr],
      })
      i = p
    } else {
      break
    }
  }

  steps.push({
    action: 'done', indices: [i], values: [arr[i]],
    description: `${value} is in correct position at index ${i}`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  return { steps, array: arr }
}

// ── Extract ──────────────────────────────────────────────────────────────────

export function heapExtract(existingArray: number[], type: HeapType): HeapResult {
  if (existingArray.length === 0) return { steps: [], array: [] }

  const arr = [...existingArray]
  const steps: HeapStep[] = []
  let comparisons = 0
  let swaps = 0

  const extracted = arr[0]
  steps.push({
    action: 'extract-root', indices: [0], values: [extracted],
    description: `Extract root ${extracted}`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  if (arr.length === 1) {
    return { steps, array: [] }
  }

  // Move last to root
  arr[0] = arr[arr.length - 1]
  arr.pop()
  steps.push({
    action: 'move-last', indices: [0], values: [arr[0]],
    description: `Move last element ${arr[0]} to root`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  // Bubble down
  let i = 0
  while (true) {
    const l = leftChild(i)
    const r = rightChild(i)
    let target = i

    if (l < arr.length) {
      comparisons++
      if (shouldSwap(arr, target, l, type)) target = l
    }
    if (r < arr.length) {
      comparisons++
      if (shouldSwap(arr, target, r, type)) target = r
    }

    steps.push({
      action: 'compare',
      indices: [i, ...(l < arr.length ? [l] : []), ...(r < arr.length ? [r] : [])],
      values: [arr[i], ...(l < arr.length ? [arr[l]] : []), ...(r < arr.length ? [arr[r]] : [])],
      description: `Compare node ${arr[i]} with children`,
      comparisons, swaps, arraySnapshot: [...arr],
    })

    if (target !== i) {
      ;[arr[i], arr[target]] = [arr[target], arr[i]]
      swaps++
      steps.push({
        action: 'swap', indices: [i, target], values: [arr[i], arr[target]],
        description: `Swap index ${i} and ${target}`,
        comparisons, swaps, arraySnapshot: [...arr],
      })
      i = target
    } else {
      break
    }
  }

  steps.push({
    action: 'done', indices: [i], values: [arr[i]],
    description: `Heap property restored`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  return { steps, array: arr }
}

// ── Heapify (build heap from array) ──────────────────────────────────────────

export function heapify(inputArray: number[], type: HeapType): HeapResult {
  const arr = [...inputArray]
  const steps: HeapStep[] = []
  let comparisons = 0
  let swaps = 0

  steps.push({
    action: 'heapify-start', indices: [], values: [],
    description: `Start heapify on array of ${arr.length} elements`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  // Bottom-up heapify
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    let cur = i

    steps.push({
      action: 'heapify-down', indices: [cur], values: [arr[cur]],
      description: `Heapify-down from index ${cur} (value ${arr[cur]})`,
      comparisons, swaps, arraySnapshot: [...arr],
    })

    while (true) {
      const l = leftChild(cur)
      const r = rightChild(cur)
      let target = cur

      if (l < arr.length) {
        comparisons++
        if (shouldSwap(arr, target, l, type)) target = l
      }
      if (r < arr.length) {
        comparisons++
        if (shouldSwap(arr, target, r, type)) target = r
      }

      steps.push({
        action: 'compare',
        indices: [cur, ...(l < arr.length ? [l] : []), ...(r < arr.length ? [r] : [])],
        values: [arr[cur], ...(l < arr.length ? [arr[l]] : []), ...(r < arr.length ? [arr[r]] : [])],
        description: `Compare node at ${cur} with children`,
        comparisons, swaps, arraySnapshot: [...arr],
      })

      if (target !== cur) {
        ;[arr[cur], arr[target]] = [arr[target], arr[cur]]
        swaps++
        steps.push({
          action: 'swap', indices: [cur, target], values: [arr[cur], arr[target]],
          description: `Swap index ${cur} and ${target}`,
          comparisons, swaps, arraySnapshot: [...arr],
        })
        cur = target
      } else {
        break
      }
    }
  }

  steps.push({
    action: 'done', indices: [], values: [],
    description: `Heap construction complete`,
    comparisons, swaps, arraySnapshot: [...arr],
  })

  return { steps, array: arr }
}

// ── Generators ───────────────────────────────────────────────────────────────

export function generateRandomArray(size: number, min = 1, max = 99): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export function isValidHeap(arr: number[], type: HeapType): boolean {
  for (let i = 0; i < Math.floor(arr.length / 2); i++) {
    const l = leftChild(i)
    const r = rightChild(i)
    if (type === 'min') {
      if (l < arr.length && arr[l] < arr[i]) return false
      if (r < arr.length && arr[r] < arr[i]) return false
    } else {
      if (l < arr.length && arr[l] > arr[i]) return false
      if (r < arr.length && arr[r] > arr[i]) return false
    }
  }
  return true
}

// Tree-layout helpers for canvas
export function getTreeDepth(arrayLength: number): number {
  if (arrayLength === 0) return 0
  return Math.floor(Math.log2(arrayLength)) + 1
}

export function parentIndex(i: number): number { return parent(i) }
export function leftChildIndex(i: number): number { return leftChild(i) }
export function rightChildIndex(i: number): number { return rightChild(i) }
