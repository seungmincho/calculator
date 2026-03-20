// Chess AI - Minimax with Alpha-Beta Pruning
// Supports 3 difficulty levels: easy, normal, hard

export type Difficulty = 'easy' | 'normal' | 'hard'

// Piece representation: first char = color (w/b), second = type (K/Q/R/B/N/P)
export type Piece = string | null  // e.g. 'wK', 'bQ', 'wP', null
export type Board = Piece[][]  // 8x8, [row][col], row 0 = rank 8 (black side)
export type Color = 'w' | 'b'

export interface ChessMove {
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  promotion?: string  // 'Q' | 'R' | 'B' | 'N'
  castle?: 'K' | 'Q'  // kingside or queenside
  enPassant?: boolean
  capturedPiece?: Piece
}

export interface ChessState {
  board: Board
  currentTurn: Color
  moveHistory: ChessMove[]
  castlingRights: {
    wK: boolean  // white kingside
    wQ: boolean  // white queenside
    bK: boolean  // black kingside
    bQ: boolean  // black queenside
  }
  enPassantTarget: { row: number; col: number } | null
  halfMoveClock: number  // for 50-move rule
  winner: 'w' | 'b' | 'draw' | null
  inCheck: boolean
  gameOverReason?: string
}

// ── Initial board setup ──

export function createInitialBoard(): Board {
  return [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
  ]
}

export function createInitialState(): ChessState {
  return {
    board: createInitialBoard(),
    currentTurn: 'w',
    moveHistory: [],
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    halfMoveClock: 0,
    winner: null,
    inCheck: false,
  }
}

// ── Helpers ──

function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

function getPieceColor(piece: Piece): Color | null {
  if (!piece) return null
  return piece[0] as Color
}

function getPieceType(piece: Piece): string | null {
  if (!piece) return null
  return piece[1]
}

function opponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8
}

// ── Find king position ──

function findKing(board: Board, color: Color): { row: number; col: number } | null {
  const king = color + 'K'
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return { row: r, col: c }
    }
  }
  return null
}

// ── Check if a square is attacked by the opponent ──

function isSquareAttacked(board: Board, row: number, col: number, byColor: Color): boolean {
  // Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1  // white pawns attack upward (lower row numbers)
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir
    const pc = col + dc
    if (inBounds(pr, pc) && board[pr][pc] === byColor + 'P') return true
  }

  // Knight attacks
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
  for (const [dr, dc] of knightMoves) {
    const nr = row + dr, nc = col + dc
    if (inBounds(nr, nc) && board[nr][nc] === byColor + 'N') return true
  }

  // King attacks (adjacent squares)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr, nc = col + dc
      if (inBounds(nr, nc) && board[nr][nc] === byColor + 'K') return true
    }
  }

  // Sliding pieces: bishop/queen (diagonals)
  const diags = [[-1,-1],[-1,1],[1,-1],[1,1]]
  for (const [dr, dc] of diags) {
    let r = row + dr, c = col + dc
    while (inBounds(r, c)) {
      const p = board[r][c]
      if (p) {
        if (getPieceColor(p) === byColor) {
          const t = getPieceType(p)
          if (t === 'B' || t === 'Q') return true
        }
        break
      }
      r += dr; c += dc
    }
  }

  // Sliding pieces: rook/queen (straight lines)
  const straights = [[-1,0],[1,0],[0,-1],[0,1]]
  for (const [dr, dc] of straights) {
    let r = row + dr, c = col + dc
    while (inBounds(r, c)) {
      const p = board[r][c]
      if (p) {
        if (getPieceColor(p) === byColor) {
          const t = getPieceType(p)
          if (t === 'R' || t === 'Q') return true
        }
        break
      }
      r += dr; c += dc
    }
  }

  return false
}

// ── Check if current player is in check ──

export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color)
  if (!king) return false
  return isSquareAttacked(board, king.row, king.col, opponent(color))
}

// ── Generate pseudo-legal moves (before filtering for check) ──

function generatePseudoLegalMoves(state: ChessState, color: Color): ChessMove[] {
  const moves: ChessMove[] = []
  const board = state.board

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (!piece || getPieceColor(piece) !== color) continue

      const type = getPieceType(piece)!

      if (type === 'P') {
        const dir = color === 'w' ? -1 : 1
        const startRow = color === 'w' ? 6 : 1
        const promoRow = color === 'w' ? 0 : 7

        // Forward one
        const fr = r + dir
        if (inBounds(fr, c) && !board[fr][c]) {
          if (fr === promoRow) {
            for (const promo of ['Q', 'R', 'B', 'N']) {
              moves.push({ fromRow: r, fromCol: c, toRow: fr, toCol: c, promotion: promo })
            }
          } else {
            moves.push({ fromRow: r, fromCol: c, toRow: fr, toCol: c })
          }

          // Forward two from start
          const fr2 = r + dir * 2
          if (r === startRow && inBounds(fr2, c) && !board[fr2][c]) {
            moves.push({ fromRow: r, fromCol: c, toRow: fr2, toCol: c })
          }
        }

        // Diagonal captures
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc
          if (!inBounds(tr, tc)) continue

          if (board[tr][tc] && getPieceColor(board[tr][tc]) !== color) {
            if (tr === promoRow) {
              for (const promo of ['Q', 'R', 'B', 'N']) {
                moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, promotion: promo, capturedPiece: board[tr][tc] })
              }
            } else {
              moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, capturedPiece: board[tr][tc] })
            }
          }

          // En passant
          if (state.enPassantTarget && state.enPassantTarget.row === tr && state.enPassantTarget.col === tc) {
            moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, enPassant: true, capturedPiece: board[r][tc] })
          }
        }
      }

      if (type === 'N') {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          const tr = r + dr, tc = c + dc
          if (!inBounds(tr, tc)) continue
          if (board[tr][tc] && getPieceColor(board[tr][tc]) === color) continue
          moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, capturedPiece: board[tr][tc] || undefined })
        }
      }

      if (type === 'B' || type === 'Q') {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
          let tr = r + dr, tc = c + dc
          while (inBounds(tr, tc)) {
            if (board[tr][tc]) {
              if (getPieceColor(board[tr][tc]) !== color) {
                moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, capturedPiece: board[tr][tc] })
              }
              break
            }
            moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc })
            tr += dr; tc += dc
          }
        }
      }

      if (type === 'R' || type === 'Q') {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          let tr = r + dr, tc = c + dc
          while (inBounds(tr, tc)) {
            if (board[tr][tc]) {
              if (getPieceColor(board[tr][tc]) !== color) {
                moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, capturedPiece: board[tr][tc] })
              }
              break
            }
            moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc })
            tr += dr; tc += dc
          }
        }
      }

      if (type === 'K') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const tr = r + dr, tc = c + dc
            if (!inBounds(tr, tc)) continue
            if (board[tr][tc] && getPieceColor(board[tr][tc]) === color) continue
            moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, capturedPiece: board[tr][tc] || undefined })
          }
        }

        // Castling
        const opp = opponent(color)
        if (color === 'w' && r === 7 && c === 4) {
          // Kingside
          if (state.castlingRights.wK && board[7][5] === null && board[7][6] === null && board[7][7] === 'wR') {
            if (!isSquareAttacked(board, 7, 4, opp) && !isSquareAttacked(board, 7, 5, opp) && !isSquareAttacked(board, 7, 6, opp)) {
              moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 6, castle: 'K' })
            }
          }
          // Queenside
          if (state.castlingRights.wQ && board[7][3] === null && board[7][2] === null && board[7][1] === null && board[7][0] === 'wR') {
            if (!isSquareAttacked(board, 7, 4, opp) && !isSquareAttacked(board, 7, 3, opp) && !isSquareAttacked(board, 7, 2, opp)) {
              moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 2, castle: 'Q' })
            }
          }
        }
        if (color === 'b' && r === 0 && c === 4) {
          if (state.castlingRights.bK && board[0][5] === null && board[0][6] === null && board[0][7] === 'bR') {
            if (!isSquareAttacked(board, 0, 4, opp) && !isSquareAttacked(board, 0, 5, opp) && !isSquareAttacked(board, 0, 6, opp)) {
              moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 6, castle: 'K' })
            }
          }
          if (state.castlingRights.bQ && board[0][3] === null && board[0][2] === null && board[0][1] === null && board[0][0] === 'bR') {
            if (!isSquareAttacked(board, 0, 4, opp) && !isSquareAttacked(board, 0, 3, opp) && !isSquareAttacked(board, 0, 2, opp)) {
              moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 2, castle: 'Q' })
            }
          }
        }
      }
    }
  }

  return moves
}

// ── Apply move to a state (returns new state) ──

export function applyMove(state: ChessState, move: ChessMove): ChessState {
  const board = cloneBoard(state.board)
  const piece = board[move.fromRow][move.fromCol]!
  const color = getPieceColor(piece)!
  const type = getPieceType(piece)!

  // Update castling rights
  const cr = { ...state.castlingRights }

  // King moves remove both castling rights
  if (type === 'K') {
    if (color === 'w') { cr.wK = false; cr.wQ = false }
    else { cr.bK = false; cr.bQ = false }
  }
  // Rook moves or captures remove specific castling right
  if (move.fromRow === 7 && move.fromCol === 0) cr.wQ = false
  if (move.fromRow === 7 && move.fromCol === 7) cr.wK = false
  if (move.fromRow === 0 && move.fromCol === 0) cr.bQ = false
  if (move.fromRow === 0 && move.fromCol === 7) cr.bK = false
  if (move.toRow === 7 && move.toCol === 0) cr.wQ = false
  if (move.toRow === 7 && move.toCol === 7) cr.wK = false
  if (move.toRow === 0 && move.toCol === 0) cr.bQ = false
  if (move.toRow === 0 && move.toCol === 7) cr.bK = false

  // En passant target
  let enPassantTarget: { row: number; col: number } | null = null
  if (type === 'P' && Math.abs(move.toRow - move.fromRow) === 2) {
    enPassantTarget = { row: (move.fromRow + move.toRow) / 2, col: move.fromCol }
  }

  // Half-move clock
  let halfMoveClock = state.halfMoveClock + 1
  if (type === 'P' || move.capturedPiece) halfMoveClock = 0

  // Execute move
  board[move.fromRow][move.fromCol] = null

  if (move.castle) {
    // Move king
    board[move.toRow][move.toCol] = piece
    // Move rook
    if (move.castle === 'K') {
      board[move.toRow][move.toCol - 1] = board[move.toRow][7]
      board[move.toRow][7] = null
    } else {
      board[move.toRow][move.toCol + 1] = board[move.toRow][0]
      board[move.toRow][0] = null
    }
  } else if (move.enPassant) {
    board[move.toRow][move.toCol] = piece
    board[move.fromRow][move.toCol] = null  // remove captured pawn
  } else if (move.promotion) {
    board[move.toRow][move.toCol] = color + move.promotion
  } else {
    board[move.toRow][move.toCol] = piece
  }

  const nextTurn = opponent(color)
  const inCheck = isInCheck(board, nextTurn)

  return {
    board,
    currentTurn: nextTurn,
    moveHistory: [...state.moveHistory, move],
    castlingRights: cr,
    enPassantTarget,
    halfMoveClock,
    winner: null,
    inCheck,
  }
}

// ── Generate legal moves (filter pseudo-legal for leaving king in check) ──

export function getLegalMoves(state: ChessState, color?: Color): ChessMove[] {
  const c = color || state.currentTurn
  const pseudo = generatePseudoLegalMoves(state, c)
  const legal: ChessMove[] = []

  for (const move of pseudo) {
    const newState = applyMove(state, move)
    // After our move, our king should not be in check
    if (!isInCheck(newState.board, c)) {
      legal.push(move)
    }
  }

  return legal
}

// ── Get legal moves for a specific piece ──

export function getLegalMovesForPiece(state: ChessState, row: number, col: number): ChessMove[] {
  const piece = state.board[row][col]
  if (!piece) return []
  const color = getPieceColor(piece)!
  if (color !== state.currentTurn) return []

  return getLegalMoves(state, color).filter(m => m.fromRow === row && m.fromCol === col)
}

// ── Check game end conditions ──

export function checkGameOver(state: ChessState): ChessState {
  const legalMoves = getLegalMoves(state)

  if (legalMoves.length === 0) {
    if (state.inCheck) {
      // Checkmate
      return {
        ...state,
        winner: opponent(state.currentTurn),
        gameOverReason: 'checkmate',
      }
    } else {
      // Stalemate
      return {
        ...state,
        winner: 'draw',
        gameOverReason: 'stalemate',
      }
    }
  }

  // 50-move rule
  if (state.halfMoveClock >= 100) {
    return { ...state, winner: 'draw', gameOverReason: 'fiftyMoveRule' }
  }

  // Insufficient material
  if (isInsufficientMaterial(state.board)) {
    return { ...state, winner: 'draw', gameOverReason: 'insufficientMaterial' }
  }

  // Threefold repetition (simplified: check last few positions)
  if (isThreefoldRepetition(state)) {
    return { ...state, winner: 'draw', gameOverReason: 'repetition' }
  }

  return state
}

function isInsufficientMaterial(board: Board): boolean {
  const pieces: { color: Color; type: string; row: number; col: number }[] = []

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p) {
        pieces.push({ color: getPieceColor(p)!, type: getPieceType(p)!, row: r, col: c })
      }
    }
  }

  // King vs King
  if (pieces.length === 2) return true

  // King + minor vs King
  if (pieces.length === 3) {
    const nonKing = pieces.find(p => p.type !== 'K')
    if (nonKing && (nonKing.type === 'B' || nonKing.type === 'N')) return true
  }

  // King + Bishop vs King + Bishop (same color bishops)
  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === 'B')
    if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
      // Check if bishops are on same color square
      const c1 = (bishops[0].row + bishops[0].col) % 2
      const c2 = (bishops[1].row + bishops[1].col) % 2
      if (c1 === c2) return true
    }
  }

  return false
}

function boardToString(board: Board): string {
  return board.map(row => row.map(p => p || '--').join('')).join('')
}

function isThreefoldRepetition(state: ChessState): boolean {
  if (state.moveHistory.length < 8) return false

  // Rebuild positions from history to check repetition
  const currentPos = boardToString(state.board)
  let count = 1

  // Walk backwards through history checking positions
  let tempState = createInitialState()
  const positions: string[] = [boardToString(tempState.board)]

  for (const move of state.moveHistory) {
    tempState = applyMove(tempState, move)
    positions.push(boardToString(tempState.board))
  }

  for (let i = 0; i < positions.length - 1; i++) {
    if (positions[i] === currentPos) {
      count++
      if (count >= 3) return true
    }
  }

  return false
}

// ── Algebraic notation ──

const COL_NAMES = 'abcdefgh'

export function moveToAlgebraic(state: ChessState, move: ChessMove): string {
  if (move.castle === 'K') return 'O-O'
  if (move.castle === 'Q') return 'O-O-O'

  const piece = state.board[move.fromRow][move.fromCol]
  if (!piece) return ''
  const type = getPieceType(piece)!

  let notation = ''

  // Piece letter (omit for pawns)
  if (type !== 'P') {
    notation += type
  }

  // Disambiguation for non-pawn pieces
  if (type !== 'P') {
    const color = getPieceColor(piece)!
    const allMoves = getLegalMoves(state, color)
    const sameTypeSameDest = allMoves.filter(m =>
      m.toRow === move.toRow && m.toCol === move.toCol &&
      state.board[m.fromRow][m.fromCol] === piece &&
      (m.fromRow !== move.fromRow || m.fromCol !== move.fromCol)
    )
    if (sameTypeSameDest.length > 0) {
      const sameCol = sameTypeSameDest.some(m => m.fromCol === move.fromCol)
      const sameRow = sameTypeSameDest.some(m => m.fromRow === move.fromRow)
      if (!sameCol) {
        notation += COL_NAMES[move.fromCol]
      } else if (!sameRow) {
        notation += (8 - move.fromRow)
      } else {
        notation += COL_NAMES[move.fromCol] + (8 - move.fromRow)
      }
    }
  }

  // Capture
  const isCapture = move.capturedPiece || move.enPassant
  if (isCapture) {
    if (type === 'P') notation += COL_NAMES[move.fromCol]
    notation += 'x'
  }

  // Destination
  notation += COL_NAMES[move.toCol] + (8 - move.toRow)

  // Promotion
  if (move.promotion) {
    notation += '=' + move.promotion
  }

  // Check/checkmate
  const newState = applyMove(state, move)
  const afterCheck = checkGameOver(newState)
  if (afterCheck.winner && afterCheck.gameOverReason === 'checkmate') {
    notation += '#'
  } else if (newState.inCheck) {
    notation += '+'
  }

  return notation
}

// ── AI Evaluation ──

const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 2,
  normal: 3,
  hard: 4,
}

// Piece values
const PIECE_VALUES: Record<string, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
}

// Piece-square tables (from white's perspective, flip for black)
// Values encourage good positional play

const PAWN_TABLE = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [ 50, 50, 50, 50, 50, 50, 50, 50],
  [ 10, 10, 20, 30, 30, 20, 10, 10],
  [  5,  5, 10, 25, 25, 10,  5,  5],
  [  0,  0,  0, 20, 20,  0,  0,  0],
  [  5, -5,-10,  0,  0,-10, -5,  5],
  [  5, 10, 10,-20,-20, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0],
]

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
]

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
]

const ROOK_TABLE = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  0,  0,  0,  5,  5,  0,  0,  0],
]

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
]

const KING_MIDDLEGAME_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
]

const KING_ENDGAME_TABLE = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
]

const PST: Record<string, number[][]> = {
  P: PAWN_TABLE,
  N: KNIGHT_TABLE,
  B: BISHOP_TABLE,
  R: ROOK_TABLE,
  Q: QUEEN_TABLE,
  K: KING_MIDDLEGAME_TABLE,
}

function isEndgame(board: Board): boolean {
  let queenCount = 0
  let totalMaterial = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (!p) continue
      const t = getPieceType(p)!
      if (t === 'Q') queenCount++
      if (t !== 'K' && t !== 'P') totalMaterial += PIECE_VALUES[t]
    }
  }
  // Endgame if no queens or very low material
  return queenCount === 0 || totalMaterial <= 1300
}

function evaluateBoard(board: Board, aiColor: Color): number {
  let score = 0
  const endgame = isEndgame(board)

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (!piece) continue

      const color = getPieceColor(piece)!
      const type = getPieceType(piece)!
      const value = PIECE_VALUES[type] || 0

      // Piece-square table value
      let pstValue = 0
      if (type === 'K' && endgame) {
        pstValue = color === 'w'
          ? KING_ENDGAME_TABLE[r][c]
          : KING_ENDGAME_TABLE[7 - r][c]
      } else {
        const table = PST[type]
        if (table) {
          pstValue = color === 'w' ? table[r][c] : table[7 - r][c]
        }
      }

      const totalValue = value + pstValue
      score += color === aiColor ? totalValue : -totalValue
    }
  }

  return score
}

// ── Move ordering for better alpha-beta pruning ──

function orderMoves(state: ChessState, moves: ChessMove[]): ChessMove[] {
  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0

    // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (a.capturedPiece) {
      const victim = PIECE_VALUES[getPieceType(a.capturedPiece)!] || 0
      const attacker = PIECE_VALUES[getPieceType(state.board[a.fromRow][a.fromCol])!] || 0
      scoreA += 10000 + victim - attacker / 100
    }
    if (b.capturedPiece) {
      const victim = PIECE_VALUES[getPieceType(b.capturedPiece)!] || 0
      const attacker = PIECE_VALUES[getPieceType(state.board[b.fromRow][b.fromCol])!] || 0
      scoreB += 10000 + victim - attacker / 100
    }

    // Promotions
    if (a.promotion) scoreA += a.promotion === 'Q' ? 9000 : 5000
    if (b.promotion) scoreB += b.promotion === 'Q' ? 9000 : 5000

    // Castling
    if (a.castle) scoreA += 500
    if (b.castle) scoreB += 500

    // Center moves
    const centerDist = (r: number, c: number) => Math.abs(r - 3.5) + Math.abs(c - 3.5)
    scoreA += (7 - centerDist(a.toRow, a.toCol)) * 10
    scoreB += (7 - centerDist(b.toRow, b.toCol)) * 10

    return scoreB - scoreA
  })
}

// ── Minimax with Alpha-Beta Pruning ──

function minimax(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: Color
): number {
  // Terminal check
  const endState = checkGameOver(state)
  if (endState.winner) {
    if (endState.winner === 'draw') return 0
    if (endState.winner === aiColor) return 100000 + depth
    return -100000 - depth
  }

  if (depth === 0) {
    return evaluateBoard(state.board, aiColor)
  }

  const moves = orderMoves(state, getLegalMoves(state))

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of moves) {
      const newState = applyMove(state, move)
      const evalScore = minimax(newState, depth - 1, alpha, beta, false, aiColor)
      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of moves) {
      const newState = applyMove(state, move)
      const evalScore = minimax(newState, depth - 1, alpha, beta, true, aiColor)
      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
    return minEval
  }
}

// ── Get AI Move ──

export function getChessAIMove(
  state: ChessState,
  aiColor: Color,
  difficulty: Difficulty
): ChessMove | null {
  const moves = getLegalMoves(state, aiColor)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  const depth = DEPTH_MAP[difficulty]

  // Easy mode: sometimes make random moves
  if (difficulty === 'easy' && Math.random() < 0.3) {
    // Prefer captures randomly
    const captures = moves.filter(m => m.capturedPiece)
    if (captures.length > 0 && Math.random() < 0.5) {
      return captures[Math.floor(Math.random() * captures.length)]
    }
    return moves[Math.floor(Math.random() * moves.length)]
  }

  const orderedMoves = orderMoves(state, moves)
  let bestMove = orderedMoves[0]
  let bestScore = -Infinity

  for (const move of orderedMoves) {
    const newState = applyMove(state, move)
    const score = minimax(newState, depth - 1, -Infinity, Infinity, false, aiColor)

    // Add randomness for normal mode
    const adjusted = difficulty === 'normal'
      ? score + (Math.random() * 30 - 15)
      : score

    if (adjusted > bestScore) {
      bestScore = adjusted
      bestMove = move
    }
  }

  return bestMove
}
