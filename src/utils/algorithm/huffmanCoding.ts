// ── Types ─────────────────────────────────────────────────────────────────────

export interface HuffmanNode {
  char: string | null       // null for internal nodes
  freq: number
  left: HuffmanNode | null
  right: HuffmanNode | null
  id: number                // unique node id for rendering
}

export interface HuffmanStep {
  action: 'count-freq' | 'init-heap' | 'extract-min' | 'merge' | 'assign-code' | 'encode-char' | 'complete'
  description: string
  heap: HuffmanNode[]       // current min-heap state (shallow copies)
  tree: HuffmanNode | null  // current tree root (null until built)
  highlightNodes: number[]  // node ids to highlight
  codeTable: Record<string, string>
  encodedSoFar: string
  phase: 'build' | 'encode'
}

export interface HuffmanResult {
  steps: HuffmanStep[]
  tree: HuffmanNode
  codeTable: Record<string, string>
  freqMap: Record<string, number>
  encoded: string
  originalBits: number
  compressedBits: number
  text: string
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const HUFFMAN_PRESETS: { name: string; text: string }[] = [
  { name: 'simple', text: 'AAAAABBBCCCD' },
  { name: 'hello', text: 'HELLO WORLD' },
  { name: 'abcabc', text: 'ABRACADABRA' },
  { name: 'skewed', text: 'AAAAAAAABBCD' },
]

// ── Solver ────────────────────────────────────────────────────────────────────

let nextId = 0

function makeNode(char: string | null, freq: number, left: HuffmanNode | null = null, right: HuffmanNode | null = null): HuffmanNode {
  return { char, freq, left, right, id: nextId++ }
}

function heapPush(heap: HuffmanNode[], node: HuffmanNode) {
  heap.push(node)
  let i = heap.length - 1
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2)
    if (heap[parent].freq <= heap[i].freq) break
    ;[heap[parent], heap[i]] = [heap[i], heap[parent]]
    i = parent
  }
}

function heapPop(heap: HuffmanNode[]): HuffmanNode {
  const top = heap[0]
  const last = heap.pop()!
  if (heap.length > 0) {
    heap[0] = last
    let i = 0
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < heap.length && heap[l].freq < heap[smallest].freq) smallest = l
      if (r < heap.length && heap[r].freq < heap[smallest].freq) smallest = r
      if (smallest === i) break
      ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
      i = smallest
    }
  }
  return top
}

function buildCodeTable(node: HuffmanNode | null, prefix: string, table: Record<string, string>) {
  if (!node) return
  if (node.char !== null) {
    table[node.char] = prefix || '0' // single character edge case
    return
  }
  buildCodeTable(node.left, prefix + '0', table)
  buildCodeTable(node.right, prefix + '1', table)
}

function cloneHeap(heap: HuffmanNode[]): HuffmanNode[] {
  return heap.map(n => ({ ...n }))
}

export function solveHuffman(text: string): HuffmanResult {
  nextId = 0
  const steps: HuffmanStep[] = []

  // Phase 1: Count frequencies
  const freqMap: Record<string, number> = {}
  for (const ch of text) {
    freqMap[ch] = (freqMap[ch] || 0) + 1
  }

  const emptyCode: Record<string, string> = {}

  steps.push({
    action: 'count-freq',
    description: `${Object.keys(freqMap).length} unique chars`,
    heap: [],
    tree: null,
    highlightNodes: [],
    codeTable: emptyCode,
    encodedSoFar: '',
    phase: 'build',
  })

  // Phase 2: Initialize min-heap
  const heap: HuffmanNode[] = []
  const charNodes: HuffmanNode[] = []
  for (const [ch, freq] of Object.entries(freqMap).sort((a, b) => a[1] - b[1])) {
    const node = makeNode(ch, freq)
    charNodes.push(node)
    heapPush(heap, node)
  }

  steps.push({
    action: 'init-heap',
    description: `heap: [${heap.map(n => `'${n.char}':${n.freq}`).join(', ')}]`,
    heap: cloneHeap(heap),
    tree: null,
    highlightNodes: heap.map(n => n.id),
    codeTable: emptyCode,
    encodedSoFar: '',
    phase: 'build',
  })

  // Phase 3: Build tree
  while (heap.length > 1) {
    const left = heapPop(heap)
    const right = heapPop(heap)

    steps.push({
      action: 'extract-min',
      description: `extract '${left.char ?? '(' + left.freq + ')'}':${left.freq} + '${right.char ?? '(' + right.freq + ')'}':${right.freq}`,
      heap: cloneHeap(heap),
      tree: null,
      highlightNodes: [left.id, right.id],
      codeTable: emptyCode,
      encodedSoFar: '',
      phase: 'build',
    })

    const merged = makeNode(null, left.freq + right.freq, left, right)
    heapPush(heap, merged)

    steps.push({
      action: 'merge',
      description: `merge => freq=${merged.freq}`,
      heap: cloneHeap(heap),
      tree: heap.length === 1 ? merged : null,
      highlightNodes: [merged.id],
      codeTable: emptyCode,
      encodedSoFar: '',
      phase: 'build',
    })
  }

  const tree = heap[0]

  // Phase 4: Assign codes
  const codeTable: Record<string, string> = {}
  buildCodeTable(tree, '', codeTable)

  steps.push({
    action: 'assign-code',
    description: Object.entries(codeTable).map(([c, code]) => `'${c}'=${code}`).join(', '),
    heap: [],
    tree,
    highlightNodes: [],
    codeTable: { ...codeTable },
    encodedSoFar: '',
    phase: 'build',
  })

  // Phase 5: Encode
  let encoded = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const code = codeTable[ch]
    encoded += code

    steps.push({
      action: 'encode-char',
      description: `'${ch}' => ${code}`,
      heap: [],
      tree,
      highlightNodes: [],
      codeTable: { ...codeTable },
      encodedSoFar: encoded,
      phase: 'encode',
    })
  }

  const originalBits = text.length * 8
  const compressedBits = encoded.length

  steps.push({
    action: 'complete',
    description: `${originalBits} => ${compressedBits} bits (${((1 - compressedBits / originalBits) * 100).toFixed(1)}%)`,
    heap: [],
    tree,
    highlightNodes: [],
    codeTable: { ...codeTable },
    encodedSoFar: encoded,
    phase: 'encode',
  })

  return { steps, tree, codeTable, freqMap, encoded, originalBits, compressedBits, text }
}
