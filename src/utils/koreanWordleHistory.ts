import { dailyAnswer, statusOf, shareGrid, shareText, type DailyRecords } from './koreanWordle.ts'
import { wordleDate } from './koreanWordleStorage.ts'

export const WORDLE_HISTORY_LIMIT = 30
export interface WordleHistoryRow { day: number; date: string; status: 'playing' | 'won' | 'lost'; attempts: number; hard: boolean; grid: string | null; text: string | null }

/** Display projection only: never persist this list or use it as the statistics input. */
export function projectRecentWordleDays(records: DailyRecords, today: number, options: { title: string; contrast: boolean; url: string }): WordleHistoryRow[] {
  let url = ''
  try { const candidate = new URL(options.url); if (candidate.protocol === 'https:' || candidate.protocol === 'http:') url = candidate.origin + '/korean-wordle/' } catch { /* An invalid optional link does not prevent grid sharing. */ }
  return Object.keys(records).map(Number).filter(day => day <= today && wordleDate(day) !== null).sort((a, b) => b - a).slice(0, WORDLE_HISTORY_LIMIT).map(day => {
    const record = records[day], answer = dailyAnswer(day), status = statusOf(record.guesses, answer), date = wordleDate(day)!
    return { day, date, status, attempts: record.guesses.length, hard: !!record.hard,
      grid: status === 'playing' ? null : shareGrid(record.guesses, answer, options.contrast),
      text: status === 'playing' ? null : `${date}\n${shareText(options.title, day, record.guesses, answer, { hard: !!record.hard, contrast: options.contrast, url })}` }
  })
}
