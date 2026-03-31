'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Trophy, Users, Swords } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

type Hand = 'rock' | 'paper' | 'scissors'
type GameMode = '1v1' | 'bestof' | 'tournament'
type RoundResult = { player: Hand; cpu: Hand; result: 'win' | 'lose' | 'draw' }

const HANDS: Hand[] = ['rock', 'paper', 'scissors']
const EMOJIS: Record<Hand, string> = { rock: '✊', paper: '🖐️', scissors: '✌️' }

function getWinner(a: Hand, b: Hand): 'win' | 'lose' | 'draw' {
  if (a === b) return 'draw'
  if ((a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock')) return 'win'
  return 'lose'
}

const glassCard = 'bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[inset_2px_2px_10px_rgba(255,255,255,0.15),inset_-2px_-2px_10px_rgba(255,255,255,0.05)] p-6'
const glassBtn = 'bg-white/20 dark:bg-white/5 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-[0_0_15px_rgba(167,139,250,0.4)] hover:border-violet-300/50 active:scale-95'

interface TournamentPlayer { name: string; id: number }
interface Match { p1: TournamentPlayer; p2: TournamentPlayer; winner?: TournamentPlayer }

export default function RockPaperScissors() {
  const t = useTranslations('rockPaperScissors')

  const [mode, setMode] = useState<GameMode>('1v1')

  // 1v1 state
  const [playerChoice, setPlayerChoice] = useState<Hand | null>(null)
  const [cpuChoice, setCpuChoice] = useState<Hand | null>(null)
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [history, setHistory] = useState<RoundResult[]>([])
  const [stats, setStats] = useState({ win: 0, lose: 0, draw: 0 })

  // Best-of state
  const [bestOfN, setBestOfN] = useState(3)
  const [boPlayerWins, setBoPlayerWins] = useState(0)
  const [boCpuWins, setBoCpuWins] = useState(0)
  const [boRound, setBoRound] = useState(1)
  const [boOver, setBoOver] = useState(false)
  const [boWinner, setBoWinner] = useState<'player' | 'cpu' | null>(null)

  // Tournament state
  const [players, setPlayers] = useState<TournamentPlayer[]>([
    { name: 'Player 1', id: 1 }, { name: 'Player 2', id: 2 },
    { name: 'Player 3', id: 3 }, { name: 'Player 4', id: 4 },
  ])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [bracket, setBracket] = useState<Match[][]>([])
  const [tournamentRound, setTournamentRound] = useState(0)
  const [tournamentWinner, setTournamentWinner] = useState<TournamentPlayer | null>(null)

  const playRound = useCallback((choice: Hand) => {
    if (isShaking) return
    setIsShaking(true)
    setPlayerChoice(choice)
    setCpuChoice(null)
    setRoundResult(null)

    setTimeout(() => {
      const cpu = HANDS[Math.floor(Math.random() * 3)]
      const res = getWinner(choice, cpu)
      setCpuChoice(cpu)
      setRoundResult(res)
      setIsShaking(false)
      setHistory(prev => [{ player: choice, cpu, result: res }, ...prev].slice(0, 10))
      setStats(prev => ({ ...prev, [res]: prev[res] + 1 }))
    }, 700)
  }, [isShaking])

  const playBestOf = useCallback((choice: Hand) => {
    if (isShaking || boOver) return
    setIsShaking(true)
    setPlayerChoice(choice)
    setCpuChoice(null)
    setRoundResult(null)

    setTimeout(() => {
      const cpu = HANDS[Math.floor(Math.random() * 3)]
      const res = getWinner(choice, cpu)
      setCpuChoice(cpu)
      setRoundResult(res)
      setIsShaking(false)

      const target = Math.ceil(bestOfN / 2)
      const newPlayerWins = boPlayerWins + (res === 'win' ? 1 : 0)
      const newCpuWins = boCpuWins + (res === 'lose' ? 1 : 0)
      setBoPlayerWins(newPlayerWins)
      setBoCpuWins(newCpuWins)
      setBoRound(r => r + 1)

      if (newPlayerWins >= target) { setBoOver(true); setBoWinner('player') }
      else if (newCpuWins >= target) { setBoOver(true); setBoWinner('cpu') }
    }, 700)
  }, [isShaking, boOver, bestOfN, boPlayerWins, boCpuWins])

  const resetBestOf = useCallback(() => {
    setBoPlayerWins(0); setBoCpuWins(0); setBoRound(1)
    setBoOver(false); setBoWinner(null)
    setPlayerChoice(null); setCpuChoice(null); setRoundResult(null)
  }, [])

  const reset1v1 = useCallback(() => {
    setPlayerChoice(null); setCpuChoice(null); setRoundResult(null)
    setHistory([]); setStats({ win: 0, lose: 0, draw: 0 })
  }, [])

  const addPlayer = useCallback(() => {
    const name = newPlayerName.trim() || `Player ${players.length + 1}`
    if (players.length >= 8) return
    setPlayers(prev => [...prev, { name, id: Date.now() }])
    setNewPlayerName('')
  }, [newPlayerName, players.length])

  const removePlayer = useCallback((id: number) => {
    setPlayers(prev => prev.filter(p => p.id !== id))
  }, [])

  const startTournament = useCallback(() => {
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const matches: Match[] = []
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({ p1: shuffled[i], p2: shuffled[i + 1] })
    }
    setBracket([matches])
    setTournamentRound(0)
    setTournamentWinner(null)
  }, [players])

  const playTournamentMatch = useCallback((matchIdx: number) => {
    setBracket(prev => {
      const next = prev.map(r => [...r])
      const match = { ...next[tournamentRound][matchIdx] }
      const winner = Math.random() < 0.5 ? match.p1 : match.p2
      match.winner = winner
      next[tournamentRound][matchIdx] = match

      const roundMatches = next[tournamentRound]
      const allDone = roundMatches.every(m => m.winner)
      if (allDone) {
        const winners = roundMatches.map(m => m.winner!)
        if (winners.length === 1) {
          setTournamentWinner(winners[0])
        } else {
          const nextMatches: Match[] = []
          for (let i = 0; i < winners.length - 1; i += 2) {
            nextMatches.push({ p1: winners[i], p2: winners[i + 1] })
          }
          next.push(nextMatches)
          setTournamentRound(r => r + 1)
        }
      }
      return next
    })
  }, [tournamentRound])

  const totalGames = stats.win + stats.lose + stats.draw
  const winRate = totalGames > 0 ? Math.round((stats.win / totalGames) * 100) : 0

  const MODES: { key: GameMode; label: string; icon: React.ReactNode }[] = [
    { key: '1v1', label: t('mode1v1'), icon: <Swords className="w-4 h-4" /> },
    { key: 'bestof', label: t('modeBestOf'), icon: <Trophy className="w-4 h-4" /> },
    { key: 'tournament', label: t('modeTournament'), icon: <Users className="w-4 h-4" /> },
  ]

  const resultColor = roundResult === 'win' ? 'text-green-400' : roundResult === 'lose' ? 'text-red-400' : 'text-yellow-400'
  const resultText = roundResult ? t(roundResult) : ''

  return (
    <div className="relative min-h-[600px]">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 dark:from-violet-900/30 dark:via-purple-900/20 dark:to-fuchsia-900/30 rounded-3xl" />
      <div className="relative z-10 p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 flex-wrap justify-center">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${mode === m.key
                ? 'bg-violet-500/30 border-violet-400/50 text-violet-200 shadow-[0_0_15px_rgba(167,139,250,0.3)]'
                : 'bg-white/10 border-white/20 text-gray-700 dark:text-gray-300 hover:bg-white/20'}`}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        {/* 1v1 Mode */}
        {mode === '1v1' && (
          <div className="space-y-4">
            <div className={glassCard}>
              {/* Arena */}
              <div className="flex items-center justify-around mb-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('yourChoice')}</p>
                  <div className={`text-6xl transition-all duration-300 ${isShaking ? 'animate-bounce' : ''}`}>
                    {playerChoice ? EMOJIS[playerChoice] : '❓'}
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-400">VS</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('cpuChoice')}</p>
                  <div className={`text-6xl transition-all duration-300 ${isShaking ? 'animate-bounce' : ''}`}>
                    {isShaking ? '🤔' : cpuChoice ? EMOJIS[cpuChoice] : '❓'}
                  </div>
                </div>
              </div>

              {roundResult && (
                <div className={`text-center text-2xl font-bold mb-4 ${resultColor}`}>
                  {resultText}
                </div>
              )}

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">{t('chooseYourHand')}</p>
              <div className="flex gap-3 justify-center">
                {HANDS.map(h => (
                  <button key={h} onClick={() => playRound(h)} disabled={isShaking}
                    className={`${glassBtn} text-3xl p-3 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={t(h)}>
                    {EMOJIS[h]}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('stats')}</h3>
                <button onClick={reset1v1} className={`${glassBtn} flex items-center gap-1 text-xs`}>
                  <RotateCcw className="w-3 h-3" />{t('reset')}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center mb-4">
                {(['win', 'lose', 'draw'] as const).map(k => (
                  <div key={k} className="bg-white/10 rounded-xl p-2">
                    <div className={`text-xl font-bold ${k === 'win' ? 'text-green-400' : k === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>{stats[k]}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t(k)}</div>
                  </div>
                ))}
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-xl font-bold text-violet-400">{winRate}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('winRate')}</div>
                </div>
              </div>
              {totalGames > 0 && (
                <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                  <div className="bg-green-400 h-full transition-all duration-500" style={{ width: `${(stats.win / totalGames) * 100}%` }} />
                  <div className="bg-yellow-400 h-full transition-all duration-500" style={{ width: `${(stats.draw / totalGames) * 100}%` }} />
                  <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${(stats.lose / totalGames) * 100}%` }} />
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className={glassCard}>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('history')}</h3>
                <div className="space-y-2">
                  {history.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                      <span>{EMOJIS[r.player]} {t(r.player)}</span>
                      <span className={`font-bold ${r.result === 'win' ? 'text-green-400' : r.result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>{t(r.result)}</span>
                      <span>{EMOJIS[r.cpu]} {t(r.cpu)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Best-of Mode */}
        {mode === 'bestof' && (
          <div className="space-y-4">
            {/* N picker */}
            <div className={glassCard}>
              <div className="flex items-center gap-3 flex-wrap justify-center mb-4">
                {[3, 5, 7].map(n => (
                  <button key={n} onClick={() => { setBestOfN(n); resetBestOf() }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${bestOfN === n
                      ? 'bg-violet-500/30 border-violet-400/50 text-violet-200' : 'bg-white/10 border-white/20 text-gray-700 dark:text-gray-300 hover:bg-white/20'}`}>
                    {t(`bestOf${n}` as 'bestOf3' | 'bestOf5' | 'bestOf7')}
                  </button>
                ))}
              </div>

              {/* Score */}
              <div className="flex items-center justify-around mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{boPlayerWins}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('vsComputer').split(' ')[0]}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('round')} {boRound}</div>
                  <div className="text-xs text-gray-400">/{bestOfN}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">{boCpuWins}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">CPU</div>
                </div>
              </div>

              {boOver ? (
                <div className="text-center space-y-3">
                  <div className={`text-2xl font-bold ${boWinner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                    {boWinner === 'player' ? '🎉 ' : '😢 '}{t('winner')}: {boWinner === 'player' ? 'You' : 'CPU'}
                  </div>
                  <button onClick={resetBestOf} className={`${glassBtn} flex items-center gap-2 mx-auto`}>
                    <RotateCcw className="w-4 h-4" />{t('reset')}
                  </button>
                </div>
              ) : (
                <>
                  {roundResult && (
                    <div className={`text-center text-xl font-bold mb-3 ${resultColor}`}>
                      {playerChoice && EMOJIS[playerChoice]} {resultText} {cpuChoice && EMOJIS[cpuChoice]}
                    </div>
                  )}
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">{t('chooseYourHand')}</p>
                  <div className="flex gap-3 justify-center">
                    {HANDS.map(h => (
                      <button key={h} onClick={() => playBestOf(h)} disabled={isShaking}
                        className={`${glassBtn} text-3xl p-3 disabled:opacity-50`}>
                        {EMOJIS[h]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tournament Mode */}
        {mode === 'tournament' && (
          <div className="space-y-4">
            {bracket.length === 0 ? (
              <div className={glassCard}>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('players')}</h3>
                <div className="space-y-2 mb-4">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{p.name}</span>
                      {players.length > 2 && (
                        <button onClick={() => removePlayer(p.id)} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                {players.length < 8 && (
                  <div className="flex gap-2 mb-4">
                    <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addPlayer()}
                      placeholder={`Player ${players.length + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400/50" />
                    <button onClick={addPlayer} className={glassBtn}>{t('addPlayer')}</button>
                  </div>
                )}
                <button onClick={startTournament} disabled={players.length < 2}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500/40 to-fuchsia-500/40 border border-violet-400/30 text-white font-medium hover:from-violet-500/60 hover:to-fuchsia-500/60 transition-all disabled:opacity-50">
                  {t('startTournament')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tournamentWinner ? (
                  <div className={`${glassCard} text-center`}>
                    <div className="text-5xl mb-3">🏆</div>
                    <div className="text-2xl font-bold text-yellow-400">{tournamentWinner.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('winner')}</div>
                    <button onClick={() => { setBracket([]); setTournamentWinner(null); setTournamentRound(0) }}
                      className={`${glassBtn} flex items-center gap-2 mx-auto mt-4`}>
                      <RotateCcw className="w-4 h-4" />{t('reset')}
                    </button>
                  </div>
                ) : (
                  bracket.map((roundMatches, ri) => (
                    <div key={ri} className={glassCard}>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        {ri === bracket.length - 1 && bracket.length > 1 ? t('finals') : `${t('round')} ${ri + 1}`}
                      </h3>
                      <div className="space-y-2">
                        {roundMatches.map((m, mi) => (
                          <div key={mi} className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                            <span className={`flex-1 text-sm text-center ${m.winner?.id === m.p1.id ? 'text-green-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{m.p1.name}</span>
                            <span className="text-gray-400 text-xs">VS</span>
                            <span className={`flex-1 text-sm text-center ${m.winner?.id === m.p2.id ? 'text-green-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{m.p2.name}</span>
                            {ri === tournamentRound && !m.winner && (
                              <button onClick={() => playTournamentMatch(mi)} className={`${glassBtn} text-xs`}>{t('play')}</button>
                            )}
                            {m.winner && <span className="text-yellow-400 text-sm">🏆</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <GuideSection namespace="rockPaperScissors" />
      </div>
    </div>
  )
}
