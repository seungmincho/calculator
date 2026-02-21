'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Gamepad2, Users, Monitor, RefreshCw,
  ChevronRight, Trophy, Zap,
  Globe, Play, Target,
  User, Lock, Loader2, Plus,
  Edit3, Check, MessageSquare
} from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { useAllAIStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements from '@/components/GameAchievements'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom } from '@/utils/webrtc'
import { menuConfig, MenuItem } from '@/config/menuConfig'

// 보드게임 타입 (AI/온라인 지원)
type GameType = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes'
type PlayMode = 'computer' | 'online'
type Difficulty = 'easy' | 'normal' | 'hard'
type ModeFilter = 'all' | 'multiplayer' | 'solo'

// href → gameType ID 변환 ('/dots-and-boxes' → 'dotsandboxes')
const hrefToGameId = (href: string): GameType =>
  href.slice(1).replace(/-/g, '') as GameType

// menuConfig에서 게임 목록 자동 추출 (modes 필드가 있는 항목만)
const ALL_GAMES: MenuItem[] = menuConfig.games.items.filter(item => item.modes && item.modes.length > 0)
const BOARD_GAMES: MenuItem[] = ALL_GAMES.filter(g => g.modes?.includes('ai') || g.modes?.includes('online'))
const SOLO_GAMES: MenuItem[] = ALL_GAMES.filter(g => g.modes?.includes('solo') && !g.modes?.includes('ai'))
const SOLO_INDEX_MAP = new Map(SOLO_GAMES.map((g, i) => [g.href, i]))

// 보드게임 아이콘 배경색
const BOARD_GAME_COLOR_MAP: Record<string, string> = {
  '/omok': 'bg-amber-400',
  '/othello': 'bg-emerald-500',
  '/connect4': 'bg-orange-400',
  '/checkers': 'bg-gray-700',
  '/mancala': 'bg-amber-600',
  '/battleship': 'bg-blue-500',
  '/dots-and-boxes': 'bg-violet-500',
}

// 솔로게임 아이콘 배경색 (인덱스 기반 팔레트)
const SOLO_PALETTE = [
  'bg-pink-400', 'bg-teal-500', 'bg-cyan-500', 'bg-lime-500',
  'bg-rose-500', 'bg-sky-500', 'bg-fuchsia-500', 'bg-indigo-400',
  'bg-red-400', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
]

function getGameColor(game: MenuItem, soloIndex: number): string {
  if (game.modes?.includes('ai') || game.modes?.includes('online')) {
    return BOARD_GAME_COLOR_MAP[game.href] || 'bg-gray-500'
  }
  return SOLO_PALETTE[soloIndex % SOLO_PALETTE.length]
}

interface GameHubProps {
  onStartGame: (game: GameType, mode: PlayMode, difficulty?: Difficulty) => void
  onJoinRoom: (game: GameType, room: GameRoom) => void
  onCreateRoom?: (game: GameType, room: GameRoom, peerId: string) => void
}

export default function GameHub({ onStartGame, onJoinRoom, onCreateRoom }: GameHubProps) {
  const t = useTranslations('gameHub')
  const tFooter = useTranslations('footer')
  const tShowcase = useTranslations('toolsShowcase')
  const router = useRouter()

  const {
    myStats, myTotalGames, myTotalWins, myTotalLosses,
    globalStats, isLoading: isLoadingAIStats
  } = useAllAIStats()

  const { achievements, unlockedCount, totalCount } = useGameAchievements()

  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)
  const [playMode, setPlayMode] = useState<PlayMode>('computer')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
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

  // 보드게임 온라인 방 훅 (7개 고정)
  const omokRoom = useGameRoom('omok')
  const othelloRoom = useGameRoom('othello')
  const connect4Room = useGameRoom('connect4')
  const checkersRoom = useGameRoom('checkers')
  const mancalaRoom = useGameRoom('mancala')
  const battleshipRoom = useGameRoom('battleship')
  const dotsRoom = useGameRoom('dotsandboxes')

  const gameRooms = useMemo<Record<GameType, typeof omokRoom>>(() => ({
    omok: omokRoom,
    othello: othelloRoom,
    connect4: connect4Room,
    checkers: checkersRoom,
    mancala: mancalaRoom,
    battleship: battleshipRoom,
    dotsandboxes: dotsRoom
  }), [omokRoom, othelloRoom, connect4Room, checkersRoom, mancalaRoom, battleshipRoom, dotsRoom])

  const allWaitingRooms = useMemo(() => BOARD_GAMES.flatMap(game => {
    const id = hrefToGameId(game.href)
    return (gameRooms[id]?.rooms || []).map(room => ({ ...room, gameType: id }))
  }).filter(room => room.status === 'waiting'), [gameRooms])

  // 필터링된 게임 목록 (솔로 인덱스 추적용)
  const filteredGames = useMemo(() => ALL_GAMES.filter(game => {
    if (modeFilter === 'multiplayer') return game.modes?.includes('ai') || game.modes?.includes('online')
    if (modeFilter === 'solo') return game.modes?.includes('solo') && !game.modes?.includes('ai')
    return true
  }), [modeFilter])

  // 솔로게임 색상용 전체 솔로게임 인덱스 매핑 (모듈 스코프 상수 사용)
  const soloGames = SOLO_GAMES
  const soloIndexMap = SOLO_INDEX_MAP

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

  // 게임 카드 클릭: 보드게임 → 모드 선택, 솔로게임 → 페이지 이동
  const handleGameClick = (game: MenuItem) => {
    const isBoardGame = game.modes?.includes('ai') || game.modes?.includes('online')
    if (isBoardGame) {
      const gameId = hrefToGameId(game.href)
      setSelectedGame(prev => prev === gameId ? null : gameId)
      // 모드 선택 패널이 열릴 때 스크롤
      setTimeout(() => {
        document.getElementById('mode-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    } else {
      router.push(game.href)
    }
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

  const getGameWaitingCount = (gameId: GameType) =>
    gameRooms[gameId]?.rooms?.filter(r => r.status === 'waiting').length || 0

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

  // 번역 헬퍼: menuConfig의 labelKey/descriptionKey 재사용
  const getGameName = (game: MenuItem) => {
    try {
      return tFooter(game.labelKey.replace('footer.', ''))
    } catch {
      return game.href.slice(1)
    }
  }
  const getGameDesc = (game: MenuItem) => {
    try {
      return tShowcase(game.descriptionKey.replace('toolsShowcase.', ''))
    } catch {
      return ''
    }
  }

  // 선택된 보드게임 정보
  const selectedGameInfo = selectedGame
    ? BOARD_GAMES.find(g => hrefToGameId(g.href) === selectedGame)
    : null

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* 슬림 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-5 py-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">{t('title')}</h1>
              <p className="text-blue-200 text-xs hidden sm:block">{t('description')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
              <Target className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-sm font-semibold">{ALL_GAMES.length}</span>
              <span className="text-xs text-blue-200">{t('selectGame')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
              <Users className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-sm font-semibold">{allWaitingRooms.length}</span>
              <span className="text-xs text-blue-200">{t('waitingRooms')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
              <Trophy className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-sm font-semibold">{myTotalGames}</span>
              <span className="text-xs text-blue-200">{t('gamesThisMonth')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 닉네임 바 (compact) */}
      <div className={`rounded-xl px-4 py-2.5 border flex items-center gap-3 ${
        globalNickname.trim()
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          globalNickname.trim() ? 'bg-emerald-500' : 'bg-amber-500'
        }`}>
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs ${globalNickname.trim() ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {globalNickname.trim() ? t('myNickname') || '내 닉네임 (온라인 대전용)' : t('setNicknameFirst') || '온라인 대전을 위해 닉네임을 설정하세요'}
          </span>
          {globalNickname.trim() && (
            <span className="ml-2 font-bold text-gray-900 dark:text-white text-sm">{globalNickname}</span>
          )}
        </div>
        {isEditingNickname ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              placeholder={t('nicknamePlaceholder') || '닉네임 입력'}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
              className="w-32 px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
            <button onClick={handleSaveNickname} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setIsEditingNickname(false)} className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg transition-colors">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEditNickname}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              globalNickname.trim()
                ? 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {globalNickname.trim() ? (t('edit') || '변경') : (t('setNickname') || '설정')}
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {([
          { key: 'all' as ModeFilter, label: t('filterAll') || '전체', count: ALL_GAMES.length, sub: '' },
          { key: 'multiplayer' as ModeFilter, label: t('filterMultiplayer') || '보드게임', count: BOARD_GAMES.length, sub: 'AI · 온라인' },
          { key: 'solo' as ModeFilter, label: t('filterSolo') || '솔로게임', count: soloGames.length, sub: t('playNow') || '바로 플레이' },
        ]).map(({ key, label, count, sub }) => (
          <button
            key={key}
            onClick={() => setModeFilter(key)}
            aria-pressed={modeFilter === key}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              modeFilter === key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>{label}</span>
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              modeFilter === key ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>{count}</span>
            {sub && <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</span>}
          </button>
        ))}
      </div>

      {/* 게임 그리드 + 모드 선택 패널 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* 게임 카드 그리드 */}
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {filteredGames.map((game) => {
              const isBoardGame = game.modes?.includes('ai') || game.modes?.includes('online')
              const gameId = isBoardGame ? hrefToGameId(game.href) : null
              const isSelected = gameId !== null && selectedGame === gameId
              const waitingCount = gameId ? getGameWaitingCount(gameId) : 0
              const soloIdx = soloIndexMap.get(game.href) ?? 0
              const iconBg = getGameColor(game, soloIdx)
              const name = getGameName(game)
              const desc = getGameDesc(game)

              return (
                <button
                  key={game.href}
                  onClick={() => handleGameClick(game)}
                  aria-label={name}
                  aria-pressed={isBoardGame ? isSelected : undefined}
                  className={`relative p-3 rounded-xl text-left transition-all border group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                      : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm bg-white dark:bg-gray-800/50'
                  }`}
                >
                  {/* 대기방 배지 */}
                  {waitingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                      {waitingCount}
                    </span>
                  )}
                  {/* 아이콘 */}
                  <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center text-xl mb-2 group-hover:scale-105 transition-transform`}>
                    {game.icon}
                  </div>
                  {/* 게임명 */}
                  <p className="font-semibold text-gray-900 dark:text-white text-xs leading-tight mb-1.5 line-clamp-1">{name}</p>
                  {/* 설명 (hover 시 표시) */}
                  <p className="text-gray-400 dark:text-gray-500 text-xs line-clamp-1 mb-1.5 hidden sm:block">{desc}</p>
                  {/* 모드 배지 */}
                  <div className="flex gap-1 flex-wrap">
                    {game.modes?.includes('ai') && (
                      <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md font-medium">
                        <Monitor className="w-2.5 h-2.5" />AI
                      </span>
                    )}
                    {game.modes?.includes('online') && (
                      <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md font-medium">
                        <Users className="w-2.5 h-2.5" />온라인
                      </span>
                    )}
                    {game.modes?.includes('solo') && !game.modes?.includes('ai') && (
                      <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-md font-medium">
                        ▶ {t('badgeSolo') || '솔로'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 보드게임 모드 선택 패널 (인라인) */}
        {selectedGame && selectedGameInfo && (
          <div id="mode-panel" className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* 선택된 게임 표시 */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${getGameColor(selectedGameInfo, 0)} rounded-lg flex items-center justify-center text-lg`}>
                  {selectedGameInfo.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">{getGameName(selectedGameInfo)}</h3>
                <span className="text-sm text-gray-400">· {t('playMode')}</span>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                >
                  {t('closePanel') || '✕ 닫기'}
                </button>
              </div>

              {/* 모드 선택 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlayMode('computer')}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    playMode === 'computer'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className={`w-4 h-4 ${playMode === 'computer' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={`font-bold text-sm ${playMode === 'computer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {t('vsComputer')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{t('vsComputerDesc') || 'AI와 1인 플레이'}</p>
                </button>
                <button
                  onClick={() => setPlayMode('online')}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    playMode === 'online'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className={`w-4 h-4 ${playMode === 'online' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`font-bold text-sm ${playMode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {t('vsOnline')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{t('vsOnlineDesc') || '실시간 온라인 대전'}</p>
                </button>
              </div>

              {/* 난이도 (AI 모드) */}
              {playMode === 'computer' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('difficulty')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'normal', 'hard'] as const).map(diff => {
                      const colors = {
                        easy: { active: 'bg-green-500 text-white', inactive: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800' },
                        normal: { active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
                        hard: { active: 'bg-red-500 text-white', inactive: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800' }
                      }
                      return (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`py-2 px-3 rounded-xl transition-all text-center ${difficulty === diff ? colors[diff].active : colors[diff].inactive}`}
                        >
                          <span className="block text-base mb-0.5">{diff === 'easy' ? '😊' : diff === 'normal' ? '🎯' : '🔥'}</span>
                          <span className="font-bold text-xs">{t(diff)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 온라인 설정 */}
              {playMode === 'online' && (
                <div className="space-y-3">
                  {!globalNickname.trim() && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <User className="w-4 h-4" />
                      {t('setNicknameFirst') || '상단에서 닉네임을 먼저 설정하세요'}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      placeholder={t('roomTitlePlaceholder') || '방 제목 (선택)'}
                      maxLength={30}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => setIsPrivateRoom(false)}
                      className={`p-1.5 rounded-lg border transition-all ${!isPrivateRoom ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}
                      title="공개 방"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsPrivateRoom(true)}
                      className={`p-1.5 rounded-lg border transition-all ${isPrivateRoom ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}
                      title="비공개 방"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                  {createError && <p className="text-sm text-red-500">{createError}</p>}
                </div>
              )}

              {/* 시작 버튼 */}
              <button
                onClick={handleStartGame}
                disabled={isCreatingRoom || (playMode === 'online' && !globalNickname.trim())}
                className={`w-full py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isCreatingRoom || (playMode === 'online' && !globalNickname.trim())
                    ? 'bg-gray-400 cursor-not-allowed'
                    : playMode === 'online'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
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
          </div>
        )}
      </div>

      {/* 하단: 대기방 + 통계 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* 대기방 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">{allWaitingRooms.length}</span>
              <span className="font-semibold text-sm">{t('waitingRooms')}</span>
            </div>
            <button onClick={handleRefreshAll} className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3">
            {allWaitingRooms.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noWaitingRooms')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {allWaitingRooms.map(room => {
                  const gameInfo = BOARD_GAMES.find(g => hrefToGameId(g.href) === room.gameType)
                  const gameName = gameInfo ? getGameName(gameInfo) : room.gameType
                  const displayTitle = room.room_title || `${room.host_name}의 ${gameName} 방`
                  return (
                    <div key={room.id} className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-300 transition-all flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${gameInfo ? getGameColor(gameInfo, 0) : 'bg-gray-400'} rounded-lg flex items-center justify-center text-base flex-shrink-0`}>
                        {gameInfo?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{displayTitle}</p>
                        <p className="text-xs text-gray-400 truncate">{room.host_name} · {gameName}</p>
                      </div>
                      <button
                        onClick={() => handleOpenJoinModal(room.gameType as GameType, room)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                      >
                        {t('joinRoom')}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 나의 전적 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-violet-600" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{t('myStats') || '나의 전적'}</span>
          </div>
          <div className="p-3">
            {isLoadingAIStats ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
            ) : myTotalGames > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                    <p className="text-xl font-bold text-green-600">{myTotalWins}</p>
                    <p className="text-xs text-gray-500">{t('wins')}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                    <p className="text-xl font-bold text-red-600">{myTotalLosses}</p>
                    <p className="text-xs text-gray-500">{t('losses')}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{myTotalGames}</p>
                    <p className="text-xs text-gray-500">{t('totalGames')}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{t('winRate') || '승률'}</span>
                    <span className={`text-sm font-bold ${winRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>{winRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${winRate}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {myStats.filter(s => s.totalGames > 0).map(stat => {
                    const game = BOARD_GAMES.find(g => hrefToGameId(g.href) === stat.game_type)
                    const gameWinRate = stat.totalGames > 0 ? Math.round((stat.totalWins / stat.totalGames) * 100) : 0
                    return (
                      <div key={stat.game_type} className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <span className="text-base">{game?.icon}</span>
                        <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{game ? getGameName(game) : stat.game_type}</span>
                        <span className="text-xs text-green-600">{stat.totalWins}W</span>
                        <span className="text-xs text-gray-400">-</span>
                        <span className="text-xs text-red-500">{stat.easy.losses + stat.normal.losses + stat.hard.losses}L</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${gameWinRate >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{gameWinRate}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">{t('noAiGames')}</p>
              </div>
            )}
          </div>
        </div>

        {/* 전체 통계 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{t('globalStats') || '전체 통계'}</span>
          </div>
          <div className="p-3">
            {isLoadingAIStats ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
            ) : globalStats && (globalStats.totalGames > 0 || globalStats.totalRoomsCreated > 0) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                    <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{globalStats.totalGames.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('totalGamesPlayed') || '총 게임'}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center">
                    <Monitor className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{globalStats.totalAIGames.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('aiGames') || 'AI 대전'}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                    <Users className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{globalStats.totalOnlineGames.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('onlineGames') || '온라인'}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                    <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{globalStats.uniquePlayers.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('uniquePlayers') || '참여자'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('gamePopularity') || '인기 게임'}</p>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {BOARD_GAMES.map(game => ({
                      game,
                      games: globalStats.byGameType[hrefToGameId(game.href)]?.games || 0,
                      aiGames: globalStats.byGameType[hrefToGameId(game.href)]?.aiGames || 0,
                      onlineGames: globalStats.byGameType[hrefToGameId(game.href)]?.onlineGames || 0,
                    }))
                      .sort((a, b) => b.games - a.games)
                      .map((item, index) => {
                        const maxGames = Math.max(...Object.values(globalStats.byGameType).map(s => s.games), 1)
                        const pct = maxGames > 0 ? (item.games / maxGames) * 100 : 0
                        return (
                          <div key={item.game.href} className="flex items-center gap-2">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                            }`}>{index + 1}</span>
                            <span className="text-sm flex-shrink-0">{item.game.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{getGameName(item.game)}</span>
                                <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                                  <span className="text-indigo-500">{item.aiGames}</span>/<span className="text-emerald-500">{item.onlineGames}</span>
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                                <div className="h-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">{t('noGlobalStats') || '통계 데이터 없음'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 업적 패널 */}
      <GameAchievements
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
        compact
      />

      {/* 방 입장 모달 */}
      {joiningRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
          onKeyDown={(e) => e.key === 'Escape' && handleCloseJoinModal()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white flex items-center gap-4">
              <div className="text-3xl">{BOARD_GAMES.find(g => hrefToGameId(g.href) === joiningRoom.gameType)?.icon}</div>
              <div>
                <h3 id="join-modal-title" className="text-lg font-bold">{t('joinRoom')}</h3>
                {joiningRoom.room_title && <p className="text-white/90 text-sm">{joiningRoom.room_title}</p>}
                <p className="text-blue-200 text-xs">
                  {BOARD_GAMES.find(g => hrefToGameId(g.href) === joiningRoom.gameType)
                    ? getGameName(BOARD_GAMES.find(g => hrefToGameId(g.href) === joiningRoom.gameType)!)
                    : joiningRoom.gameType}
                  {' '}- {joiningRoom.host_name}
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <User className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">{t('myNickname') || '내 닉네임'}</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{globalNickname}</p>
                </div>
              </div>
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseJoinModal}
                  disabled={isJoining}
                  className="flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 text-sm"
                >
                  {t('cancel') || '취소'}
                </button>
                <button
                  onClick={handleConfirmJoin}
                  disabled={isJoining || !globalNickname}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isJoining
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{t('joining') || '입장 중...'}</>
                    : <><Play className="w-4 h-4" />{t('joinRoom')}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
