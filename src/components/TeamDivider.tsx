'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Users, Shuffle, Plus, Trash2 } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

const TEAM_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
const TEAM_BG = [
  'bg-red-50 dark:bg-red-950',
  'bg-blue-50 dark:bg-blue-950',
  'bg-green-50 dark:bg-green-950',
  'bg-amber-50 dark:bg-amber-950',
  'bg-violet-50 dark:bg-violet-950',
  'bg-pink-50 dark:bg-pink-950',
  'bg-teal-50 dark:bg-teal-950',
  'bg-orange-50 dark:bg-orange-950',
]

type Mode = 'random' | 'balanced' | 'captain'

interface Preset {
  key: string
  names: string[]
}

export default function TeamDivider() {
  const t = useTranslations('teamDivider')

  const presets: Preset[] = [
    { key: 'sports', names: (t.raw('presets.sports.names') as string[]) },
    { key: 'study', names: (t.raw('presets.study.names') as string[]) },
    { key: 'company', names: (t.raw('presets.company.names') as string[]) },
    { key: 'game', names: (t.raw('presets.game.names') as string[]) },
  ]

  const [names, setNames] = useState<string[]>(['참가자 1', '참가자 2', '참가자 3', '참가자 4', '참가자 5', '참가자 6'])
  const [newName, setNewName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [teamCount, setTeamCount] = useState(2)
  const [mode, setMode] = useState<Mode>('random')
  const [teams, setTeams] = useState<string[][]>([])
  const [isDividing, setIsDividing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [draftPool, setDraftPool] = useState<string[]>([])
  const [currentCaptainTeam, setCurrentCaptainTeam] = useState(0)
  const [isDrafting, setIsDrafting] = useState(false)

  const validNames = names.filter(n => n.trim())

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const assignTeams = useCallback((pool: string[], count: number): string[][] => {
    const shuffled = shuffle(pool)
    const result: string[][] = Array.from({ length: count }, () => [])
    shuffled.forEach((name, i) => result[i % count].push(name))
    return result
  }, [])

  const handleDivide = useCallback(async () => {
    if (validNames.length < teamCount) return
    if (mode === 'captain') {
      const captains = validNames.slice(0, teamCount)
      const pool = shuffle(validNames.slice(teamCount))
      const initial: string[][] = captains.map(c => [c])
      setTeams(initial)
      setDraftPool(pool)
      setCurrentCaptainTeam(0)
      setIsDrafting(pool.length > 0)
      if (pool.length === 0) setIsDrafting(false)
      return
    }
    setIsDividing(true)
    await new Promise(r => setTimeout(r, 400))
    setTeams(assignTeams(validNames, teamCount))
    setIsDividing(false)
    setIsDrafting(false)
  }, [validNames, teamCount, mode, assignTeams])

  const handleDraftPick = useCallback((name: string) => {
    const next = teams.map((team, i) => i === currentCaptainTeam ? [...team, name] : team)
    const nextPool = draftPool.filter(n => n !== name)
    setTeams(next)
    setDraftPool(nextPool)
    const nextCaptain = (currentCaptainTeam + 1) % teamCount
    setCurrentCaptainTeam(nextCaptain)
    if (nextPool.length === 0) setIsDrafting(false)
  }, [teams, draftPool, currentCaptainTeam, teamCount])

  const handleAddName = () => {
    const trimmed = newName.trim()
    if (trimmed && !names.includes(trimmed)) {
      setNames(prev => [...prev, trimmed])
    }
    setNewName('')
  }

  const handleBulkImport = () => {
    const parsed = bulkText.split(/[\n,]/).map(n => n.trim()).filter(Boolean)
    if (parsed.length > 0) setNames(parsed)
    setBulkText('')
    setShowBulk(false)
  }

  const handlePreset = (preset: Preset) => {
    setNames(preset.names)
    setTeams([])
    setIsDrafting(false)
  }

  const copyResult = useCallback(async () => {
    if (!teams.length) return
    const text = teams.map((team, i) =>
      `${t('teamLabel')} ${i + 1} (${team.length}${t('memberUnit')})\n${team.join(', ')}`
    ).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-999999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [teams, t])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('presets.label')}</p>
            <div className="flex flex-wrap gap-2">
              {presets.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => handlePreset(preset)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {t(`presets.${preset.key}.label`)}
                </button>
              ))}
            </div>
          </div>

          {/* Participant list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Users className="inline w-4 h-4 mr-1" />
                {t('participants')} ({validNames.length})
              </p>
              <button
                onClick={() => setShowBulk(!showBulk)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('bulkInput')}
              </button>
            </div>

            {showBulk && (
              <div className="space-y-2">
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={t('bulkPlaceholder')}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleBulkImport}
                  className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('import')}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddName()}
                placeholder={t('addPlaceholder')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleAddName}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {names.map((name, i) => (
                <li key={i} className="flex items-center justify-between px-2 py-1 rounded bg-gray-50 dark:bg-gray-700">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{name}</span>
                  <button
                    onClick={() => setNames(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('teamCount')}</p>
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => setTeamCount(n)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      teamCount === n
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('mode.label')}</p>
              <div className="space-y-1.5">
                {(['random', 'balanced', 'captain'] as Mode[]).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={mode === m}
                      onChange={() => setMode(m)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t(`mode.${m}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleDivide}
              disabled={isDividing || validNames.length < teamCount}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              <Shuffle className={`w-4 h-4 ${isDividing ? 'animate-spin' : ''}`} />
              {isDividing ? t('dividing') : t('divide')}
            </button>

            {validNames.length < teamCount && (
              <p className="text-xs text-red-500 dark:text-red-400 text-center">
                {t('notEnough')}
              </p>
            )}
          </div>
        </div>

        {/* Right panel — results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Captain draft pool */}
          {isDrafting && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('draftTurn', { team: currentCaptainTeam + 1 })}
              </p>
              <div className="flex flex-wrap gap-2">
                {draftPool.map(name => (
                  <button
                    key={name}
                    onClick={() => handleDraftPick(name)}
                    className="px-3 py-1.5 text-sm rounded-lg border-2 border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors font-medium"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {teams.length > 0 ? (
            <>
              <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-300 ${isDividing ? 'opacity-30' : 'opacity-100'}`}>
                {teams.map((team, i) => (
                  <div
                    key={i}
                    className={`rounded-xl shadow overflow-hidden ${TEAM_BG[i % TEAM_BG.length]}`}
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }}
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {t('teamLabel')} {i + 1}
                        </p>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }}
                        >
                          {team.length}{t('memberUnit')}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {team.map((member, j) => (
                          <li key={j} className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            {j === 0 && mode === 'captain' && (
                              <span className="text-yellow-500 text-xs">★</span>
                            )}
                            {member}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDivide}
                  disabled={isDividing}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                  {t('redivide')}
                </button>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('copied') : t('copy')}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('empty')}</p>
            </div>
          )}
        </div>
      </div>

      <GuideSection namespace="teamDivider" />
    </div>
  )
}
