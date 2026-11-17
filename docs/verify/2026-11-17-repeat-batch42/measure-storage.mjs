// Synthetic past dates only. This does not access browser storage or public scores.
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
import { dailyAnswer, VALID, computeStats, dayNumber } from '../../../src/utils/koreanWordle.ts'

const today = dayNumber(Date.UTC(2026, 10, 17)), words = [...VALID[2]], rows = []
for (const count of [1, 321, 10_000, 80_000, 80_001]) {
  const records = {}
  for (let i = 0; i < count; i++) {
    const day = today - i, wrong = words.find(word => word !== dailyAnswer(day))
    records[day] = { guesses: Array(6).fill(wrong), hard: false }
  }
  const raw = JSON.stringify(records), start = performance.now(), parsed = JSON.parse(raw), parseMs = performance.now() - start
  const statsStart = performance.now(), stats = computeStats(parsed, today)
  rows.push({ days: count, utf16: raw.length, utf8Bytes: Buffer.byteLength(raw), jsonParseMs: +parseMs.toFixed(2), statsMs: +(performance.now() - statsStart).toFixed(2), played: stats.played })
  if (count === 80_000) rows.push({ days: count, representation: 'same valid records with escaped Hangul', utf8Bytes: Buffer.byteLength(raw.replace(/[가-힣]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))) })
}
const result = { synthetic: true, date: '2026-11-17', proposedRawBytes: 8 * 1024 * 1024, proposedDays: 80_000, rows,
  note: 'Protection budgets, not legacy maxima. Valid alternate whitespace/escapes can exceed 8MiB; exceeding data must be preserved without partial statistics or writes. Node timing is not browser performance.' }
fs.writeFileSync(new URL('./storage-measurements.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
