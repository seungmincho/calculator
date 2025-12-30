'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Gamepad2, Users, Monitor, RefreshCw,
  ChevronRight, Trophy, Zap,
  Globe, Play, Target,
  User, Lock, Unlock, Loader2, Plus,
  Edit3, Check, MessageSquare, Sparkles
} from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { useAllAIStats } from '@/hooks/useAIGameStats'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom } from '@/utils/webrtc'

// 게임 타입 정의
type GameType = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes'
type PlayMode = 'computer' | 'online'
type Difficulty = 'easy' | 'normal' | 'hard'

interface GameInfo {
  id: GameType
  icon: string
  iconBg: string
  category: 'board' | 'strategy'
}

const GAMES: GameInfo[] = [
  { id: 'omok', icon: '⚫', iconBg: 'bg-amber-400', category: 'board' },
  { id: 'othello', icon: '🟢', iconBg: 'bg-emerald-500', category: 'strategy' },
  { id: 'connect4', icon: '🔴', iconBg: 'bg-orange-400', category: 'board' },
  { id: 'checkers', icon: '🏁', iconBg: 'bg-gray-800', category: 'board' },
  { id: 'mancala', icon: '🪨', iconBg: 'bg-amber-600', category: 'strategy' },
  { id: 'battleship', icon: '🚢', iconBg: 'bg-blue-500', category: 'strategy' },
  { id: 'dotsandboxes', icon: '📦', iconBg: 'bg-violet-500', category: 'board' },
]

interface GameHubProps {
  onStartGame: (game: GameType, mode: PlayMode, difficulty?: Difficulty) => void
  onJoinRoom: (game: GameType, room: GameRoom) => void
  onCreateRoom?: (game: GameType, room: GameRoom, peerId: string) => void
}

export default function GameHub({ onStartGame, onJoinRoom, onCreateRoom }: GameHubProps) {
  const t = useTranslations('gameHub')
  const tCommon = useTranslations('common')

  const {
    myStats, myTotalGames, myTotalWins, myTotalLosses,
    globalStats, isLoading: isLoadingAIStats
  } = useAllAIStats()

  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)
  const [playMode, setPlayMode] = useState<PlayMode>('computer')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'board' | 'strategy'>('all')
  const [isHovered, setIsHovered] = useState<GameType | null>(null)
  const [globalNickname, setGlobalNickname] = useState('')
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [tempNickname, setTempNickname] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('gameNickname')
    if (saved) setGlobalNickname(saved)
  }, [])

  const [roomTitle, setRoomTitle] = useState('')
  const [isPrivateRoom, setIsPrivateRoom] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [joiningRoom, setJoiningRoom] = useState<(GameRoom & { gameType: GameType }) | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  const { createRoom: createPeerRoom, disconnect: disconnectPeer } = usePeerConnection()

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

  const allWaitingRooms = GAMES.flatMap(game =>
    (gameRooms[game.id]?.rooms || []).map(room => ({ ...room, gameType: game.id }))
  ).filter(room => room.status === 'waiting')

  const totalStats = GAMES.reduce((acc, game) => {
    const stats = gameRooms[game.id]?.stats
    return {
      totalGames: acc.totalGames + (stats?.playing || 0),
      totalRooms: acc.totalRooms + (stats?.total || 0)
    }
  }, { totalGames: 0, totalRooms: 0 })

  const filteredGames = GAMES.filter(game => categoryFilter === 'all' || game.category === categoryFilter)

  const handleRefreshAll = useCallback(() => {
    Object.values(gameRooms).forEach(room => room.refreshRooms?.())
  }, [gameRooms])

  const handleSaveNickname = () => {
    if (tempNickname.trim()) {
      setGlobalNickname(tempNickname.trim())
      localStorage.setItem('gameNickname', tempNickname.trim())
    }
    setIsEditingNickname(false)
  }

  const handleStartEditNickname = () => {
    setTempNickname(globalNickname)
    setIsEditingNickname(true)
  }

  const handleStartGame = async () => {
    if (!selectedGame) return
    if (playMode === 'computer') {
      onStartGame(selectedGame, playMode, difficulty)
      return
    }
    if (!globalNickname.trim()) {
      setCreateError(t('enterNickname'))
      return
    }
    setIsCreatingRoom(true)
    setCreateError(null)
    try {
      const realPeerId = await createPeerRoom()
      if (!realPeerId) {
        setCreateError(t('createRoomError'))
        setIsCreatingRoom(false)
        return
      }
      const roomHook = gameRooms[selectedGame]
      const room = await roomHook.createRoom(globalNickname.trim(), realPeerId, isPrivateRoom, roomTitle.trim() || undefined)
      if (!room) {
        disconnectPeer()
        setCreateError(t('createRoomError'))
        setIsCreatingRoom(false)
        return
      }
      if (onCreateRoom) {
        onCreateRoom(selectedGame, room, realPeerId)
      } else {
        onStartGame(selectedGame, 'online')
      }
    } catch (err) {
      console.error('Room creation error:', err)
      disconnectPeer()
      setCreateError(t('createRoomError'))
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const getGameWaitingCount = (gameId: GameType) => gameRooms[gameId]?.rooms?.filter(r => r.status === 'waiting').length || 0

  const handleOpenJoinModal = (gameType: GameType, room: GameRoom) => {
    if (!globalNickname.trim()) {
      setJoinError(t('enterNickname'))
      return
    }
    setJoiningRoom({ ...room, gameType })
    setJoinError(null)
    setIsJoining(false)
  }

  const handleConfirmJoin = async () => {
    if (!joiningRoom) return
    if (!globalNickname.trim()) {
      setJoinError(t('enterNickname'))
      return
    }
    setIsJoining(true)
    setJoinError(null)
    try {
      const roomHook = gameRooms[joiningRoom.gameType]
      const success = await roomHook.joinRoom(joiningRoom.id)
      if (!success) {
        setJoinError(t('joinRoomError') || '방 입장에 실패했습니다.')
        setIsJoining(false)
        return
      }
      onJoinRoom(joiningRoom.gameType, joiningRoom)
      setJoiningRoom(null)
    } catch (err) {
      console.error('Join room error:', err)
      setJoinError(t('joinRoomError') || '방 입장에 실패했습니다.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleCloseJoinModal = () => {
    setJoiningRoom(null)
    setJoinError(null)
    setIsJoining(false)
  }

  const winRate = myTotalGames > 0 ? Math.round((myTotalWins / myTotalGames) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero 섹션 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              <span>{allWaitingRooms.length}개의 게임 대기중</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="text-blue-100 text-sm max-w-md">{t('description')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
              <Gamepad2 className="w-5 h-5 text-blue-200" />
              <div>
                <p className="text-xl font-bold">{GAMES.length}</p>
                <p className="text-xs text-blue-200">{t('selectGame')}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
              <Users className="w-5 h-5 text-blue-200" />
              <div>
                <p className="text-xl font-bold">{allWaitingRooms.length}</p>
                <p className="text-xs text-blue-200">{t('waitingRooms')}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
              <Trophy className="w-5 h-5 text-blue-200" />
              <div>
                <p className="text-xl font-bold">{myTotalGames}</p>
                <p className="text-xs text-blue-200">{t('gamesThisMonth')}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
              <Zap className="w-5 h-5 text-blue-200" />
              <div>
                <p className="text-xl font-bold">{totalStats.totalRooms}</p>
                <p className="text-xs text-blue-200">{t('activePlayers')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 닉네임 설정 바 */}
      <div className={`rounded-2xl p-4 shadow-sm border ${
        globalNickname.trim()
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              globalNickname.trim()
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                globalNickname.trim()
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                {globalNickname.trim() ? t('myNickname') || '내 닉네임' : t('setNicknameFirst') || '온라인 대전을 위해 닉네임을 설정하세요'}
              </p>
              {globalNickname.trim() && (
                <p className="text-lg font-bold text-gray-900 dark:text-white">{globalNickname}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditingNickname ? (
              <>
                <input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder={t('nicknamePlaceholder') || '닉네임을 입력하세요'}
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                  className="w-40 sm:w-48 px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleSaveNickname}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{tCommon('confirm') || '확인'}</span>
                </button>
                <button
                  onClick={() => setIsEditingNickname(false)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                >
                  {t('cancel') || '취소'}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEditNickname}
                className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  globalNickname.trim()
                    ? 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {globalNickname.trim() ? (t('edit') || '변경') : (t('setNickname') || '닉네임 설정')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 2:1 */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 게임 선택 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('selectGame')}</h2>
                </div>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  {(['all', 'board', 'strategy'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        categoryFilter === cat
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {cat === 'all' ? t('allGames') : t(`gameCategories.${cat}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredGames.map(game => {
                  const waitingCount = getGameWaitingCount(game.id)
                  const isSelected = selectedGame === game.id
                  return (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      onMouseEnter={() => setIsHovered(game.id)}
                      onMouseLeave={() => setIsHovered(null)}
                      className={`relative p-5 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 hover:shadow-md bg-white dark:bg-gray-800'
                      }`}
                    >
                      {waitingCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                          {waitingCount}
                        </span>
                      )}
                      <div className={`w-12 h-12 ${game.iconBg} rounded-xl flex items-center justify-center text-2xl mb-3 transition-transform ${isHovered === game.id ? 'scale-105' : ''}`}>
                        {game.icon}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{t(`gameList.${game.id}.name`)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t(`gameList.${game.id}.desc`)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 플레이 모드 */}
          {selectedGame && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('playMode')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setPlayMode('computer')}
                  className={`group p-5 rounded-xl border-2 transition-all ${
                    playMode === 'computer' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                    playMode === 'computer' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    <Monitor className="w-6 h-6" />
                  </div>
                  <p className={`font-bold text-center ${playMode === 'computer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t('vsComputer')}
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">AI와 대전</p>
                </button>
                <button
                  onClick={() => setPlayMode('online')}
                  className={`group p-5 rounded-xl border-2 transition-all ${
                    playMode === 'online' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                    playMode === 'online' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <p className={`font-bold text-center ${playMode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t('vsOnline')}
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">실시간 대전</p>
                </button>
              </div>

              {playMode === 'computer' && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('difficulty')}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'normal', 'hard'] as const).map(diff => {
                      const colors = {
                        easy: { active: 'bg-green-500 text-white', inactive: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
                        normal: { active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
                        hard: { active: 'bg-red-500 text-white', inactive: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' }
                      }
                      return (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`p-3 rounded-xl transition-all ${difficulty === diff ? colors[diff].active : colors[diff].inactive}`}
                        >
                          <div className="text-xl mb-1">{diff === 'easy' ? '😊' : diff === 'normal' ? '🎯' : '🔥'}</div>
                          <p className="font-bold text-sm">{t(diff)}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {playMode === 'online' && (
                <div className="mb-6 space-y-4">
                  {!globalNickname.trim() && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-3">
                      <User className="w-5 h-5 text-amber-600" />
                      <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">{t('setNicknameFirst') || '상단에서 닉네임을 먼저 설정해주세요'}</p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('roomTitle') || '방 제목'}</span>
                      <span className="text-xs text-gray-400">({t('optional') || '선택'})</span>
                    </div>
                    <input
                      type="text"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      placeholder={t('roomTitlePlaceholder') || '방 제목을 입력하세요'}
                      maxLength={30}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {createError && <p className="text-sm text-red-500">{createError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsPrivateRoom(false)}
                      className={`p-3 rounded-xl border-2 transition-all ${!isPrivateRoom ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <Globe className={`w-5 h-5 mx-auto mb-1 ${!isPrivateRoom ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <p className={`font-medium text-sm ${!isPrivateRoom ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'}`}>{t('publicRoom')}</p>
                    </button>
                    <button
                      onClick={() => setIsPrivateRoom(true)}
                      className={`p-3 rounded-xl border-2 transition-all ${isPrivateRoom ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <Lock className={`w-5 h-5 mx-auto mb-1 ${isPrivateRoom ? 'text-amber-600' : 'text-gray-400'}`} />
                      <p className={`font-medium text-sm ${isPrivateRoom ? 'text-amber-600' : 'text-gray-600 dark:text-gray-400'}`}>{t('privateRoom')}</p>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartGame}
                disabled={isCreatingRoom || (playMode === 'online' && !globalNickname.trim())}
                className={`w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isCreatingRoom || (playMode === 'online' && !globalNickname.trim())
                    ? 'bg-gray-400 cursor-not-allowed'
                    : playMode === 'online' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                {isCreatingRoom ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />{t('creating')}</>
                ) : playMode === 'online' ? (
                  <><Plus className="w-5 h-5" />{t('createRoom')}<ChevronRight className="w-5 h-5" /></>
                ) : (
                  <><Play className="w-5 h-5" />{t('startGame')}<ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 사이드바: 대기방 */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-sm font-bold">{allWaitingRooms.length}</span>
                  <span className="font-semibold">{t('waitingRooms')}</span>
                </div>
                <button onClick={handleRefreshAll} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {allWaitingRooms.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('noWaitingRooms')}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {allWaitingRooms.map(room => {
                    const gameInfo = GAMES.find(g => g.id === room.gameType)
                    const gameName = t(`gameList.${room.gameType}.name`)
                    // room_title이 있으면 방 제목, 없으면 호스트명 + 게임방
                    const displayTitle = room.room_title || `${room.host_name}의 ${gameName} 방`
                    return (
                      <div key={room.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${gameInfo?.iconBg || 'bg-gray-400'} rounded-lg flex items-center justify-center text-lg`}>{gameInfo?.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-base truncate">
                              {displayTitle}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{room.host_name}</span>
                              <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                {gameName} 대기중
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenJoinModal(room.gameType as GameType, room)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {t('joinRoom')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 통계 */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-violet-600" />
              <span className="font-semibold text-gray-900 dark:text-white">{t('myStats') || '나의 통계'}</span>
            </div>
          </div>
          <div className="p-4">
            {isLoadingAIStats ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
            ) : myTotalGames > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                    <p className="text-2xl font-bold text-green-600">{myTotalWins}</p>
                    <p className="text-xs text-gray-500">{t('wins')}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    <p className="text-2xl font-bold text-red-600">{myTotalLosses}</p>
                    <p className="text-xs text-gray-500">{t('losses')}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{myTotalGames}</p>
                    <p className="text-xs text-gray-500">{t('totalGames')}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{t('winRate') || '승률'}</span>
                    <span className={`font-bold ${winRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>{winRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${winRate}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {myStats.filter(s => s.totalGames > 0).map(stat => {
                    const game = GAMES.find(g => g.id === stat.game_type)
                    const gameWinRate = stat.totalGames > 0 ? Math.round((stat.totalWins / stat.totalGames) * 100) : 0
                    return (
                      <div key={stat.game_type} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <span className="text-lg">{game?.icon}</span>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{t(`gameList.${stat.game_type}.name`)}</span>
                        <span className="text-xs text-green-600">{stat.totalWins}W</span>
                        <span className="text-xs text-gray-400">-</span>
                        <span className="text-xs text-red-500">{stat.easy.losses + stat.normal.losses + stat.hard.losses}L</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gameWinRate >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{gameWinRate}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Monitor className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">{t('noAiGames')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-gray-900 dark:text-white">{t('globalStats') || '전체 통계'}</span>
            </div>
          </div>
          <div className="p-4">
            {isLoadingAIStats ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : globalStats && (globalStats.totalGames > 0 || globalStats.totalRoomsCreated > 0) ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{globalStats.totalGames.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('totalGamesPlayed') || '총 게임 수'}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
                    <Monitor className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{globalStats.totalAIGames.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('aiGames') || 'AI 대전'}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{globalStats.totalOnlineGames.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('onlineGames') || '온라인 대전'}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <Gamepad2 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{globalStats.totalRoomsCreated.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('roomsCreated') || '생성된 방'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{globalStats.uniquePlayers.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('uniquePlayers') || '참여자'}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{totalStats.totalRooms}</p>
                    <p className="text-xs text-gray-500">{t('activeRooms') || '현재 활성 방'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('gamePopularity') || '게임별 인기도'}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {GAMES.map(game => ({
                      ...game,
                      games: globalStats.byGameType[game.id]?.games || 0,
                      aiGames: globalStats.byGameType[game.id]?.aiGames || 0,
                      onlineGames: globalStats.byGameType[game.id]?.onlineGames || 0,
                      roomsCreated: globalStats.byGameType[game.id]?.roomsCreated || 0
                    }))
                      .sort((a, b) => b.games - a.games)
                      .map((game, index) => {
                        const maxGames = Math.max(...Object.values(globalStats.byGameType).map(s => s.games), 1)
                        const percentage = maxGames > 0 ? (game.games / maxGames) * 100 : 0
                        return (
                          <div key={game.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                            }`}>{index + 1}</span>
                            <span className="text-lg">{game.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(`gameList.${game.id}.name`)}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-indigo-500" title="AI 대전">{game.aiGames}</span>
                                  <span className="text-xs text-gray-400">/</span>
                                  <span className="text-xs text-emerald-500" title="온라인 대전">{game.onlineGames}</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">{t('noGlobalStats') || '아직 통계 데이터가 없습니다'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 방 입장 모달 */}
      {joiningRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{GAMES.find(g => g.id === joiningRoom.gameType)?.icon}</div>
                <div>
                  <h3 className="text-xl font-bold">{t('joinRoom')}</h3>
                  {joiningRoom.room_title && <p className="text-white/90">{joiningRoom.room_title}</p>}
                  <p className="text-blue-200 text-sm">{t(`gameList.${joiningRoom.gameType}.name`)} - {joiningRoom.host_name}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <User className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">{t('myNickname') || '내 닉네임'}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{globalNickname}</p>
                </div>
              </div>
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseJoinModal}
                  disabled={isJoining}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  {t('cancel') || '취소'}
                </button>
                <button
                  onClick={handleConfirmJoin}
                  disabled={isJoining || !globalNickname}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isJoining ? <><Loader2 className="w-5 h-5 animate-spin" />{t('joining') || '입장 중...'}</> : <><Play className="w-5 h-5" />{t('joinRoom')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
