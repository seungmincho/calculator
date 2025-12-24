'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Users, Plus, RefreshCw, Clock, AlertCircle, Play, Globe, Lock, Gamepad2, BarChart3, Calendar } from 'lucide-react'
import { GameRoom, RoomStats, MonthlyStats } from '@/utils/webrtc'

interface GameLobbyProps {
  rooms: GameRoom[]
  stats: RoomStats
  monthlyStats: MonthlyStats[]
  isLoading: boolean
  error: string | null
  isConfigured: boolean
  onCreateRoom: (hostName: string, isPrivate: boolean) => Promise<GameRoom | null>
  onJoinRoom: (room: GameRoom) => void
  onRefresh: () => void
  gameTitle: string
  gameDescription?: string
}

export default function GameLobby({
  rooms,
  stats,
  monthlyStats,
  isLoading,
  error,
  isConfigured,
  onCreateRoom,
  onJoinRoom,
  onRefresh,
  gameTitle,
  gameDescription
}: GameLobbyProps) {
  const t = useTranslations('gameLobby')
  const tOmok = useTranslations('omok')
  const [hostName, setHostName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // 대기 중인 방만 표시
  const waitingRooms = rooms.filter((room) => room.status === 'waiting')

  const handleCreateRoom = async () => {
    if (!hostName.trim()) return

    setIsCreating(true)
    const room = await onCreateRoom(hostName.trim(), isPrivate)
    setIsCreating(false)

    if (room) {
      setHostName('')
      setIsPrivate(false)
      setShowCreateForm(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return t('timeJustNow')
    if (diff < 3600) return t('timeMinutesAgo', { minutes: Math.floor(diff / 60) })
    return t('timeHoursAgo', { hours: Math.floor(diff / 3600) })
  }

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
            {t('configurationRequired')}
          </h2>
          <p className="text-yellow-600 dark:text-yellow-400">
            {t('configurationDescription')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {gameTitle}
        </h1>
        {gameDescription && (
          <p className="text-gray-600 dark:text-gray-400">{gameDescription}</p>
        )}
      </div>

      {/* 실시간 통계 */}
      {stats.total > 0 && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">{tOmok('playing') || 'Playing'}:</span>
              <span className="font-bold text-green-600 dark:text-green-400">{stats.playing}</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">{tOmok('public') || 'Public'}:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{stats.public}</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">{tOmok('private') || 'Private'}:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{stats.private}</span>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 방 만들기 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" />
            {t('createRoom')}
          </button>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('createNewRoom')}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('yourName')}
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder={t('enterYourName')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateRoom()
                }}
              />
            </div>

            {/* 공개/비공개 설정 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {tOmok('roomVisibility')}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    !isPrivate
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">{tOmok('public')}</p>
                    <p className="text-xs opacity-70">{tOmok('publicDesc')}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    isPrivate
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">{tOmok('private')}</p>
                    <p className="text-xs opacity-70">{tOmok('privateDesc')}</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={!hostName.trim() || isCreating}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
              >
                {isCreating ? t('creating') : t('create')}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setHostName('')
                  setIsPrivate(false)
                }}
                className="py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 대기 중인 방 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            {t('availableRooms')}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({waitingRooms.length})
            </span>
          </h3>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading && rooms.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            {t('loading')}
          </div>
        ) : waitingRooms.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{t('noRooms')}</p>
            <p className="text-sm mt-1">{t('createFirstRoom')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onJoinRoom(room)}
                className="w-full flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    {room.host_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                      {room.host_name}{t('roomSuffix')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(room.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4" />
                  {t('join')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 월별 통계 */}
      {monthlyStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            {t('monthlyStats')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {monthlyStats.map((stat) => {
              const [year, month] = stat.month.split('-')
              return (
                <div
                  key={stat.month}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Calendar className="w-3 h-3" />
                    {year}.{month}
                  </div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stat.totalGames}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('gamesPlayed')}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    ({stat.totalRooms} {t('rooms')})
                  </div>
                </div>
              )
            })}
          </div>
          {/* 총계 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-8">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('totalGames')}</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {monthlyStats.reduce((sum, s) => sum + s.totalGames, 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('totalRooms')}</div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {monthlyStats.reduce((sum, s) => sum + s.totalRooms, 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
