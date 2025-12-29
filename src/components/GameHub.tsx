'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Gamepad2, Users, Monitor, RefreshCw,
  ChevronRight, Trophy, Clock, Zap, Sparkles,
  Globe, Star, TrendingUp, Play, Crown, Target,
  User, Lock, Unlock, Loader2, Plus, BarChart3, Cpu
} from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { useAllAIStats } from '@/hooks/useAIGameStats'
import { GameRoom } from '@/utils/webrtc'

// 게임 타입 정의
type GameType = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes'
type PlayMode = 'computer' | 'online'
type Difficulty = 'easy' | 'normal' | 'hard'

interface GameInfo {
  id: GameType
  icon: string
  color: string
  bgGradient: string
  category: 'board' | 'strategy'
}

const GAMES: GameInfo[] = [
  { id: 'omok', icon: '⚫', color: 'from-slate-600 to-slate-800', bgGradient: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900', category: 'board' },
  { id: 'othello', icon: '🟢', color: 'from-emerald-500 to-emerald-700', bgGradient: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30', category: 'strategy' },
  { id: 'connect4', icon: '🔴', color: 'from-rose-500 to-amber-500', bgGradient: 'bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/30 dark:to-amber-900/30', category: 'board' },
  { id: 'checkers', icon: '🏁', color: 'from-amber-500 to-red-600', bgGradient: 'bg-gradient-to-br from-amber-50 to-red-50 dark:from-amber-900/30 dark:to-red-900/30', category: 'board' },
  { id: 'mancala', icon: '🥜', color: 'from-amber-600 to-amber-800', bgGradient: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30', category: 'strategy' },
  { id: 'battleship', icon: '🚢', color: 'from-blue-500 to-blue-700', bgGradient: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30', category: 'strategy' },
  { id: 'dotsandboxes', icon: '📦', color: 'from-violet-500 to-purple-600', bgGradient: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30', category: 'board' },
]

interface GameHubProps {
  onStartGame: (game: GameType, mode: PlayMode, difficulty?: Difficulty) => void
  onJoinRoom: (game: GameType, room: GameRoom) => void
  onCreateRoom?: (game: GameType, room: GameRoom, peerId: string) => void
}

export default function GameHub({ onStartGame, onJoinRoom, onCreateRoom }: GameHubProps) {
  const t = useTranslations('gameHub')

  // AI 대전 통계
  const { allStats, totalGames: aiTotalGames, totalWins: aiTotalWins, isLoading: isLoadingAIStats } = useAllAIStats()

  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)
  const [playMode, setPlayMode] = useState<PlayMode>('computer')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'board' | 'strategy'>('all')
  const [isHovered, setIsHovered] = useState<GameType | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<'rooms' | 'stats'>('rooms')

  // 온라인 모드 방 생성 상태
  const [nickname, setNickname] = useState('')
  const [isPrivateRoom, setIsPrivateRoom] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // 방 입장 모달 상태
  const [joiningRoom, setJoiningRoom] = useState<(GameRoom & { gameType: GameType }) | null>(null)
  const [joinNickname, setJoinNickname] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // PeerJS는 게임 컴포넌트에서 직접 생성하므로 여기서는 사용하지 않음

  // 각 게임별 방 목록을 가져옴
  const omokRoom = useGameRoom('omok')
  const othelloRoom = useGameRoom('othello')
  const connect4Room = useGameRoom('connect4')
  const checkersRoom = useGameRoom('checkers')
  const mancalaRoom = useGameRoom('mancala')
  const battleshipRoom = useGameRoom('battleship')
  const dotsRoom = useGameRoom('dotsandboxes')

  const gameRooms: Record<GameType, typeof omokRoom> = {
    omok: omokRoom,
    othello: othelloRoom,
    connect4: connect4Room,
    checkers: checkersRoom,
    mancala: mancalaRoom,
    battleship: battleshipRoom,
    dotsandboxes: dotsRoom
  }

  // 모든 대기 중인 방 목록
  const allWaitingRooms = GAMES.flatMap(game =>
    (gameRooms[game.id]?.rooms || []).map(room => ({
      ...room,
      gameType: game.id
    }))
  ).filter(room => room.status === 'waiting')

  // 총 통계
  const totalStats = GAMES.reduce((acc, game) => {
    const stats = gameRooms[game.id]?.stats
    return {
      totalGames: acc.totalGames + (stats?.playing || 0),
      totalRooms: acc.totalRooms + (stats?.total || 0)
    }
  }, { totalGames: 0, totalRooms: 0 })

  const filteredGames = GAMES.filter(game =>
    categoryFilter === 'all' || game.category === categoryFilter
  )

  const handleRefreshAll = useCallback(() => {
    Object.values(gameRooms).forEach(room => room.refreshRooms?.())
  }, [gameRooms])

  const handleStartGame = async () => {
    if (!selectedGame) return

    // 컴퓨터 대전 모드
    if (playMode === 'computer') {
      onStartGame(selectedGame, playMode, difficulty)
      return
    }

    // 온라인 모드 - 방 생성
    if (!nickname.trim()) {
      setCreateError(t('enterNickname'))
      return
    }

    setIsCreatingRoom(true)
    setCreateError(null)

    try {
      // 닉네임 저장
      localStorage.setItem('gameNickname', nickname.trim())

      // Supabase에 방 생성 (임시 placeholder peer ID 사용 - 게임 컴포넌트에서 실제 ID로 업데이트)
      const roomHook = gameRooms[selectedGame]
      const placeholderPeerId = `pending_${crypto.randomUUID()}`
      const room = await roomHook.createRoom(nickname.trim(), placeholderPeerId, isPrivateRoom)

      if (!room) {
        setCreateError(t('createRoomError'))
        setIsCreatingRoom(false)
        return
      }

      // 방 생성 성공 - 게임 시작 (게임 컴포넌트에서 실제 PeerJS 연결 생성)
      if (onCreateRoom) {
        onCreateRoom(selectedGame, room, placeholderPeerId)
      } else {
        // fallback: 기존 방식
        onStartGame(selectedGame, 'online')
      }
    } catch (err) {
      console.error('Room creation error:', err)
      setCreateError(t('createRoomError'))
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const getGameWaitingCount = (gameId: GameType) => {
    return gameRooms[gameId]?.rooms?.filter(r => r.status === 'waiting').length || 0
  }

  // 방 입장 버튼 클릭 시 모달 열기
  const handleOpenJoinModal = (gameType: GameType, room: GameRoom) => {
    // 저장된 닉네임 불러오기
    const savedNickname = localStorage.getItem('gameNickname') || ''
    setJoinNickname(savedNickname)
    setJoiningRoom({ ...room, gameType })
    setJoinError(null)
    setIsJoining(false)
  }

  // 모달에서 입장 확정
  const handleConfirmJoin = async () => {
    if (!joiningRoom) return

    if (!joinNickname.trim()) {
      setJoinError(t('enterNickname'))
      return
    }

    setIsJoining(true)
    setJoinError(null)

    try {
      // 닉네임 저장
      localStorage.setItem('gameNickname', joinNickname.trim())

      // Supabase에 방 입장 처리
      const roomHook = gameRooms[joiningRoom.gameType]
      const success = await roomHook.joinRoom(joiningRoom.id)

      if (!success) {
        setJoinError(t('joinRoomError') || '방 입장에 실패했습니다.')
        setIsJoining(false)
        return
      }

      // 성공 - 게임 시작
      onJoinRoom(joiningRoom.gameType, joiningRoom)
      setJoiningRoom(null)
    } catch (err) {
      console.error('Join room error:', err)
      setJoinError(t('joinRoomError') || '방 입장에 실패했습니다.')
    } finally {
      setIsJoining(false)
    }
  }

  // 모달 닫기
  const handleCloseJoinModal = () => {
    setJoiningRoom(null)
    setJoinError(null)
    setIsJoining(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 헤더 영역 - 그라디언트 배경 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 md:p-12 text-white shadow-2xl">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {GAMES.length} Games Available
                  </span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
                {t('title')}
              </h1>
              <p className="text-white/80 text-lg max-w-xl">
                {t('description')}
              </p>
            </div>

            {/* 실시간 통계 */}
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Globe className="w-4 h-4 text-green-300" />
                  <span className="text-2xl font-bold">{allWaitingRooms.length}</span>
                </div>
                <p className="text-xs text-white/70">{t('waitingRooms')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-yellow-300" />
                  <span className="text-2xl font-bold">{totalStats.totalGames}</span>
                </div>
                <p className="text-xs text-white/70">{t('gamesThisMonth')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700/50 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{GAMES.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('selectGame')}</p>
            </div>
          </div>
        </div>
        <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700/50 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{allWaitingRooms.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('waitingRooms')}</p>
            </div>
          </div>
        </div>
        <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700/50 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white shadow-lg shadow-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.totalGames}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('gamesThisMonth')}</p>
            </div>
          </div>
        </div>
        <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700/50 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.totalRooms}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('activeRooms')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 게임 선택 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            {/* 카테고리 필터 헤더 */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('selectGame')}
                  </h2>
                </div>
                <div className="flex gap-2 bg-white dark:bg-gray-700 p-1.5 rounded-xl shadow-sm">
                  {(['all', 'board', 'strategy'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        categoryFilter === cat
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {cat === 'all' ? t('allGames') : t(`gameCategories.${cat}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 게임 그리드 */}
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredGames.map(game => {
                  const waitingCount = getGameWaitingCount(game.id)
                  const isSelected = selectedGame === game.id

                  return (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      onMouseEnter={() => setIsHovered(game.id)}
                      onMouseLeave={() => setIsHovered(null)}
                      className={`relative p-5 rounded-2xl text-left transition-all duration-300 transform ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800 scale-[1.02] shadow-lg'
                          : 'hover:scale-[1.02] hover:shadow-lg'
                      } ${game.bgGradient}`}
                    >
                      {/* 대기방 배지 */}
                      {waitingCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          {waitingCount}
                        </span>
                      )}

                      {/* 선택됨 마크 */}
                      {isSelected && (
                        <div className="absolute top-2 left-2">
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-white fill-white" />
                          </div>
                        </div>
                      )}

                      <div className={`text-4xl mb-3 transition-transform duration-300 ${isHovered === game.id ? 'scale-110' : ''}`}>
                        {game.icon}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        {t(`gameList.${game.id}.name`)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {t(`gameList.${game.id}.desc`)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 플레이 모드 선택 */}
          {selectedGame && (
            <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/50 p-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                  <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('playMode')}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setPlayMode('computer')}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                    playMode === 'computer'
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  {playMode === 'computer' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                  )}
                  <div className="relative z-10">
                    <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      playMode === 'computer'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-500'
                    }`}>
                      <Monitor className="w-7 h-7" />
                    </div>
                    <p className={`font-bold text-lg mb-1 ${
                      playMode === 'computer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {t('vsComputer')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI와 대전하세요
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setPlayMode('online')}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                    playMode === 'online'
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  {playMode === 'online' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
                  )}
                  <div className="relative z-10">
                    <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      playMode === 'online'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 group-hover:text-emerald-500'
                    }`}>
                      <Users className="w-7 h-7" />
                    </div>
                    <p className={`font-bold text-lg mb-1 ${
                      playMode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {t('vsOnline')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      실시간 대전
                    </p>
                  </div>
                </button>
              </div>

              {/* 난이도 선택 (컴퓨터 대전시) */}
              {playMode === 'computer' && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                      {t('difficulty')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'normal', 'hard'] as const).map(diff => {
                      const colors = {
                        easy: {
                          active: 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30',
                          inactive: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
                        },
                        normal: {
                          active: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30',
                          inactive: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        },
                        hard: {
                          active: 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg shadow-red-500/30',
                          inactive: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                        }
                      }

                      return (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`p-4 rounded-xl transition-all duration-300 ${
                            difficulty === diff ? colors[diff].active : colors[diff].inactive
                          }`}
                        >
                          <div className="flex justify-center mb-2">
                            {diff === 'easy' && <span className="text-2xl">😊</span>}
                            {diff === 'normal' && <span className="text-2xl">🎯</span>}
                            {diff === 'hard' && <span className="text-2xl">🔥</span>}
                          </div>
                          <p className="font-bold text-sm">{t(diff)}</p>
                          <p className={`text-xs mt-1 ${difficulty === diff ? 'opacity-90' : 'opacity-70'}`}>
                            {t(`${diff}Desc`)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 온라인 모드 - 방 생성 설정 */}
              {playMode === 'online' && (
                <div className="mb-6 space-y-4">
                  {/* 닉네임 입력 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        {t('enterNickname')}
                      </h3>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => {
                          setNickname(e.target.value)
                          setCreateError(null)
                        }}
                        placeholder={t('nicknamePlaceholder')}
                        maxLength={20}
                        className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none ${
                          createError
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-gray-200 dark:border-gray-600 focus:border-emerald-500'
                        }`}
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {nickname.length}/20
                      </div>
                    </div>
                    {createError && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {createError}
                      </p>
                    )}
                  </div>

                  {/* 공개/비공개 선택 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {isPrivateRoom ? (
                        <Lock className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Unlock className="w-5 h-5 text-emerald-500" />
                      )}
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        {t('roomVisibility')}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setIsPrivateRoom(false)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          !isPrivateRoom
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Globe className={`w-6 h-6 ${!isPrivateRoom ? 'text-emerald-600' : 'text-gray-400'}`} />
                        </div>
                        <p className={`font-bold text-sm ${!isPrivateRoom ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {t('publicRoom')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('publicRoomDesc')}
                        </p>
                      </button>
                      <button
                        onClick={() => setIsPrivateRoom(true)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          isPrivateRoom
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Lock className={`w-6 h-6 ${isPrivateRoom ? 'text-amber-600' : 'text-gray-400'}`} />
                        </div>
                        <p className={`font-bold text-sm ${isPrivateRoom ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {t('privateRoom')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('privateRoomDesc')}
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 시작 버튼 */}
              <button
                onClick={handleStartGame}
                disabled={isCreatingRoom}
                className={`w-full py-4 text-white font-bold text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl ${
                  isCreatingRoom
                    ? 'bg-gray-400 cursor-not-allowed'
                    : playMode === 'online'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isCreatingRoom ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {t('creating')}
                  </>
                ) : playMode === 'online' ? (
                  <>
                    <Plus className="w-6 h-6" />
                    {t('createRoom')}
                    <ChevronRight className="w-6 h-6" />
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    {t('startGame')}
                    <ChevronRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 대기 중인 방 / 통계 탭 */}
        <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          {/* 탭 헤더 */}
          <div className={`p-4 ${rightPanelTab === 'rooms' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'} text-white`}>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setRightPanelTab('rooms')}
                className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all ${
                  rightPanelTab === 'rooms'
                    ? 'bg-white/30 backdrop-blur-sm'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  <span>{t('waitingRooms')}</span>
                  {allWaitingRooms.length > 0 && (
                    <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">
                      {allWaitingRooms.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setRightPanelTab('stats')}
                className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all ${
                  rightPanelTab === 'stats'
                    ? 'bg-white/30 backdrop-blur-sm'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>{t('statistics')}</span>
                </div>
              </button>
            </div>
            {rightPanelTab === 'rooms' && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/80">
                  {allWaitingRooms.length > 0 ? `${allWaitingRooms.length}개 대기 중` : '대기 중인 방 없음'}
                </p>
                <button
                  onClick={handleRefreshAll}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all backdrop-blur-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {/* 대기 중인 방 목록 */}
            {rightPanelTab === 'rooms' && (
              <>
                {allWaitingRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {t('noWaitingRooms')}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      새 게임을 시작해보세요!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {allWaitingRooms.map(room => {
                      const gameInfo = GAMES.find(g => g.id === room.gameType)
                      return (
                        <div
                          key={room.id}
                          className={`group p-4 rounded-2xl transition-all duration-300 hover:shadow-md ${gameInfo?.bgGradient || 'bg-gray-50 dark:bg-gray-700/50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{gameInfo?.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white truncate">
                                {room.host_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                {t(`gameList.${room.gameType}.name`)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenJoinModal(room.gameType as GameType, room)}
                              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                            >
                              {t('joinRoom')}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* 통계 탭 */}
            {rightPanelTab === 'stats' && (
              <div className="space-y-4">
                {/* AI 대전 통계 */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('aiStats')}</span>
                  </div>
                  {isLoadingAIStats ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                    </div>
                  ) : aiTotalGames > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{aiTotalWins}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('wins')}</p>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2">
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">{aiTotalGames - aiTotalWins}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('losses')}</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                          <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{aiTotalGames}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalGames')}</p>
                        </div>
                      </div>
                      {/* 게임별 AI 대전 기록 */}
                      <div className="space-y-1.5 mt-2">
                        {allStats.filter(s => s.totalGames > 0).map(stat => {
                          const game = GAMES.find(g => g.id === stat.game_type)
                          const winRate = stat.totalGames > 0 ? Math.round((stat.totalWins / stat.totalGames) * 100) : 0
                          return (
                            <div key={stat.game_type} className="flex items-center gap-2 text-sm">
                              <span>{game?.icon}</span>
                              <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">
                                {t(`gameList.${stat.game_type}.name`)}
                              </span>
                              <span className="text-xs text-green-600 dark:text-green-400">{stat.totalWins}W</span>
                              <span className="text-xs text-gray-400">/</span>
                              <span className="text-xs text-gray-500">{stat.totalGames}</span>
                              <span className={`text-xs font-medium ${winRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                                ({winRate}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                      {t('noAiGames')}
                    </p>
                  )}
                </div>

                {/* 온라인 전체 통계 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t('gamesThisMonth')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalGames}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t('activeRooms')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalRooms}</p>
                  </div>
                </div>

                {/* 게임별 순위 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t('gameRanking')}
                  </h3>
                  <div className="space-y-2">
                    {GAMES.map((game, index) => {
                      const stats = gameRooms[game.id]?.stats
                      const monthlyStats = gameRooms[game.id]?.monthlyStats
                      const gamesPlayed = monthlyStats?.reduce((sum, m) => sum + m.totalGames, 0) || 0

                      return (
                        <div key={game.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                            index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                            index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                            'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-xl">{game.icon}</span>
                          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(`gameList.${game.id}.name`)}
                          </span>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{gamesPlayed}</p>
                            <p className="text-xs text-gray-400">{stats?.playing || 0} {t('playing')}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 방 입장 모달 */}
      {joiningRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {GAMES.find(g => g.id === joiningRoom.gameType)?.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('joinRoom')}</h3>
                  <p className="text-white/80 text-sm">
                    {t(`gameList.${joiningRoom.gameType}.name`)} - {joiningRoom.host_name}
                  </p>
                </div>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-4">
              {/* 닉네임 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('enterNickname')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={joinNickname}
                    onChange={(e) => {
                      setJoinNickname(e.target.value)
                      setJoinError(null)
                    }}
                    placeholder={t('nicknamePlaceholder')}
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isJoining) {
                        handleConfirmJoin()
                      }
                    }}
                    className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none ${
                      joinError
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500'
                    }`}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {joinNickname.length}/20
                  </div>
                </div>
                {joinError && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {joinError}
                  </p>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCloseJoinModal}
                  disabled={isJoining}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  {t('cancel') || '취소'}
                </button>
                <button
                  onClick={handleConfirmJoin}
                  disabled={isJoining}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('joining') || '입장 중...'}
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {t('joinRoom')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 스타일 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  )
}
