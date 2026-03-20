'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChessState,
  ChessMove,
  Color,
  getLegalMovesForPiece,
  moveToAlgebraic,
  createInitialState,
  applyMove,
} from '@/utils/gameAI/chessAI'

// Unicode chess pieces
const PIECE_UNICODE: Record<string, string> = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
}

interface ChessBoardProps {
  gameState: ChessState
  playerColor: Color
  isMyTurn: boolean
  onMove: (move: ChessMove) => void
  disabled: boolean
  flipped: boolean
}

export default function ChessBoard({
  gameState,
  playerColor,
  isMyTurn,
  onMove,
  disabled,
  flipped,
}: ChessBoardProps) {
  const t = useTranslations('chess')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState(400)
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null)
  const [legalMoves, setLegalMoves] = useState<ChessMove[]>([])
  const [hoverSquare, setHoverSquare] = useState<{ row: number; col: number } | null>(null)

  const cellSize = boardSize / 8

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth
        const size = Math.min(w, 480)
        setBoardSize(size)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Board coordinate mapping (handle flip)
  const toBoardCoord = useCallback((viewRow: number, viewCol: number) => {
    if (flipped) return { row: 7 - viewRow, col: 7 - viewCol }
    return { row: viewRow, col: viewCol }
  }, [flipped])

  const toViewCoord = useCallback((row: number, col: number) => {
    if (flipped) return { vr: 7 - row, vc: 7 - col }
    return { vr: row, vc: col }
  }, [flipped])

  // Get last move
  const lastMove = gameState.moveHistory.length > 0
    ? gameState.moveHistory[gameState.moveHistory.length - 1]
    : null

  // Find king in check
  const kingInCheck = gameState.inCheck
    ? (() => {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = gameState.board[r][c]
            if (p === gameState.currentTurn + 'K') return { row: r, col: c }
          }
        }
        return null
      })()
    : null

  // Draw board
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = boardSize * dpr
    canvas.height = boardSize * dpr
    canvas.style.width = boardSize + 'px'
    canvas.style.height = boardSize + 'px'
    ctx.scale(dpr, dpr)

    const cs = cellSize

    // Draw squares
    for (let vr = 0; vr < 8; vr++) {
      for (let vc = 0; vc < 8; vc++) {
        const { row, col } = toBoardCoord(vr, vc)
        const isLight = (row + col) % 2 === 0

        // Base color
        ctx.fillStyle = isLight ? '#F0D9B5' : '#B58863'

        // Last move highlight
        if (lastMove) {
          if ((row === lastMove.fromRow && col === lastMove.fromCol) ||
              (row === lastMove.toRow && col === lastMove.toCol)) {
            ctx.fillStyle = isLight ? '#F7EC7D' : '#DAC34B'
          }
        }

        // Selected piece highlight
        if (selectedSquare && row === selectedSquare.row && col === selectedSquare.col) {
          ctx.fillStyle = isLight ? '#B0D0F0' : '#6EA8D8'
        }

        // King in check highlight
        if (kingInCheck && row === kingInCheck.row && col === kingInCheck.col) {
          ctx.fillStyle = '#FF6B6B'
        }

        ctx.fillRect(vc * cs, vr * cs, cs, cs)
      }
    }

    // Draw legal move indicators
    for (const move of legalMoves) {
      const { vr, vc } = toViewCoord(move.toRow, move.toCol)
      const cx = vc * cs + cs / 2
      const cy = vr * cs + cs / 2

      if (gameState.board[move.toRow][move.toCol] || move.enPassant) {
        // Capture: ring
        ctx.beginPath()
        ctx.arc(cx, cy, cs * 0.45, 0, Math.PI * 2)
        ctx.lineWidth = cs * 0.08
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.stroke()
      } else {
        // Move: dot
        ctx.beginPath()
        ctx.arc(cx, cy, cs * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.fill()
      }
    }

    // Draw pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = gameState.board[r][c]
        if (!piece) continue

        const { vr, vc } = toViewCoord(r, c)
        const unicode = PIECE_UNICODE[piece]
        if (!unicode) continue

        ctx.font = `${cs * 0.8}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Shadow for white pieces
        if (piece[0] === 'w') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'
          ctx.fillText(unicode, vc * cs + cs / 2 + 1, vr * cs + cs / 2 + 1)
        }

        ctx.fillStyle = piece[0] === 'w' ? '#FFFFFF' : '#000000'
        // Stroke for visibility
        ctx.lineWidth = 0.5
        ctx.strokeStyle = piece[0] === 'w' ? '#333333' : '#666666'
        ctx.strokeText(unicode, vc * cs + cs / 2, vr * cs + cs / 2)
        ctx.fillText(unicode, vc * cs + cs / 2, vr * cs + cs / 2)
      }
    }

    // Draw rank/file labels
    ctx.font = `bold ${cs * 0.18}px sans-serif`
    for (let i = 0; i < 8; i++) {
      const { row } = toBoardCoord(i, 0)
      const isLight = (row + (flipped ? 7 : 0)) % 2 === 0
      ctx.fillStyle = isLight ? '#B58863' : '#F0D9B5'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(String(8 - row), 2, i * cs + 2)
    }
    for (let i = 0; i < 8; i++) {
      const { col } = toBoardCoord(7, i)
      const isLight = (7 + col) % 2 === 0
      ctx.fillStyle = isLight ? '#B58863' : '#F0D9B5'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText('abcdefgh'[col], (i + 1) * cs - 2, boardSize - 2)
    }

    // Hover highlight
    if (hoverSquare && isMyTurn && !disabled) {
      const { vr, vc } = toViewCoord(hoverSquare.row, hoverSquare.col)
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(vc * cs + 1, vr * cs + 1, cs - 2, cs - 2)
    }

  }, [gameState, boardSize, cellSize, selectedSquare, legalMoves, lastMove, kingInCheck, flipped, toBoardCoord, toViewCoord, hoverSquare, isMyTurn, disabled])

  // Get board coords from pixel position
  const getSquareFromPixel = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const vc = Math.floor(x / cellSize)
    const vr = Math.floor(y / cellSize)
    if (vc < 0 || vc > 7 || vr < 0 || vr > 7) return null
    return toBoardCoord(vr, vc)
  }, [cellSize, toBoardCoord])

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn) return

    const sq = getSquareFromPixel(e.clientX, e.clientY)
    if (!sq) return

    const { row, col } = sq
    const piece = gameState.board[row][col]

    // If we have a selected piece, try to move
    if (selectedSquare) {
      const move = legalMoves.find(m => m.toRow === row && m.toCol === col)
      if (move) {
        // If promotion, default to queen (could add UI later)
        if (move.promotion) {
          const queenPromo = legalMoves.find(m =>
            m.toRow === row && m.toCol === col && m.promotion === 'Q'
          )
          if (queenPromo) {
            onMove(queenPromo)
          }
        } else {
          onMove(move)
        }
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      // Clicked on own piece - reselect
      if (piece && piece[0] === playerColor) {
        const moves = getLegalMovesForPiece(gameState, row, col)
        setSelectedSquare({ row, col })
        setLegalMoves(moves)
        return
      }

      // Clicked elsewhere - deselect
      setSelectedSquare(null)
      setLegalMoves([])
      return
    }

    // No piece selected - select own piece
    if (piece && piece[0] === playerColor) {
      const moves = getLegalMovesForPiece(gameState, row, col)
      if (moves.length > 0) {
        setSelectedSquare({ row, col })
        setLegalMoves(moves)
      }
    }
  }, [disabled, isMyTurn, gameState, selectedSquare, legalMoves, playerColor, onMove, getSquareFromPixel])

  // Handle mouse move for hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn) {
      setHoverSquare(null)
      return
    }
    const sq = getSquareFromPixel(e.clientX, e.clientY)
    setHoverSquare(sq)
  }, [disabled, isMyTurn, getSquareFromPixel])

  const handleMouseLeave = useCallback(() => {
    setHoverSquare(null)
  }, [])

  // Touch support
  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (disabled || !isMyTurn) return
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return

    const sq = getSquareFromPixel(touch.clientX, touch.clientY)
    if (!sq) return

    const { row, col } = sq
    const piece = gameState.board[row][col]

    if (selectedSquare) {
      const move = legalMoves.find(m => m.toRow === row && m.toCol === col)
      if (move) {
        if (move.promotion) {
          const queenPromo = legalMoves.find(m =>
            m.toRow === row && m.toCol === col && m.promotion === 'Q'
          )
          if (queenPromo) onMove(queenPromo)
        } else {
          onMove(move)
        }
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      if (piece && piece[0] === playerColor) {
        const moves = getLegalMovesForPiece(gameState, row, col)
        setSelectedSquare({ row, col })
        setLegalMoves(moves)
        return
      }

      setSelectedSquare(null)
      setLegalMoves([])
      return
    }

    if (piece && piece[0] === playerColor) {
      const moves = getLegalMovesForPiece(gameState, row, col)
      if (moves.length > 0) {
        setSelectedSquare({ row, col })
        setLegalMoves(moves)
      }
    }
  }, [disabled, isMyTurn, gameState, selectedSquare, legalMoves, playerColor, onMove, getSquareFromPixel])

  // Clear selection when turn changes
  useEffect(() => {
    setSelectedSquare(null)
    setLegalMoves([])
  }, [gameState.currentTurn])

  // Captured pieces
  const getCapturedPieces = (color: Color) => {
    return gameState.moveHistory
      .filter(m => m.capturedPiece && m.capturedPiece[0] === color)
      .map(m => m.capturedPiece!)
  }

  const whiteCaptured = getCapturedPieces('w')  // white pieces captured by black
  const blackCaptured = getCapturedPieces('b')  // black pieces captured by white

  // Sort captured pieces by value for display
  const pieceOrder: Record<string, number> = { Q: 0, R: 1, B: 2, N: 3, P: 4 }
  const sortCaptures = (pieces: string[]) =>
    [...pieces].sort((a, b) => (pieceOrder[a[1]] ?? 5) - (pieceOrder[b[1]] ?? 5))

  // Move history in algebraic notation
  const getMoveNotation = () => {
    const notations: { num: number; white: string; black?: string }[] = []
    let tempState = createInitialState()

    for (let i = 0; i < gameState.moveHistory.length; i++) {
      const move = gameState.moveHistory[i]
      const notation = moveToAlgebraic(tempState, move)
      tempState = applyMove(tempState, move)

      if (i % 2 === 0) {
        notations.push({ num: Math.floor(i / 2) + 1, white: notation })
      } else {
        notations[notations.length - 1].black = notation
      }
    }
    return notations
  }

  return (
    <div className="space-y-3">
      {/* Top captured pieces (opponent's captured = player's advantage) */}
      <div className="flex items-center gap-1 min-h-[28px] px-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{t('capturedPieces')}:</span>
        {sortCaptures(playerColor === 'w' ? blackCaptured : whiteCaptured).map((p, i) => (
          <span key={i} className="text-lg leading-none">{PIECE_UNICODE[p]}</span>
        ))}
      </div>

      {/* Canvas board */}
      <div ref={containerRef} className="flex justify-center">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchEnd={handleTouch}
          style={{
            width: boardSize,
            height: boardSize,
            touchAction: 'none',
            cursor: isMyTurn && !disabled ? 'pointer' : 'default',
          }}
          className="rounded-lg shadow-md"
        />
      </div>

      {/* Bottom captured pieces */}
      <div className="flex items-center gap-1 min-h-[28px] px-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{t('capturedPieces')}:</span>
        {sortCaptures(playerColor === 'w' ? whiteCaptured : blackCaptured).map((p, i) => (
          <span key={i} className="text-lg leading-none">{PIECE_UNICODE[p]}</span>
        ))}
      </div>

      {/* Move history */}
      {gameState.moveHistory.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">{t('moveHistory')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 text-xs font-mono text-gray-700 dark:text-gray-300">
            {getMoveNotation().map((entry) => (
              <div key={entry.num} className="flex gap-1">
                <span className="text-gray-400 w-6 text-right">{entry.num}.</span>
                <span className="w-12">{entry.white}</span>
                {entry.black && <span className="w-12">{entry.black}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
