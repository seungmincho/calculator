export type Player = 'X' | 'O' | null
export type Board = Player[] // 9 cells (3x3 tic-tac-toe)

export interface MinimaxNode {
  id: number
  board: Board
  move: number | null
  player: Player
  score: number | null
  alpha: number
  beta: number
  depth: number
  children: number[]
  pruned: boolean
  isTerminal: boolean
}

export interface MinimaxStep {
  nodeId: number
  action: 'expand' | 'evaluate' | 'backpropagate' | 'prune'
  score: number | null
  alpha: number
  beta: number
  depth: number
}

export interface MinimaxResult {
  nodes: Map<number, MinimaxNode>
  steps: MinimaxStep[]
  bestMove: number
  rootScore: number
  totalNodes: number
  prunedNodes: number
  hitLimit: boolean
}

// ── Winning line combinations ──────────────────────────────────────────────
const WIN_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

// ── Pure helpers ───────────────────────────────────────────────────────────

export function getEmptyBoard(): Board {
  return Array(9).fill(null) as Board
}

export function makeMove(board: Board, cell: number, player: Player): Board {
  const next = [...board] as Board
  next[cell] = player
  return next
}

export function checkWinner(board: Board): { winner: Player; line: number[] | null } {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] }
    }
  }
  return { winner: null, line: null }
}

function isDraw(board: Board): boolean {
  return board.every((cell) => cell !== null)
}

function getEmptyCells(board: Board): number[] {
  return board.reduce<number[]>((acc, cell, i) => {
    if (cell === null) acc.push(i)
    return acc
  }, [])
}

// ── Core minimax ───────────────────────────────────────────────────────────

interface MutableResult {
  nodes: Map<number, MinimaxNode>
  steps: MinimaxStep[]
  counter: { value: number }
  prunedNodes: number
  maxNodes: number
  hitLimit: boolean
}

function buildNode(
  id: number,
  board: Board,
  move: number | null,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
): MinimaxNode {
  const { winner } = checkWinner(board)
  const terminal = winner !== null || isDraw(board)
  return {
    id,
    board: [...board] as Board,
    move,
    player,
    score: null,
    alpha,
    beta,
    depth,
    children: [],
    pruned: false,
    isTerminal: terminal,
  }
}

function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  useAlphaBeta: boolean,
  parentId: number | null,
  moveToHere: number | null,
  result: MutableResult,
): number {
  // Node limit check — prevent browser-crashing trees
  if (result.counter.value >= result.maxNodes) {
    result.hitLimit = true
    return isMaximizing ? -Infinity : Infinity
  }

  const nodeId = result.counter.value++
  const currentPlayer: Player = isMaximizing ? 'X' : 'O'

  const node = buildNode(nodeId, board, moveToHere, currentPlayer, depth, alpha, beta)
  result.nodes.set(nodeId, node)

  // Link to parent
  if (parentId !== null) {
    result.nodes.get(parentId)!.children.push(nodeId)
  }

  // Expand step (entering this node)
  result.steps.push({
    nodeId,
    action: 'expand',
    score: null,
    alpha,
    beta,
    depth,
  })

  // Terminal check
  const { winner } = checkWinner(board)
  if (winner === 'X') {
    const score = 10 - depth
    node.score = score
    node.isTerminal = true
    result.steps.push({ nodeId, action: 'evaluate', score, alpha, beta, depth })
    return score
  }
  if (winner === 'O') {
    const score = -10 + depth
    node.score = score
    node.isTerminal = true
    result.steps.push({ nodeId, action: 'evaluate', score, alpha, beta, depth })
    return score
  }
  if (isDraw(board)) {
    node.score = 0
    node.isTerminal = true
    result.steps.push({ nodeId, action: 'evaluate', score: 0, alpha, beta, depth })
    return 0
  }

  const emptyCells = getEmptyCells(board)
  let bestScore = isMaximizing ? -Infinity : Infinity

  for (const cell of emptyCells) {
    const nextBoard = makeMove(board, cell, currentPlayer)
    const childScore = minimax(
      nextBoard,
      depth + 1,
      !isMaximizing,
      alpha,
      beta,
      useAlphaBeta,
      nodeId,
      cell,
      result,
    )

    if (isMaximizing) {
      bestScore = Math.max(bestScore, childScore)
      if (useAlphaBeta) {
        alpha = Math.max(alpha, bestScore)
      }
    } else {
      bestScore = Math.min(bestScore, childScore)
      if (useAlphaBeta) {
        beta = Math.min(beta, bestScore)
      }
    }

    // Update alpha/beta on this node after each child
    node.alpha = alpha
    node.beta = beta

    // Alpha-beta cutoff
    if (useAlphaBeta && beta <= alpha) {
      // Mark remaining children as pruned (they won't be explored)
      const remainingCells = emptyCells.slice(emptyCells.indexOf(cell) + 1)
      for (const prunedCell of remainingCells) {
        const prunedId = result.counter.value++
        const prunedBoard = makeMove(board, prunedCell, currentPlayer)
        const prunedNode = buildNode(prunedId, prunedBoard, prunedCell, currentPlayer, depth + 1, alpha, beta)
        prunedNode.pruned = true
        result.nodes.set(prunedId, prunedNode)
        node.children.push(prunedId)
        result.prunedNodes++
        result.steps.push({ nodeId: prunedId, action: 'prune', score: null, alpha, beta, depth: depth + 1 })
      }
      break
    }
  }

  node.score = bestScore
  result.steps.push({
    nodeId,
    action: 'backpropagate',
    score: bestScore,
    alpha,
    beta,
    depth,
  })

  return bestScore
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Max nodes to prevent canvas from exceeding browser limits */
const DEFAULT_MAX_NODES = 3000

export function runMinimax(
  board: Board,
  isMaximizing: boolean,
  useAlphaBeta: boolean,
  maxNodes: number = DEFAULT_MAX_NODES,
): MinimaxResult {
  const result: MutableResult = {
    nodes: new Map(),
    steps: [],
    counter: { value: 0 },
    prunedNodes: 0,
    maxNodes,
    hitLimit: false,
  }

  const rootScore = minimax(
    board,
    0,
    isMaximizing,
    -Infinity,
    Infinity,
    useAlphaBeta,
    null,
    null,
    result,
  )

  // Determine best move from root's children
  const rootNode = result.nodes.get(0)!
  let bestMove = -1
  let bestChildScore = isMaximizing ? -Infinity : Infinity

  for (const childId of rootNode.children) {
    const child = result.nodes.get(childId)
    if (!child || child.pruned || child.score === null) continue
    if (
      isMaximizing ? child.score > bestChildScore : child.score < bestChildScore
    ) {
      bestChildScore = child.score
      bestMove = child.move ?? -1
    }
  }

  // Fallback: first empty cell
  if (bestMove === -1) {
    bestMove = getEmptyCells(board)[0] ?? -1
  }

  return {
    nodes: result.nodes,
    steps: result.steps,
    bestMove,
    rootScore,
    totalNodes: result.counter.value,
    prunedNodes: result.prunedNodes,
    hitLimit: result.hitLimit,
  }
}
