// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrieNode {
  id: number
  char: string            // character on edge leading to this node
  children: Map<string, number>  // char -> node id
  isEnd: boolean
  depth: number
  word?: string           // full word if isEnd
}

export type TrieOperation = 'insert' | 'search' | 'autocomplete'

export interface TrieStep {
  action: 'traverse' | 'create' | 'mark-end' | 'found' | 'not-found' | 'autocomplete-collect' | 'autocomplete-done'
  nodeId: number
  char: string
  depth: number
  word?: string
  description: string
}

export interface TrieResult {
  steps: TrieStep[]
  nodes: Map<number, TrieNode>
  rootId: number
  found?: boolean
  suggestions?: string[]
}

// ── Default words ────────────────────────────────────────────────────────────

export const DEFAULT_WORDS = ['CAR', 'CARD', 'CARE', 'CAT', 'DO', 'DOG', 'DONE']
export const SEARCH_SUGGESTIONS = ['CAR', 'DOG', 'DARE', 'CAT', 'DO']

// ── Trie Operations ──────────────────────────────────────────────────────────

function cloneNodes(nodes: Map<number, TrieNode>): Map<number, TrieNode> {
  const copy = new Map<number, TrieNode>()
  for (const [id, node] of nodes) {
    copy.set(id, { ...node, children: new Map(node.children) })
  }
  return copy
}

let globalNextId = 0

export function createEmptyTrie(): { nodes: Map<number, TrieNode>; rootId: number } {
  globalNextId = 0
  const rootId = globalNextId++
  const nodes = new Map<number, TrieNode>()
  nodes.set(rootId, { id: rootId, char: '', children: new Map(), isEnd: false, depth: 0 })
  return { nodes, rootId }
}

export function insertWord(
  inputNodes: Map<number, TrieNode>,
  rootId: number,
  word: string,
): TrieResult {
  const nodes = cloneNodes(inputNodes)
  const steps: TrieStep[] = []
  let currentId = rootId

  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    const current = nodes.get(currentId)!

    if (current.children.has(ch)) {
      const childId = current.children.get(ch)!
      steps.push({
        action: 'traverse', nodeId: childId, char: ch, depth: i + 1,
        description: `'${ch}' exists`,
      })
      currentId = childId
    } else {
      const newId = globalNextId++
      const newNode: TrieNode = {
        id: newId, char: ch, children: new Map(),
        isEnd: false, depth: i + 1,
      }
      nodes.set(newId, newNode)
      current.children.set(ch, newId)
      steps.push({
        action: 'create', nodeId: newId, char: ch, depth: i + 1,
        description: `create '${ch}'`,
      })
      currentId = newId
    }
  }

  const endNode = nodes.get(currentId)!
  endNode.isEnd = true
  endNode.word = word
  steps.push({
    action: 'mark-end', nodeId: currentId, char: word[word.length - 1],
    depth: word.length, word,
    description: `mark end "${word}"`,
  })

  return { steps, nodes, rootId }
}

export function searchWord(
  nodes: Map<number, TrieNode>,
  rootId: number,
  word: string,
): TrieResult {
  const steps: TrieStep[] = []
  let currentId = rootId

  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    const current = nodes.get(currentId)!

    if (current.children.has(ch)) {
      const childId = current.children.get(ch)!
      steps.push({
        action: 'traverse', nodeId: childId, char: ch, depth: i + 1,
        description: `'${ch}' found`,
      })
      currentId = childId
    } else {
      steps.push({
        action: 'not-found', nodeId: currentId, char: ch, depth: i + 1,
        description: `'${ch}' not found`,
      })
      return { steps, nodes, rootId, found: false }
    }
  }

  const endNode = nodes.get(currentId)!
  if (endNode.isEnd) {
    steps.push({
      action: 'found', nodeId: currentId, char: word[word.length - 1] || '',
      depth: word.length, word,
      description: `"${word}" found`,
    })
    return { steps, nodes, rootId, found: true }
  } else {
    steps.push({
      action: 'not-found', nodeId: currentId, char: word[word.length - 1] || '',
      depth: word.length,
      description: `"${word}" is prefix only`,
    })
    return { steps, nodes, rootId, found: false }
  }
}

export function autocomplete(
  nodes: Map<number, TrieNode>,
  rootId: number,
  prefix: string,
): TrieResult {
  const steps: TrieStep[] = []
  let currentId = rootId

  // Traverse to prefix end
  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i]
    const current = nodes.get(currentId)!

    if (current.children.has(ch)) {
      const childId = current.children.get(ch)!
      steps.push({
        action: 'traverse', nodeId: childId, char: ch, depth: i + 1,
        description: `'${ch}' found`,
      })
      currentId = childId
    } else {
      steps.push({
        action: 'not-found', nodeId: currentId, char: ch, depth: i + 1,
        description: `prefix '${ch}' not found`,
      })
      return { steps, nodes, rootId, suggestions: [] }
    }
  }

  // DFS to collect all words under this node
  const suggestions: string[] = []

  function dfs(nodeId: number, path: string): void {
    const node = nodes.get(nodeId)!
    const currentPath = path + node.char

    if (node.isEnd) {
      suggestions.push(node.word || currentPath)
      steps.push({
        action: 'autocomplete-collect', nodeId, char: node.char,
        depth: node.depth, word: node.word || currentPath,
        description: `collect "${node.word || currentPath}"`,
      })
    }

    // Sort children for deterministic order
    const sortedChildren = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [, childId] of sortedChildren) {
      steps.push({
        action: 'traverse', nodeId: childId, char: nodes.get(childId)!.char,
        depth: nodes.get(childId)!.depth,
        description: `explore '${nodes.get(childId)!.char}'`,
      })
      dfs(childId, currentPath)
    }
  }

  dfs(currentId, prefix.slice(0, -1))

  steps.push({
    action: 'autocomplete-done', nodeId: currentId, char: '',
    depth: prefix.length,
    description: `${suggestions.length} suggestion(s)`,
  })

  return { steps, nodes, rootId, suggestions }
}

export function buildTrie(words: string[]): { nodes: Map<number, TrieNode>; rootId: number } {
  let { nodes, rootId } = createEmptyTrie()
  for (const word of words) {
    const result = insertWord(nodes, rootId, word)
    nodes = result.nodes
  }
  return { nodes, rootId }
}
