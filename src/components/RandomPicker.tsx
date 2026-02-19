'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Dice1, Shuffle, Users, RotateCcw } from 'lucide-react'

type Mode = 'number' | 'list' | 'team'

interface NumberResult {
  numbers: number[]
  timestamp: number
}

interface ListResult {
  items: string[]
  timestamp: number
}

interface Team {
  name: string
  members: string[]
  color: string
}

const teamColors = [
  'from-red-500 to-orange-500',
  'from-blue-500 to-indigo-500',
  'from-green-500 to-emerald-500',
  'from-purple-500 to-pink-500',
  'from-yellow-500 to-amber-500',
  'from-cyan-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500',
]

export default function RandomPicker() {
  const t = useTranslations('randomPicker')
  const [mode, setMode] = useState<Mode>('number')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Number mode state
  const [minNumber, setMinNumber] = useState('1')
  const [maxNumber, setMaxNumber] = useState('100')
  const [numberCount, setNumberCount] = useState('1')
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [numberResult, setNumberResult] = useState<NumberResult | null>(null)
  const [isShufflingNumbers, setIsShufflingNumbers] = useState(false)

  // List mode state
  const [listInput, setListInput] = useState('')
  const [listCount, setListCount] = useState('1')
  const [listResult, setListResult] = useState<ListResult | null>(null)
  const [isShufflingList, setIsShufflingList] = useState(false)

  // Team mode state
  const [teamInput, setTeamInput] = useState('')
  const [teamCount, setTeamCount] = useState('2')
  const [teams, setTeams] = useState<Team[]>([])
  const [isShufflingTeams, setIsShufflingTeams] = useState(false)

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const pickRandomNumbers = useCallback(() => {
    const min = parseInt(minNumber)
    const max = parseInt(maxNumber)
    const count = parseInt(numberCount)

    if (isNaN(min) || isNaN(max) || isNaN(count)) return
    if (min > max) return
    if (count < 1) return
    if (!allowDuplicates && count > (max - min + 1)) return

    setIsShufflingNumbers(true)

    setTimeout(() => {
      const result: number[] = []
      const available = Array.from({ length: max - min + 1 }, (_, i) => min + i)

      for (let i = 0; i < count; i++) {
        if (allowDuplicates) {
          result.push(Math.floor(Math.random() * (max - min + 1)) + min)
        } else {
          const randomIndex = Math.floor(Math.random() * available.length)
          result.push(available[randomIndex])
          available.splice(randomIndex, 1)
        }
      }

      setNumberResult({ numbers: result.sort((a, b) => a - b), timestamp: Date.now() })
      setIsShufflingNumbers(false)
    }, 500)
  }, [minNumber, maxNumber, numberCount, allowDuplicates])

  const pickRandomItems = useCallback(() => {
    const items = listInput.split('\n').filter(item => item.trim() !== '')
    const count = parseInt(listCount)

    if (items.length === 0 || isNaN(count) || count < 1 || count > items.length) return

    setIsShufflingList(true)

    setTimeout(() => {
      const shuffled = shuffleArray(items)
      const selected = shuffled.slice(0, count)
      setListResult({ items: selected, timestamp: Date.now() })
      setIsShufflingList(false)
    }, 500)
  }, [listInput, listCount])

  const divideIntoTeams = useCallback(() => {
    const participants = teamInput.split('\n').filter(p => p.trim() !== '')
    const count = parseInt(teamCount)

    if (participants.length === 0 || isNaN(count) || count < 2 || count > participants.length) return

    setIsShufflingTeams(true)

    setTimeout(() => {
      const shuffled = shuffleArray(participants)
      const newTeams: Team[] = []
      const membersPerTeam = Math.floor(shuffled.length / count)
      const remainder = shuffled.length % count

      let currentIndex = 0
      for (let i = 0; i < count; i++) {
        const teamSize = membersPerTeam + (i < remainder ? 1 : 0)
        const members = shuffled.slice(currentIndex, currentIndex + teamSize)
        newTeams.push({
          name: `${t('team.teamLabel')} ${i + 1}`,
          members,
          color: teamColors[i % teamColors.length]
        })
        currentIndex += teamSize
      }

      setTeams(newTeams)
      setIsShufflingTeams(false)
    }, 500)
  }, [teamInput, teamCount, t])

  const handleReset = useCallback(() => {
    if (mode === 'number') {
      setMinNumber('1')
      setMaxNumber('100')
      setNumberCount('1')
      setAllowDuplicates(false)
      setNumberResult(null)
    } else if (mode === 'list') {
      setListInput('')
      setListCount('1')
      setListResult(null)
    } else if (mode === 'team') {
      setTeamInput('')
      setTeamCount('2')
      setTeams([])
    }
  }, [mode])

  const modeIcons: Record<Mode, React.ReactNode> = {
    number: <Dice1 className="w-4 h-4" />,
    list: <Shuffle className="w-4 h-4" />,
    team: <Users className="w-4 h-4" />,
  }

  const modes: Mode[] = ['number', 'list', 'team']

  const canPickNumbers = () => {
    const min = parseInt(minNumber)
    const max = parseInt(maxNumber)
    const count = parseInt(numberCount)
    if (isNaN(min) || isNaN(max) || isNaN(count)) return false
    if (min > max) return false
    if (count < 1) return false
    if (!allowDuplicates && count > (max - min + 1)) return false
    return true
  }

  const canPickList = () => {
    const items = listInput.split('\n').filter(item => item.trim() !== '')
    const count = parseInt(listCount)
    if (items.length === 0 || isNaN(count) || count < 1 || count > items.length) return false
    return true
  }

  const canDivideTeams = () => {
    const participants = teamInput.split('\n').filter(p => p.trim() !== '')
    const count = parseInt(teamCount)
    if (participants.length === 0 || isNaN(count) || count < 2 || count > participants.length) return false
    return true
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 모드 탭 */}
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              mode === m
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {modeIcons[m]}
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t(`${mode}.title`)}
            </h2>

            {/* Number mode */}
            {mode === 'number' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('number.min')}
                    </label>
                    <input
                      type="number"
                      value={minNumber}
                      onChange={(e) => setMinNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('number.max')}
                    </label>
                    <input
                      type="number"
                      value={maxNumber}
                      onChange={(e) => setMaxNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('number.count')}
                  </label>
                  <input
                    type="number"
                    value={numberCount}
                    onChange={(e) => setNumberCount(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allow-duplicates"
                    checked={allowDuplicates}
                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 accent-blue-600"
                  />
                  <label htmlFor="allow-duplicates" className="text-sm text-gray-700 dark:text-gray-300">
                    {t('number.allowDuplicates')}
                  </label>
                </div>
              </div>
            )}

            {/* List mode */}
            {mode === 'list' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('list.inputLabel')}
                  </label>
                  <textarea
                    value={listInput}
                    onChange={(e) => setListInput(e.target.value)}
                    placeholder={t('list.placeholder')}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {listInput.split('\n').filter(item => item.trim() !== '').length}개 항목
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('list.count')}
                  </label>
                  <input
                    type="number"
                    value={listCount}
                    onChange={(e) => setListCount(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Team mode */}
            {mode === 'team' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('team.inputLabel')}
                  </label>
                  <textarea
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value)}
                    placeholder={t('team.placeholder')}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {teamInput.split('\n').filter(p => p.trim() !== '').length}명
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('team.teamCount')}
                  </label>
                  <input
                    type="number"
                    value={teamCount}
                    onChange={(e) => setTeamCount(e.target.value)}
                    min="2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={mode === 'number' ? pickRandomNumbers : mode === 'list' ? pickRandomItems : divideIntoTeams}
                disabled={mode === 'number' ? !canPickNumbers() : mode === 'list' ? !canPickList() : !canDivideTeams()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                {mode === 'number' ? <Dice1 className="w-4 h-4" /> : mode === 'list' ? <Shuffle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {mode === 'number' ? t('number.generate') : mode === 'list' ? t('list.pick') : t('team.divide')}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                title={t('common.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('common.result')}</h2>

            {/* Number mode result */}
            {mode === 'number' && (
              <div>
                {numberResult ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t('number.result')}
                      </p>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {numberResult.numbers.map((num, i) => (
                          <div
                            key={`${num}-${i}`}
                            className={`flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl shadow-lg ${
                              isShufflingNumbers ? 'animate-pulse' : 'animate-[scale-up_0.3s_ease-out]'
                            }`}
                            style={{ animationDelay: `${i * 50}ms` }}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => copyToClipboard(numberResult.numbers.join(', '), 'number')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {copiedId === 'number' ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            {t('common.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            {t('common.copy')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={<Dice1 className="w-16 h-16 text-gray-300 dark:text-gray-600" />} text="설정 후 뽑기 버튼을 눌러주세요" />
                )}
              </div>
            )}

            {/* List mode result */}
            {mode === 'list' && (
              <div>
                {listResult ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t('list.result')}
                      </p>
                      <div className="space-y-3 mb-4">
                        {listResult.items.map((item, i) => (
                          <div
                            key={`${item}-${i}`}
                            className={`bg-white dark:bg-gray-700 rounded-lg p-4 shadow-md ${
                              isShufflingList ? 'animate-pulse' : 'animate-[scale-up_0.3s_ease-out]'
                            }`}
                            style={{ animationDelay: `${i * 100}ms` }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-sm">
                                {i + 1}
                              </div>
                              <p className="text-lg font-medium text-gray-900 dark:text-white">{item}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => copyToClipboard(listResult.items.join('\n'), 'list')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {copiedId === 'list' ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            {t('common.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            {t('common.copy')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={<Shuffle className="w-16 h-16 text-gray-300 dark:text-gray-600" />} text="항목 입력 후 뽑기 버튼을 눌러주세요" />
                )}
              </div>
            )}

            {/* Team mode result */}
            {mode === 'team' && (
              <div>
                {teams.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {teams.map((team, i) => (
                        <div
                          key={`${team.name}-${i}`}
                          className={`bg-white dark:bg-gray-700 rounded-xl p-5 shadow-lg border-2 border-transparent ${
                            isShufflingTeams ? 'animate-pulse' : 'animate-[scale-up_0.3s_ease-out]'
                          }`}
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${team.color} text-white font-semibold text-sm mb-3`}>
                            <Users className="w-4 h-4" />
                            {team.name}
                          </div>
                          <ul className="space-y-2">
                            {team.members.map((member, j) => (
                              <li key={`${member}-${j}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                                  {j + 1}
                                </span>
                                <span>{member}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const text = teams.map((team, i) => `${team.name}:\n${team.members.map((m, j) => `  ${j + 1}. ${m}`).join('\n')}`).join('\n\n')
                        copyToClipboard(text, 'team')
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 hover:from-blue-200 hover:to-indigo-200 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      {copiedId === 'team' ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t('common.copy')}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <EmptyState icon={<Users className="w-16 h-16 text-gray-300 dark:text-gray-600" />} text="참가자 입력 후 나누기 버튼을 눌러주세요" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['number', 'list', 'team'] as const).map((section) => (
            <div key={section} className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                {modeIcons[section]}
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-3">{icon}</div>
      <p className="text-gray-400 dark:text-gray-500 text-sm">{text}</p>
    </div>
  )
}
