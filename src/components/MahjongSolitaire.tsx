'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Lightbulb, Shuffle, Clock, Trophy, RotateCw } from 'lucide-react'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon' | 'flower' | 'season'

interface TileType {
  suit: Suit
  value: number
  label: string      // display text on tile
  color: string      // tailwind text color
  bgColor: string    // tailwind bg color
  matchGroup?: string // for wildcard matching (flowers/seasons)
}

interface Tile {
  id: number
  typeIndex: number  // index into TILE_TYPES
  layer: number
  row: number
  col: number
  removed: boolean
}

interface HistoryEntry {
  tile1: Tile
  tile2: Tile
}

// ═══════════════════════════════════════════════════════════════
// Tile definitions: 34 regular types + 4 flowers + 4 seasons = 42 tile types
// But we need 144 tiles: 34 * 4 = 136 + 4 flowers + 4 seasons = 144
// Flowers (4 unique, 1 each) and seasons (4 unique, 1 each) => that's only 8.
// Standard: 34 types × 4 = 136 + 4 flowers + 4 seasons = 144
// Actually flowers: 4 tiles (each unique but all match each other)
// Seasons: 4 tiles (each unique but all match each other)
// So: 34 × 4 + 4 + 4 = 144
// ═══════════════════════════════════════════════════════════════

const TILE_TYPES: TileType[] = [
  // 만수 (Characters) 1-9
  { suit: 'man', value: 1, label: '一萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 2, label: '二萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 3, label: '三萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 4, label: '四萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 5, label: '五萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 6, label: '六萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 7, label: '七萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 8, label: '八萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'man', value: 9, label: '九萬', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-white dark:bg-gray-100' },
  // 통수 (Circles/Dots) 1-9
  { suit: 'pin', value: 1, label: '①', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 2, label: '②', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 3, label: '③', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 4, label: '④', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 5, label: '⑤', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 6, label: '⑥', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 7, label: '⑦', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 8, label: '⑧', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'pin', value: 9, label: '⑨', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-white dark:bg-gray-100' },
  // 삭수 (Bamboo) 1-9
  { suit: 'sou', value: 1, label: '一索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 2, label: '二索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 3, label: '三索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 4, label: '四索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 5, label: '五索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 6, label: '六索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 7, label: '七索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 8, label: '八索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'sou', value: 9, label: '九索', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-white dark:bg-gray-100' },
  // 바람패 (Winds)
  { suit: 'wind', value: 1, label: '東', color: 'text-gray-900 dark:text-gray-800', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'wind', value: 2, label: '南', color: 'text-gray-900 dark:text-gray-800', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'wind', value: 3, label: '西', color: 'text-gray-900 dark:text-gray-800', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'wind', value: 4, label: '北', color: 'text-gray-900 dark:text-gray-800', bgColor: 'bg-white dark:bg-gray-100' },
  // 삼원패 (Dragons)
  { suit: 'dragon', value: 1, label: '中', color: 'text-red-600 dark:text-red-500', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'dragon', value: 2, label: '發', color: 'text-green-600 dark:text-green-500', bgColor: 'bg-white dark:bg-gray-100' },
  { suit: 'dragon', value: 3, label: '白', color: 'text-gray-400 dark:text-gray-500', bgColor: 'bg-white dark:bg-gray-100' },
]
// 34 regular types (indices 0-33): 9 man + 9 pin + 9 sou + 4 wind + 3 dragon

// Flower tiles (4 unique tiles, all match each other)
const FLOWER_TYPES: TileType[] = [
  { suit: 'flower', value: 1, label: '🌸', color: '', bgColor: 'bg-pink-50 dark:bg-pink-100', matchGroup: 'flower' },
  { suit: 'flower', value: 2, label: '🌺', color: '', bgColor: 'bg-pink-50 dark:bg-pink-100', matchGroup: 'flower' },
  { suit: 'flower', value: 3, label: '🌻', color: '', bgColor: 'bg-pink-50 dark:bg-pink-100', matchGroup: 'flower' },
  { suit: 'flower', value: 4, label: '🌷', color: '', bgColor: 'bg-pink-50 dark:bg-pink-100', matchGroup: 'flower' },
]

// Season tiles (4 unique tiles, all match each other)
const SEASON_TYPES: TileType[] = [
  { suit: 'season', value: 1, label: '🌱', color: '', bgColor: 'bg-amber-50 dark:bg-amber-100', matchGroup: 'season' },
  { suit: 'season', value: 2, label: '☀️', color: '', bgColor: 'bg-amber-50 dark:bg-amber-100', matchGroup: 'season' },
  { suit: 'season', value: 3, label: '🍂', color: '', bgColor: 'bg-amber-50 dark:bg-amber-100', matchGroup: 'season' },
  { suit: 'season', value: 4, label: '❄️', color: '', bgColor: 'bg-amber-50 dark:bg-amber-100', matchGroup: 'season' },
]

// All tile types combined (for indexing)
const ALL_TYPES = [...TILE_TYPES, ...FLOWER_TYPES, ...SEASON_TYPES]
// Indices 0-33: regular tiles, 34-37: flowers, 38-41: seasons

// ═══════════════════════════════════════════════════════════════
// Turtle layout: predefined positions for 144 tiles across 5 layers
// Each position: [layer, row, col]
// Tiles occupy 2 half-columns wide, 2 half-rows tall in the grid
// ═══════════════════════════════════════════════════════════════

function getTurtlePositions(): [number, number, number][] {
  const positions: [number, number, number][] = []

  // Layer 0 (ground): 86 tiles — classic turtle shape
  // Row 0: 4 tiles
  for (let c = 5; c <= 8; c++) positions.push([0, 0, c])
  // Row 1: 12 tiles
  for (let c = 1; c <= 12; c++) positions.push([0, 1, c])
  // Row 2: 12 tiles
  for (let c = 1; c <= 12; c++) positions.push([0, 2, c])
  // Row 3: 14 tiles
  for (let c = 0; c <= 13; c++) positions.push([0, 3, c])
  // Row 4: 14 tiles
  for (let c = 0; c <= 13; c++) positions.push([0, 4, c])
  // Row 5: 12 tiles
  for (let c = 1; c <= 12; c++) positions.push([0, 5, c])
  // Row 6: 12 tiles
  for (let c = 1; c <= 12; c++) positions.push([0, 6, c])
  // Row 7: 6 tiles
  for (let c = 4; c <= 9; c++) positions.push([0, 7, c])
  // L0 total: 4+12+12+14+14+12+12+6 = 86

  // Layer 1: 40 tiles — rows 2-5, cols 2-11
  for (let r = 2; r <= 5; r++)
    for (let c = 2; c <= 11; c++)
      positions.push([1, r, c])
  // L1 total: 4*10 = 40

  // Layer 2: 14 tiles — rows 3-4, cols 4-10
  for (let r = 3; r <= 4; r++)
    for (let c = 4; c <= 10; c++)
      positions.push([2, r, c])
  // L2 total: 2*7 = 14

  // Layer 3 (top): 4 tiles — rows 3-4, cols 6-7
  for (let r = 3; r <= 4; r++)
    for (let c = 6; c <= 7; c++)
      positions.push([3, r, c])
  // L3 total: 2*2 = 4

  // Grand total: 86 + 40 + 14 + 4 = 144
  return positions
}

// ═══════════════════════════════════════════════════════════════
// Shuffle utility
// ═══════════════════════════════════════════════════════════════

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ═══════════════════════════════════════════════════════════════
// Generate 144 tile type indices
// ═══════════════════════════════════════════════════════════════

function generate144TileTypes(): number[] {
  const types: number[] = []
  // 34 regular types × 4 copies = 136
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < 4; j++) {
      types.push(i)
    }
  }
  // 4 flowers (indices 34-37), 1 each
  for (let i = 34; i <= 37; i++) types.push(i)
  // 4 seasons (indices 38-41), 1 each
  for (let i = 38; i <= 41; i++) types.push(i)
  // Total: 136 + 4 + 4 = 144
  return types
}

// ═══════════════════════════════════════════════════════════════
// Check if two tiles match
// ═══════════════════════════════════════════════════════════════

function tilesMatch(typeA: number, typeB: number): boolean {
  if (typeA === typeB) return true
  const a = ALL_TYPES[typeA]
  const b = ALL_TYPES[typeB]
  if (!a || !b) return false
  // Flowers match any flower, seasons match any season
  if (a.matchGroup && b.matchGroup && a.matchGroup === b.matchGroup) return true
  return false
}

// ═══════════════════════════════════════════════════════════════
// Check if a tile is "free" (selectable)
// ═══════════════════════════════════════════════════════════════

function isTileFree(tile: Tile, allTiles: Tile[]): boolean {
  if (tile.removed) return false

  const active = allTiles.filter(t => !t.removed && t.id !== tile.id)

  // Check if any tile is directly on top (higher layer, same position)
  const isCovered = active.some(t =>
    t.layer > tile.layer && t.row === tile.row && t.col === tile.col
  )
  if (isCovered) return false

  // Check left and right neighbors on the same layer
  const sameLayer = active.filter(t => t.layer === tile.layer)

  const leftBlocked = sameLayer.some(t =>
    t.row === tile.row && t.col === tile.col - 1
  )
  const rightBlocked = sameLayer.some(t =>
    t.row === tile.row && t.col === tile.col + 1
  )

  // Free if at least one side is open
  return !leftBlocked || !rightBlocked
}

// ═══════════════════════════════════════════════════════════════
// Find all available matching pairs
// ═══════════════════════════════════════════════════════════════

function findAvailablePairs(tiles: Tile[]): [Tile, Tile][] {
  const free = tiles.filter(t => !t.removed && isTileFree(t, tiles))
  const pairs: [Tile, Tile][] = []

  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (tilesMatch(free[i].typeIndex, free[j].typeIndex)) {
        pairs.push([free[i], free[j]])
      }
    }
  }

  return pairs
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function MahjongSolitaire() {
  const t = useTranslations('mahjongSolitaire')

  const [tiles, setTiles] = useState<Tile[]>([])
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [hintPair, setHintPair] = useState<[number, number] | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'stuck'>('playing')
  const [timer, setTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [shufflesUsed, setShufflesUsed] = useState(0)
  const [matchAnimation, setMatchAnimation] = useState<[number, number] | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gameResultRecordedRef = useRef(false)

  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()

  // ── Initialize game ──
  const initGame = useCallback(() => {
    const positions = getTurtlePositions()
    const typeIndices = shuffleArray(generate144TileTypes())

    const newTiles: Tile[] = positions.map((pos, i) => ({
      id: i,
      typeIndex: typeIndices[i],
      layer: pos[0],
      row: pos[1],
      col: pos[2],
      removed: false,
    }))

    setTiles(newTiles)
    setSelectedTile(null)
    setHintPair(null)
    setHistory([])
    setGameStatus('playing')
    setTimer(0)
    setIsRunning(false)
    setShufflesUsed(0)
    setMatchAnimation(null)
    gameResultRecordedRef.current = false
  }, [])

  useEffect(() => { initGame() }, [initGame])

  // ── Timer ──
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  // ── Check game state ──
  useEffect(() => {
    if (tiles.length === 0) return
    const remaining = tiles.filter(t => !t.removed)
    if (remaining.length === 0) {
      setGameStatus('won')
      setIsRunning(false)
      if (!gameResultRecordedRef.current) {
        gameResultRecordedRef.current = true
        recordGameResult({ gameType: 'mahjongSolitaire', result: 'win', difficulty: 'normal', moves: 0 })
      }
      return
    }
    const pairs = findAvailablePairs(tiles)
    if (pairs.length === 0 && remaining.length > 0) {
      setGameStatus('stuck')
      setIsRunning(false)
      if (!gameResultRecordedRef.current) {
        gameResultRecordedRef.current = true
        recordGameResult({ gameType: 'mahjongSolitaire', result: 'loss', difficulty: 'normal', moves: 0 })
      }
    }
  }, [tiles, recordGameResult])

  // ── Tile click handler ──
  const handleTileClick = useCallback((tileId: number) => {
    if (gameStatus !== 'playing') return

    const tile = tiles.find(t => t.id === tileId)
    if (!tile || tile.removed) return
    if (!isTileFree(tile, tiles)) return

    if (!isRunning) setIsRunning(true)
    setHintPair(null)

    if (selectedTile === null) {
      setSelectedTile(tileId)
      return
    }

    if (selectedTile === tileId) {
      setSelectedTile(null)
      return
    }

    const firstTile = tiles.find(t => t.id === selectedTile)
    if (!firstTile) { setSelectedTile(tileId); return }

    // Check match
    if (tilesMatch(firstTile.typeIndex, tile.typeIndex)) {
      setMatchAnimation([firstTile.id, tile.id])
      setTimeout(() => {
        setTiles(prev => prev.map(t =>
          t.id === firstTile.id || t.id === tile.id ? { ...t, removed: true } : t
        ))
        setHistory(prev => [...prev, { tile1: { ...firstTile }, tile2: { ...tile } }])
        setSelectedTile(null)
        setMatchAnimation(null)
      }, 300)
    } else {
      // No match — select the new tile instead
      setSelectedTile(tileId)
    }
  }, [tiles, selectedTile, gameStatus, isRunning])

  // ── Undo ──
  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setTiles(prev => prev.map(t => {
      if (t.id === last.tile1.id) return { ...t, removed: false }
      if (t.id === last.tile2.id) return { ...t, removed: false }
      return t
    }))
    setHistory(prev => prev.slice(0, -1))
    setSelectedTile(null)
    setHintPair(null)
    if (gameStatus === 'stuck') setGameStatus('playing')
    if (!isRunning) setIsRunning(true)
  }, [history, gameStatus, isRunning])

  // ── Hint ──
  const handleHint = useCallback(() => {
    const pairs = findAvailablePairs(tiles)
    if (pairs.length > 0) {
      setHintPair([pairs[0][0].id, pairs[0][1].id])
      setSelectedTile(null)
    }
  }, [tiles])

  // ── Shuffle remaining tiles ──
  const handleShuffle = useCallback(() => {
    const remaining = tiles.filter(t => !t.removed)
    const shuffledTypes = shuffleArray(remaining.map(t => t.typeIndex))

    setTiles(prev => {
      const remainingIds = prev.filter(t => !t.removed).map(t => t.id)
      let idx = 0
      return prev.map(t => {
        if (remainingIds.includes(t.id)) {
          return { ...t, typeIndex: shuffledTypes[idx++] }
        }
        return t
      })
    })

    setShufflesUsed(s => s + 1)
    setSelectedTile(null)
    setHintPair(null)
    if (gameStatus === 'stuck') setGameStatus('playing')
    if (!isRunning) setIsRunning(true)
  }, [tiles, gameStatus, isRunning])

  // ── Derived state ──
  const remainingCount = useMemo(() => tiles.filter(t => !t.removed).length, [tiles])
  const matchedCount = useMemo(() => (144 - remainingCount) / 2, [remainingCount])

  // ── Format time ──
  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // ── Compute board bounds for centering ──
  const maxLayer = tiles.length > 0 ? Math.max(...tiles.map(t => t.layer)) : 0

  // Tile dimensions
  const TILE_W = 44
  const TILE_H = 56
  const LAYER_OFFSET = 4 // pixel offset per layer for 3D effect
  const GAP_X = 2
  const GAP_Y = 2

  // Board pixel dimensions
  const maxCol = tiles.length > 0 ? Math.max(...tiles.map(t => t.col)) : 14
  const maxRow = tiles.length > 0 ? Math.max(...tiles.map(t => t.row)) : 7
  const boardW = (maxCol + 1) * (TILE_W + GAP_X) + maxLayer * LAYER_OFFSET + TILE_W
  const boardH = (maxRow + 1) * (TILE_H + GAP_Y) + maxLayer * LAYER_OFFSET + TILE_H

  // ── Free tiles set (for highlighting) ──
  const freeTileIds = useMemo(() => {
    const set = new Set<number>()
    for (const tile of tiles) {
      if (!tile.removed && isTileFree(tile, tiles)) set.add(tile.id)
    }
    return set
  }, [tiles])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Stats bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-gray-900 dark:text-white">{formatTime(timer)}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('remaining')}: <span className="font-bold text-gray-900 dark:text-white">{remainingCount}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('matched')}: <span className="font-bold text-green-600 dark:text-green-400">{matchedCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleHint}
              disabled={gameStatus !== 'playing'}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 disabled:opacity-40 transition-colors"
              title={t('hint')}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">{t('hint')}</span>
            </button>
            <button
              onClick={handleShuffle}
              disabled={gameStatus === 'won'}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-40 transition-colors"
              title={t('shuffle')}
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('shuffle')}</span>
              {shufflesUsed > 0 && <span className="text-xs opacity-60">({shufflesUsed})</span>}
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
              title={t('undo')}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('undo')}</span>
            </button>
            <button
              onClick={initGame}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
              title={t('newGame')}
            >
              <RotateCw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('newGame')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Game board */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-4 overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{
            width: boardW,
            height: boardH,
            minWidth: boardW,
          }}
        >
          {tiles
            .filter(t => !t.removed)
            .sort((a, b) => a.layer - b.layer || a.row - b.row || a.col - b.col)
            .map(tile => {
              const tileType = ALL_TYPES[tile.typeIndex]
              if (!tileType) return null

              const x = tile.col * (TILE_W + GAP_X) + tile.layer * LAYER_OFFSET
              const y = tile.row * (TILE_H + GAP_Y) + tile.layer * LAYER_OFFSET
              const z = tile.layer * 10

              const isFree = freeTileIds.has(tile.id)
              const isSelected = selectedTile === tile.id
              const isHinted = hintPair !== null && (hintPair[0] === tile.id || hintPair[1] === tile.id)
              const isAnimating = matchAnimation !== null && (matchAnimation[0] === tile.id || matchAnimation[1] === tile.id)

              // Determine tile face text
              const suitLabel = tileType.suit === 'man' ? '萬' :
                tileType.suit === 'pin' ? '筒' :
                tileType.suit === 'sou' ? '索' : ''

              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile.id)}
                  disabled={!isFree || gameStatus !== 'playing'}
                  className={`absolute rounded-md border-2 flex flex-col items-center justify-center select-none transition-all duration-150
                    ${tileType.bgColor}
                    ${isSelected
                      ? 'border-blue-500 ring-2 ring-blue-400 shadow-lg scale-105'
                      : isHinted
                        ? 'border-yellow-400 ring-2 ring-yellow-300 shadow-lg'
                        : isAnimating
                          ? 'border-green-500 ring-2 ring-green-400 scale-95 opacity-50'
                          : isFree
                            ? 'border-gray-300 dark:border-gray-400 hover:border-blue-400 hover:shadow-md cursor-pointer'
                            : 'border-gray-200 dark:border-gray-500 opacity-70 cursor-not-allowed'
                    }
                  `}
                  style={{
                    left: x,
                    top: y,
                    width: TILE_W,
                    height: TILE_H,
                    zIndex: z,
                    boxShadow: tile.layer > 0
                      ? `${-2 * tile.layer}px ${2 * tile.layer}px ${3 * tile.layer}px rgba(0,0,0,0.15)`
                      : '0 1px 2px rgba(0,0,0,0.1)',
                    touchAction: 'manipulation',
                  }}
                >
                  {(tileType.suit === 'flower' || tileType.suit === 'season') ? (
                    <span className="text-lg leading-none">{tileType.label}</span>
                  ) : (
                    <>
                      <span className={`text-xs leading-none font-bold ${tileType.color}`}>
                        {tileType.label}
                      </span>
                      {suitLabel && (
                        <span className={`text-[9px] leading-none mt-0.5 ${tileType.color} opacity-70`}>
                          {suitLabel}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
        </div>
      </div>

      {/* Win overlay */}
      {gameStatus === 'won' && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">{t('winTitle')}</h2>
          <p className="text-green-600 dark:text-green-400 mb-1">
            {t('winTime')}: {formatTime(timer)}
          </p>
          {shufflesUsed > 0 && (
            <p className="text-green-600 dark:text-green-400 text-sm mb-3">
              {t('shufflesUsed')}: {shufflesUsed}
            </p>
          )}
          <button
            onClick={initGame}
            className="mt-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium"
          >
            {t('playAgain')}
          </button>
        </div>
      )}

      {/* Stuck overlay */}
      {gameStatus === 'stuck' && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">{t('stuckTitle')}</h2>
          <p className="text-red-600 dark:text-red-400 mb-3">{t('stuckMessage')}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleShuffle}
              className="px-5 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 font-medium"
            >
              {t('shuffle')}
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium disabled:opacity-40"
            >
              {t('undo')}
            </button>
            <button
              onClick={initGame}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium"
            >
              {t('newGame')}
            </button>
          </div>
        </div>
      )}

      {/* Achievements */}
      <GameAchievements
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
      />

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('guideTitle')}</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('rulesTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {(t.raw('rulesItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('tipsTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {(t.raw('tipsItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('tilesTitle')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-medium text-red-600 dark:text-red-400">{t('tileMan')}</span>: 一~九萬 (9{t('tileTypes')})</div>
              <div><span className="font-medium text-blue-600 dark:text-blue-400">{t('tilePin')}</span>: ①~⑨ (9{t('tileTypes')})</div>
              <div><span className="font-medium text-green-600 dark:text-green-400">{t('tileSou')}</span>: 一~九索 (9{t('tileTypes')})</div>
              <div><span className="font-medium">{t('tileWind')}</span>: {t('tileWindList')}</div>
              <div><span className="font-medium">{t('tileDragon')}</span>: {t('tileDragonList')}</div>
              <div><span className="font-medium">{t('tileBonus')}</span>: {t('tileBonusDesc')}</div>
            </div>
          </div>
        </div>
      </div>
      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />
    </div>
  )
}
