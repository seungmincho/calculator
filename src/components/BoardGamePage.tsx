'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/boardGamePage'
import { Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type GameKey = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes'
type Difficulty = 'easy' | 'normal' | 'hard'
type Mode = 'select' | 'ai' | 'online'
type Result = 'win' | 'loss' | 'draw'

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

// Online game components (동적 로드)
const OnlineComponents = {
  omok:         dynamic(() => import('@/components/Omok'), { ssr: false }),
  othello:      dynamic(() => import('@/components/Othello'), { ssr: false }),
  connect4:     dynamic(() => import('@/components/Connect4'), { ssr: false }),
  checkers:     dynamic(() => import('@/components/Checkers'), { ssr: false }),
  mancala:      dynamic(() => import('@/components/Mancala'), { ssr: false }),
  battleship:   dynamic(() => import('@/components/Battleship'), { ssr: false }),
  dotsandboxes: dynamic(() => import('@/components/DotsAndBoxes'), { ssr: false }),
}

// AI game components (동적 로드)
const AIComponents = {
  omok:         dynamic(() => import('@/components/games/OmokAI'), { ssr: false }),
  othello:      dynamic(() => import('@/components/games/OthelloAI'), { ssr: false }),
  connect4:     dynamic(() => import('@/components/games/Connect4AI'), { ssr: false }),
  checkers:     dynamic(() => import('@/components/games/CheckersAI'), { ssr: false }),
  mancala:      dynamic(() => import('@/components/games/MancalaAI'), { ssr: false }),
  battleship:   dynamic(() => import('@/components/games/BattleshipAI'), { ssr: false }),
  dotsandboxes: dynamic(() => import('@/components/games/DotsAndBoxesAI'), { ssr: false }),
}

// 승/패/무: useAIGameStats.recordResult가 Supabase와 함께 항상 쓰는 로컬 사본(`${game}_${difficulty}`).
// ponytail: 훅을 셸에서 쓰면 첫 로드에 supabase-js와 쿼리 9개가 붙어서 로컬 사본만 읽음 (다른 기기 기록은 게임 화면 '나의 통계'에)
function readRecord(game: GameKey) {
  let w = 0, l = 0, d = 0
  try {
    const all = JSON.parse(localStorage.getItem('ai_game_stats_local') || '{}')
    for (const diff of DIFFICULTIES) {
      const s = all[`${game}_${diff}`]
      if (s) { w += s.wins || 0; l += s.losses || 0; d += s.draws || 0 }
    }
  } catch { /* 저장소 차단 → 기록 없음 */ }
  return { w, l, d }
}

// 게임별 마지막 난이도 + 연승. 연승은 이 페이지에서 끝난 판만 세고, 저장 당시 총 판수(total)와
// 지금 총 판수가 다르면(게임 센터 등에서 둔 판이 끼면) 순서를 모르므로 0으로 본다.
const PREF_KEY = 'board_game_page'
type Pref = { d?: Difficulty; streak?: number; total?: number }
function readPrefs(): Partial<Record<GameKey, Pref>> {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}
function savePref(game: GameKey, pref: Pref) {
  try {
    const all = readPrefs()
    all[game] = { ...all[game], ...pref }
    localStorage.setItem(PREF_KEY, JSON.stringify(all))
  } catch { /* 저장 실패는 무시 */ }
}

interface BoardGamePageProps {
  gameKey: GameKey
  name: string
  description?: string
  /** 첫 화면(서버 HTML)에 보이는 짧은 규칙 2~3줄 */
  rules?: string[]
}

export default function BoardGamePage({ gameKey, name, description, rules }: BoardGamePageProps) {
  const t = useTranslations('boardGamePage')
  const [mode, setMode] = useState<Mode>('select')
  // 첫 렌더는 서버 HTML과 같은 '보통' → 마운트 후 공유 링크(?d=) > 지난번 난이도 순으로 복원
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [record, setRecord] = useState<{ w: number; l: number; d: number; streak: number } | null>(null)

  const loadRecord = useCallback(() => {
    const r = readRecord(gameKey)
    const p = readPrefs()[gameKey] ?? {}
    setRecord({ ...r, streak: p.total === r.w + r.l + r.d ? p.streak ?? 0 : 0 })
  }, [gameKey])

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('d')
    const d = [fromUrl, readPrefs()[gameKey]?.d].find((v): v is Difficulty => DIFFICULTIES.includes(v as Difficulty))
    if (d) setDifficulty(d)
    loadRecord()
  }, [gameKey, loadRecord])

  const chooseDifficulty = (d: Difficulty) => {
    setDifficulty(d)
    savePref(gameKey, { d })
  }

  // 래퍼가 recordResult 직후 호출 → 로컬 사본에 이번 판이 이미 들어 있음
  const handleResult = useCallback((result: Result) => {
    const r = readRecord(gameKey)
    const total = r.w + r.l + r.d
    const prev = readPrefs()[gameKey] ?? {}
    const base = prev.total === total - 1 ? prev.streak ?? 0 : 0
    savePref(gameKey, { streak: result === 'win' ? base + 1 : 0, total })
  }, [gameKey])

  const handleBack = () => {
    setMode('select')
    loadRecord()
  }

  // AI 대전 화면 — key로 난이도가 바뀌면 새 판으로 다시 마운트
  if (mode === 'ai') {
    const AIComponent = AIComponents[gameKey]
    const next = DIFFICULTIES[DIFFICULTIES.indexOf(difficulty) + 1]
    return (
      <AIComponent
        key={difficulty}
        difficulty={difficulty}
        onBack={handleBack}
        onResult={handleResult}
        onLevelUp={next ? () => chooseDifficulty(next) : undefined}
        backLabel={t('backToModes')}
      />
    )
  }

  // 온라인 대전 화면
  if (mode === 'online') {
    const OnlineComponent = OnlineComponents[gameKey]
    return <OnlineComponent onBack={handleBack} />
  }

  const played = record ? record.w + record.l + record.d : 0

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">{name}</h1>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
        {record && played > 0 && (
          <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 rounded-full bg-subtle px-3 py-1.5 text-sm tabular-nums">
            <span className="text-muted">{t('myRecord')}</span>
            <span className="font-semibold text-fg">{t('recordSummary', { wins: record.w, losses: record.l, draws: record.d })}</span>
            {record.streak >= 2 && <span className="font-semibold text-primary">{t('winStreak', { count: record.streak })}</span>}
          </p>
        )}
      </div>

      {/* 컴퓨터 대전: 난이도가 미리 골라져 있어 '시작' 한 번이면 바로 플레이 */}
      <section className="ui-card p-5 space-y-4" aria-labelledby="board-game-ai">
        <div>
          <h2 id="board-game-ai" className="font-bold text-fg">{t('vsComputer')}</h2>
          <p className="text-xs text-muted mt-0.5">{t('vsComputerDesc')}</p>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-body mb-2">{t('difficulty')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map(v => (
              <label
                key={v}
                className={`flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                  difficulty === v ? 'bg-primary-soft text-primary border-primary' : 'bg-surface border-line text-body hover:bg-subtle'
                }`}
              >
                <input
                  type="radio"
                  name={`difficulty-${gameKey}`}
                  value={v}
                  checked={difficulty === v}
                  onChange={() => chooseDifficulty(v)}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{t(v)}</span>
                <span className="mt-0.5 text-xs opacity-80">{t(`${v}Desc`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={() => setMode('ai')} className="ui-btn w-full min-h-14 px-4 text-lg">
          {t('startAI')}
          <ChevronRight className="w-5 h-5" aria-hidden />
        </button>
      </section>

      <button
        type="button"
        onClick={() => setMode('online')}
        className="ui-card w-full min-h-16 flex items-center gap-3 p-4 text-left hover:bg-subtle transition-colors"
      >
        <span className="w-10 h-10 shrink-0 rounded-xl bg-soft text-body flex items-center justify-center" aria-hidden>
          <Users className="w-5 h-5" />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-fg">{t('vsOnline')}</span>
          <span className="block text-xs text-muted">{t('vsOnlineDesc')}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-faint" aria-hidden />
      </button>

      {rules && rules.length > 0 && (
        <section className="bg-subtle rounded-2xl p-5" aria-labelledby="board-game-rules">
          <h2 id="board-game-rules" className="text-sm font-semibold text-fg mb-2">{t('quickRules')}</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-sub">
            {rules.map(rule => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
      )}

      <div className="text-center">
        <Link href="/games" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-primary transition-colors">
          {t('moreGames')}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
